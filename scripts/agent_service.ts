/**
 * AlgoVault Omnichannel Guardian Agent (Telegram + WhatsApp/Twilio)
 * ----------------------------------------------------------------
 * This script is intentionally "judge-readable":
 * - One shared AI engine (`processEmergency`) used by both channels
 * - Flat-string prompt (prevents Gemini payload schema errors)
 * - Human-readable error shield (never leak raw chain logs to users)
 * - ARC-4 ABI selector encoding for `agentic_release`
 */

// Must be set before Telegram library loads (polling stability)
process.env.NTBA_FIX_319 = '1'

import 'dotenv/config'

import algosdk from 'algosdk'
import express from 'express'
import { GoogleGenerativeAI } from '@google/generative-ai'
import twilio from 'twilio'
import { EventEmitter } from 'events'

type TelegramBotType = any

const AGENT_VERSION = '2026-04-15-onboarding-v1'

// In-memory user sessions (Telegram chatId or WhatsApp phone number)
const chatSessions = new Map<string, { modelName: string; chat: any }>()

// Telegram polling hardening (prevents noisy error loops on flaky DNS)
let telegramRestartTimer: NodeJS.Timeout | null = null
let telegramBackoffMs = 2_000

type Intent =
  | 'greeting'
  | 'crisis_inquiry'
  | 'donation_intent'
  | 'transparency_inquiry'
  | 'impact_inquiry'
  | 'platform_inquiry'
  | 'unknown'

type UserMemory = {
  lastIntent?: Intent
  lastCrisis?: { query: string; ts: number }
  lastDonationTopic?: { label: string; ts: number }
  lastProofTopic?: { label: string; ts: number }
  lastVault?: { appId: number; ts: number }
  preferredLanguage?: 'en' | 'hi'
  updatedAt: number
}

const userMemory = new Map<string, UserMemory>()
const MEMORY_TTL_MS = 20 * 60 * 1000

function nowTs() {
  return Date.now()
}

function getMemory(userId: string): UserMemory {
  const cur = userMemory.get(userId)
  const ts = nowTs()
  if (!cur) {
    const fresh: UserMemory = { updatedAt: ts }
    userMemory.set(userId, fresh)
    return fresh
  }
  if (ts - cur.updatedAt > MEMORY_TTL_MS) {
    const fresh: UserMemory = { updatedAt: ts }
    userMemory.set(userId, fresh)
    return fresh
  }
  cur.updatedAt = ts
  return cur
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (!a) return b.length
  if (!b) return a.length
  const dp = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0))
  for (let i = 0; i <= a.length; i++) dp[i][0] = i
  for (let j = 0; j <= b.length; j++) dp[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      )
    }
  }
  return dp[a.length][b.length]
}

function normalizeText(raw: string): { clean: string; hint?: string } {
  const original = String(raw ?? '').trim()
  const lower = original.toLowerCase()
  const basic = lower
    .replace(/[’'`]/g, "'")
    .replace(/[^a-z0-9\s/%\[\]\-_.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  // Common typo map (fast path)
  const typoMap: Record<string, string> = {
    flod: 'flood',
    floood: 'flood',
    donte: 'donate',
    dnoate: 'donate',
    vualt: 'vault',
    vauit: 'vault',
    algovaut: 'algovault',
    trasnparency: 'transparency',
    trasparency: 'transparency',
    verifiction: 'verification',
    verifcation: 'verification',
    eathquake: 'earthquake',
    erthquake: 'earthquake',
  }

  const words = basic.split(' ').filter(Boolean)
  let changed = false
  const corrected = words.map((w) => {
    if (typoMap[w]) { changed = true; return typoMap[w] }
    return w
  })

  // Lightweight fuzzy correction for a few high-signal keywords
  const keywords = ['flood', 'earthquake', 'cyclone', 'war', 'donate', 'fund', 'proof', 'verify', 'transparency', 'impact', 'vault']
  const fuzzy = corrected.map((w) => {
    if (w.length < 4) return w
    let best: { k: string; d: number } | null = null
    for (const k of keywords) {
      const d = levenshtein(w, k)
      if (d <= 1 && (!best || d < best.d)) best = { k, d }
    }
    if (best && best.k !== w) {
      changed = true
      return best.k
    }
    return w
  })

  const clean = fuzzy.join(' ').trim()
  return changed
    ? { clean, hint: `I interpreted your message as: "${clean}". If that’s not what you meant, tell me and I’ll adjust.` }
    : { clean }
}

function classifyIntent(clean: string): Intent {
  const t = clean.toLowerCase()
  const hasAny = (arr: string[]) => arr.some((w) => t.includes(w))
  const isShortGreeting =
    ['hi', 'hello', 'hey', 'yo', 'gm', 'good morning', 'good evening', 'good afternoon'].includes(t) ||
    /^hi\b|^hello\b|^hey\b/.test(t)
  const isCasual = hasAny(['how are you', "what's up", 'hru', 'thanks', 'thank you', 'ok', 'cool'])
  if (isShortGreeting || isCasual) return 'greeting'

  if (hasAny(['donate', 'donation', 'fund', 'contribute', 'help', 'can i help', 'support'])) return 'donation_intent'
  if (hasAny(['proof', 'verify', 'verification', 'tx', 'hash', 'lora', 'explorer', 'audit', 'transparent', 'transparency', 'where funds go'])) {
    return 'transparency_inquiry'
  }
  if (hasAny(['impact', 'who gets helped', 'what will donation do', 'how does this help', 'outcome'])) return 'impact_inquiry'
  if (hasAny(['how does', 'what is', 'platform', 'algovault', 'works', 'what do you do'])) return 'platform_inquiry'

  if (hasAny([
    'flood', 'earthquake', 'cyclone', 'storm', 'landslide', 'fire', 'war', 'conflict', 'attack',
    'disaster', 'crisis', 'news', 'updates', 'situation',
    'rain', 'rainfall', 'heavy rain', 'weather', 'heatwave',
  ])) {
    return 'crisis_inquiry'
  }

  // If the user only sends a location (e.g., "hyderabad"), treat it as a crisis inquiry kickoff.
  // This prevents the bot from feeling "dumb" for layman users.
  const looksLikeLocationOnly =
    /^[a-z\s]{3,40}$/i.test(t) &&
    !hasAny(['donate', 'fund', 'proof', 'verify', 'impact', 'vault', 'status', 'help', 'start'])
  if (looksLikeLocationOnly) return 'crisis_inquiry'

  return 'unknown'
}

function formatLanguagePrompt(): string {
  return [
    'Hi — I’m the AlgoVault Guardian.',
    `Version: ${AGENT_VERSION}`,
    '',
    'Choose your language (reply with 1 or 2):',
    '1) English',
    '2) Hindi (हिन्दी)',
    '',
    'After you pick, I’ll show a simple menu with commands.',
    '',
    'Tip: You can ask in plain words too (example: “flood in Hyderabad?”, “heavy rain in Delhi?”).',
  ].join('\n')
}

function pickLanguageFromMessage(clean: string): 'en' | 'hi' | null {
  const t = clean.trim().toLowerCase()
  if (t === '1' || t === 'en' || t === 'eng' || t.includes('english')) return 'en'
  if (t === '2' || t === 'hi' || t.includes('hindi') || t.includes('हिंदी') || t.includes('हिन्दी')) return 'hi'
  return null
}

function langLabel(l: 'en' | 'hi') {
  return l === 'hi' ? 'Hindi (हिन्दी)' : 'English'
}

let geminiModelCandidates: string[] = []

async function initGeminiModelCandidates(geminiKey: string) {
  // Pull available models for THIS key so fallback list is always accurate.
  // STRICT: only use models returned by ListModels for this key.
  // Ordering: Pro models first, then Flash, then others.

  try {
    const url = `https://generativelanguage.googleapis.com/v1/models?key=${encodeURIComponent(geminiKey)}`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`ListModels failed: ${res.status}`)
    const json: any = await res.json()
    const models: Array<{ name?: string; supportedGenerationMethods?: string[] }> = Array.isArray(json?.models)
      ? json.models
      : []
    const available = models
      .filter((m) => Array.isArray(m?.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
      .map((m) => String(m?.name ?? '').replace(/^models\//, '').trim())
      .filter(Boolean)

    const score = (m: string) => {
      const s = m.toLowerCase()
      const isGemini = s.startsWith('gemini-') ? 0 : 1
      const isPro = s.includes('-pro') ? 0 : 1
      const isFlash = s.includes('flash') ? 0 : 1
      // Prefer newer series first when available (3.5 > 3.1 > 2.5 > 2.0 > 1.5)
      const series =
        s.includes('3.5') ? 0 :
        s.includes('3.1') ? 1 :
        s.includes('2.5') ? 2 :
        s.includes('2.0') ? 3 :
        s.includes('1.5') ? 4 : 5
      // Within same bucket, keep stable names before preview/experimental
      const isPreview = (s.includes('preview') || s.includes('exp') || s.includes('experimental')) ? 1 : 0
      return [isGemini, isPro, isFlash, series, isPreview, s]
    }

    const ordered = [...available].sort((a, b) => {
      const sa = score(a)
      const sb = score(b)
      for (let i = 0; i < sa.length; i++) {
        if (sa[i] < sb[i]) return -1
        if (sa[i] > sb[i]) return 1
      }
      return 0
    })

    geminiModelCandidates = ordered
    return
  } catch {
    // If ListModels fails, keep existing candidates (if any).
    // Otherwise leave empty; the caller will handle a safe denial.
    if (!Array.isArray(geminiModelCandidates) || geminiModelCandidates.length === 0) {
      geminiModelCandidates = []
    }
  }
}

function shouldRetryGemini(err: unknown): boolean {
  const msg = String((err as any)?.message ?? err).toLowerCase()
  return (
    msg.includes('404') ||
    msg.includes('not found') ||
    msg.includes('429') ||
    msg.includes('too many requests') ||
    msg.includes('503') ||
    msg.includes('unavailable') ||
    msg.includes('not supported')
  )
}

async function sendToGeminiWithFallback(params: {
  userId: string
  clean: string
  geminiKey: string
  preferredLanguage?: 'en' | 'hi'
}): Promise<string> {
  const { userId, clean, geminiKey, preferredLanguage } = params
  const genAI = new GoogleGenerativeAI(geminiKey)

  const systemInstruction = `You are the AlgoVault Guardian AI.
1. LANGUAGE: Reply in ${preferredLanguage === 'hi' ? 'Hindi' : 'English'} only. Do NOT switch languages. However, your system tags like [DENY] or [RELEASE: X%] MUST remain in English for backend parsing.
2. SEVERITY ASSESSMENT: When an emergency is reported, assess its severity based on live Google Search data.
   - Level 1 (Minor/Localized): E.g., minor waterlogging, broken roof.
   - Level 2 (Severe/Regional): E.g., widespread flood, severe earthquake.
3. RESPONSE FORMAT:
   - IF VERIFIED REAL: Output exactly "[RELEASE: X%]" on the first line, where X is 15 for Level 1, and 100 for Level 2. Then, in the user's language, summarize the event, provide a source link, and instruct them to click the secure transaction link.
   - IF FALSE: Output exactly "[DENY]" on the first line. Explain why in the user's language and provide a source link proving conditions are normal.`

  const candidates = geminiModelCandidates.length > 0 ? geminiModelCandidates : []
  if (candidates.length === 0) {
    throw new Error('No Gemini models available for this API key (ListModels unavailable or returned none).')
  }

  let lastErr: unknown = null
  for (const modelName of candidates) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        tools: [{ googleSearch: {} }],
        systemInstruction,
      } as any)

      const existing = chatSessions.get(userId)
      if (!existing || existing.modelName !== modelName) {
        const chat = model.startChat({ history: [] } as any)
        chatSessions.set(userId, { modelName, chat })
      }

      const session = chatSessions.get(userId)!
      const result = await session.chat.sendMessage(clean)
      const text = String(result?.response?.text?.() ?? result?.response?.text ?? '').trim()
      if (!text) throw new Error('Empty Gemini response')
      return text
    } catch (e) {
      lastErr = e
      // If this model is flaky/not available for the key, rotate.
      if (shouldRetryGemini(e)) {
        chatSessions.delete(userId)
        pushAudit(`[${new Date().toLocaleTimeString()}] ⚠️ ORACLE: Gemini model failed (${modelName}), rotating…`)
        continue
      }
      throw e
    }
  }

  throw lastErr ?? new Error('No Gemini models available')
}

// Simple in-memory audit trail for investor UI
const auditLog: Array<{ ts: number; line: string }> = []
export const oracleEvents = new EventEmitter()
function pushAudit(line: string) {
  auditLog.push({ ts: Date.now(), line })
  if (auditLog.length > 200) auditLog.splice(0, auditLog.length - 200)
  oracleEvents.emit('update', line)
}

function requiredEnv(name: string): string {
  const v = process.env[name]
  if (!v || String(v).trim().length === 0) throw new Error(`Fatal: Missing ${name} in environment`)
  return String(v).trim()
}

function getEnvNumber(name: string, fallback?: number): number {
  const v = process.env[name]
  if (!v || String(v).trim().length === 0) {
    if (typeof fallback === 'number') return fallback
    throw new Error(`Fatal: Missing ${name} in environment`)
  }
  const n = Number(v)
  if (!Number.isFinite(n) || n <= 0) throw new Error(`Fatal: Invalid ${name}: ${v}`)
  return n
}

function loraTxUrl(txId: string): string {
  return `https://lora.algorand.foundation/transaction/${txId}`
}

function looksLikeAlgorandTxId(s: string): boolean {
  const t = String(s ?? '').trim()
  // Algorand TxID is base32-ish, typically 52 chars. We keep this permissive but safe.
  return /^[A-Z2-7]{48,64}$/i.test(t)
}

function extractTxId(raw: string): string | null {
  const t = String(raw ?? '').trim()
  // Prefer an explicit txid-like token if present
  const tokens = t.split(/\s+/g).map((x) => x.replace(/[^A-Za-z0-9]/g, ''))
  for (const tok of tokens) {
    if (looksLikeAlgorandTxId(tok)) return tok.toUpperCase()
  }
  return null
}

function loraAccountUrl(address: string): string {
  return `https://lora.algorand.foundation/account/${address}`
}

function loraAppUrl(appId: number): string {
  return `https://lora.algorand.foundation/application/${appId}`
}

async function getAlgoBalance(deps: { algodClient: algosdk.Algodv2 }, address: string): Promise<number> {
  const info = await deps.algodClient.accountInformation(address).do()
  return Number(info.amount ?? 0) / 1_000_000
}

async function getAppGlobalUInt(params: {
  algodClient: algosdk.Algodv2
  appId: number
  key: string
}): Promise<number | null> {
  const { algodClient, appId, key } = params
  const app = (await algodClient.getApplicationByID(appId).do()) as any
  const kv = app?.params?.['global-state'] ?? []
  const want = Buffer.from(key, 'utf8').toString('base64')
  const entry = kv.find((x: any) => x?.key === want)?.value
  if (!entry) return null
  if (typeof entry.uint === 'number') return Number(entry.uint)
  return null
}

function formatAlgo(n: number): string {
  if (!Number.isFinite(n)) return '—'
  return `${n.toFixed(4)} ALGO`
}

function formatPremiumVaultSheet(params: {
  title: string
  subtitle: string
  urgency: string
  raisedAlgo: number
  totalDepositedAlgo?: number
  totalUsers?: number
  vaultAppId: number
  vaultAddress: string
  agentAddress?: string
  agentBalanceAlgo?: number
}): string {
  const {
    title,
    subtitle,
    urgency,
    raisedAlgo,
    totalDepositedAlgo,
    totalUsers,
    vaultAppId,
    vaultAddress,
    agentAddress,
    agentBalanceAlgo,
  } = params

  const lines: string[] = []
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  lines.push(`🏦  ${title}`)
  lines.push(`    ${subtitle}`)
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  lines.push(`Urgency: ${urgency}`)
  lines.push(`Raised (on-chain): ${formatAlgo(raisedAlgo)}`)
  if (typeof totalDepositedAlgo === 'number' && Number.isFinite(totalDepositedAlgo)) {
    lines.push(`Lifetime deposited (global): ${formatAlgo(totalDepositedAlgo)}`)
  }
  if (typeof totalUsers === 'number' && Number.isFinite(totalUsers)) {
    lines.push(`Contributors (global): ${Math.max(0, Math.floor(totalUsers))}`)
  }
  lines.push('')
  lines.push('🔍 Proof (Algorand / Lora)')
  // Put URLs on their own lines so WhatsApp/Telegram auto-linking never breaks.
  lines.push('Vault App (Lora):')
  lines.push(loraAppUrl(vaultAppId))
  lines.push('Vault Address (Lora):')
  lines.push(loraAccountUrl(vaultAddress))
  lines.push('')
  lines.push('✅ How to contribute (safe)')
  lines.push('- Open the AlgoVault dashboard → Deposit')
  lines.push('- Your wallet signs an atomic group (payment + app call)')
  lines.push('- Funds + state update happen together or not at all')

  if (agentAddress) {
    lines.push('')
    lines.push('🛰️ Guardian service health (optional)')
    lines.push('Agent Address (Lora):')
    lines.push(loraAccountUrl(agentAddress))
    if (typeof agentBalanceAlgo === 'number') lines.push(`- Agent balance: ${formatAlgo(agentBalanceAlgo)}`)
    lines.push('Tip: If the agent is low on fees, use `/fund` to top it up.')
  }

  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  return lines.join('\n')
}

/**
 * Shield: converts raw SDK/chain errors into safe user-facing messages.
 * We only ever return [DENY] on errors (never accidentally [RELEASE]).
 */
function humanizeChainError(err: unknown, params?: { agentAddress?: string; network?: string }): string {
  const msg = String((err as any)?.message ?? err).toLowerCase()
  const agentAddress = String(params?.agentAddress ?? '').trim()
  const network = String(params?.network ?? '').trim().toLowerCase()

  // Gas / fee / overspend style errors
  if (msg.includes('overspend') || msg.includes('fee') || msg.includes('insufficient') || msg.includes('below min')) {
    // Strict directive: show agent address + dispenser link.
    const dispenser = network === 'mainnet' ? '' : 'https://bank.testnet.algorand.network/'
    return `🚨 [DENY] Network Error: My wallet lacks the 0.001 ALGO gas fee to execute the smart contract.\n\nAgent Address:\n${agentAddress || '(unknown)'}\n\nFund me here: ${dispenser || '(no dispenser on mainnet)'}`
  }

  // Empty vault / balance conditions (best-effort match)
  if (msg.includes('balance') || msg.includes('amount') || msg.includes('empty')) {
    return '🚨 [DENY] Vault Error: The smart contract vault is currently empty.'
  }

  return '🚨 [DENY] Transaction failed due to a network logic error.'
}

/**
 * ARC-4 / ABI method selector encoding for `agentic_release()`.
 * We call an app NoOp with the method selector as the first app arg.
 */
async function sendAgenticReleaseTx(params: {
  appId: number
  agentMnemonic: string
  algodServer: string
  algodPort: number
  algodToken: string
}): Promise<{ txId: string }> {
  const { appId, agentMnemonic, algodServer, algodPort, algodToken } = params

  const agent = algosdk.mnemonicToSecretKey(agentMnemonic)
  const algod = new algosdk.Algodv2(algodToken, algodServer, algodPort)

  const sp = await algod.getTransactionParams().do()

  const selector = new algosdk.ABIMethod({
    name: 'agentic_release',
    args: [],
    returns: { type: 'void' },
  }).getSelector()

  const txn = algosdk.makeApplicationNoOpTxnFromObject({
    from: agent.addr,
    appIndex: appId,
    appArgs: [selector],
    suggestedParams: sp,
  })

  const signed = txn.signTxn(agent.sk)
  const { txId } = await algod.sendRawTransaction(signed).do()
  await algosdk.waitForConfirmation(algod, txId, 4)
  return { txId }
}

function formatAgentMenu(): string {
  return [
    'Welcome to AlgoVault. I’m your premium AI humanitarian intelligence advisor — I verify real-world crises and provide blockchain-native transparency.',
    '',
    '📱 **Available Commands:**',
    '🔹 `/status` - Check your vault balance.',
    '🔹 `/fund` - Deposit ALGO safely.',
    '🔹 `/active` - Top live crisis briefs.',
    '🔹 `/vaults` - Active vault options.',
    '🔹 `/impact` - What donations do.',
    '🔹 `/proof` - How to verify on-chain.',
    '🔹 `/history` - Your recent activity.',
    '🔹 `/language` - Choose language.',
    '',
    'Tell me your location (city + country) or the crisis you’re worried about, and I’ll verify it with sources.',
  ].join('\n')
}

function buildAlgorandPayUri(address: string, amountMicroAlgos: number, note?: string): string {
  // ARC-26 URI scheme (amount is integer microAlgos)
  const q = new URLSearchParams()
  q.set('amount', String(Math.max(0, Math.floor(amountMicroAlgos))))
  if (note && note.trim().length > 0) q.set('note', note.trim())
  return `algorand://${address}?${q.toString()}`
}

/**
 * Core AI Engine (shared by Telegram + WhatsApp)
 * - In-memory chat history via `model.startChat()`
 * - If AI outputs [RELEASE], we attempt on-chain `agentic_release`
 */
async function processEmergency(userId: string, message: string, deps: {
  geminiKey: string
  appId: number
  agentMnemonic: string
  agentAddress?: string
  network?: string
  algodClient: algosdk.Algodv2
  algodServer: string
  algodPort: number
  algodToken: string
}): Promise<string> {
  const parsed = normalizeText(message ?? '')
  const clean = parsed.clean
  if (!clean) return 'I didn’t catch a message — try sending a city/country or the crisis you want me to verify.'

  const mem = getMemory(userId)

  // Command routing (shared across Telegram + WhatsApp)
  const cmd = clean.toLowerCase()
  if (cmd === '/version') {
    return `AlgoVault Guardian\nVersion: ${AGENT_VERSION}`
  }
  if (cmd === '/start' || cmd === '/language') {
    return formatLanguagePrompt()
  }

  const picked = pickLanguageFromMessage(clean)
  if (picked) {
    mem.preferredLanguage = picked
    mem.lastIntent = 'platform_inquiry'
    return [`✅ Language set to: ${langLabel(picked)}`, '', formatAgentMenu()].join('\n')
  }

  if (cmd === '/help' || cmd === '/about' || cmd === 'help') {
    mem.lastIntent = 'platform_inquiry'
    if (!mem.preferredLanguage) return formatLanguagePrompt()
    return formatAgentMenu()
  }
  if (cmd === '/proof') {
    mem.lastIntent = 'transparency_inquiry'
    if (!mem.preferredLanguage) return formatLanguagePrompt()
    mem.lastProofTopic = { label: 'On-chain verification', ts: nowTs() }
    const appAddr = algosdk.getApplicationAddress(deps.appId)
    return [
      '🔎 **Blockchain Trust Layer (Algorand)**',
      '',
      'Every contribution and smart contract action is recorded transparently on **Algorand** and can be independently audited.',
      '',
      `- App (Vault) ID: ${deps.appId}`,
      `- App on Lora: ${loraAppUrl(deps.appId)}`,
      `- App address (holds funds): ${appAddr}`,
      `- App address on Lora: ${loraAccountUrl(appAddr)}`,
      '',
      'If you share a **TxID**, I can explain exactly what happened and what it means.',
    ].join('\n')
  }
  if (cmd === '/active') {
    mem.lastIntent = 'crisis_inquiry'
    if (!mem.preferredLanguage) return formatLanguagePrompt()
    return [
      '🛰️ **Active Crisis Briefs**',
      '',
      'I can generate a verified brief for any location you name (e.g., “flood in Hyderabad”, “earthquake in Japan”).',
      'Tell me the city/region and I’ll return sources + confidence.',
    ].join('\n')
  }
  if (cmd === '/vaults') {
    mem.lastIntent = 'platform_inquiry'
    if (!mem.preferredLanguage) return formatLanguagePrompt()
    return [
      '🏦 **Vaults**',
      '',
      '- **Personal Savings Vault**: discipline + milestone badges',
      '- **Guardian Vault**: emergency-focused, AI-verified release flow',
      '- **Community Reserve**: pooled humanitarian reserve',
      '',
      'Tell me what you’re trying to do (save, protect, or contribute), and I’ll recommend the best vault.',
    ].join('\n')
  }
  if (cmd === '/impact') {
    mem.lastIntent = 'impact_inquiry'
    if (!mem.preferredLanguage) return formatLanguagePrompt()
    return [
      '🌱 **Impact**',
      '',
      'Donations matter most when they are:',
      '- **Fast** (minutes, not weeks)',
      '- **Verified** (sources + oracle)',
      '- **Transparent** (on-chain, auditable)',
      '',
      'Tell me what crisis you care about (or say “help”), and I’ll suggest a safe next step.',
    ].join('\n')
  }
  if (cmd === '/history') {
    mem.lastIntent = 'transparency_inquiry'
    if (!mem.preferredLanguage) return formatLanguagePrompt()
    return [
      '🧾 **Your History**',
      '',
      'I don’t store personal data permanently. If you share your wallet address or a TxID, I can help interpret it on Lora.',
      'Tip: open the dashboard transaction list and paste any TxID here.',
    ].join('\n')
  }
  if (cmd === '/fund' || cmd.includes('fund')) {
    mem.lastIntent = 'donation_intent'
    if (!mem.preferredLanguage) return formatLanguagePrompt()
    const addr = String(deps.agentAddress ?? '').trim()
    const link = addr ? buildAlgorandPayUri(addr, 200_000, 'AlgoVault Guardian gas') : '(agent address unavailable)'
    return [
      'Thank you. To keep the Guardian service healthy, it needs a tiny amount of ALGO for network fees (think of it like digital postage).',
      '',
      `Agent Address: ${addr || '(unknown)'}`,
      `Tap to fund: ${link}`,
      '',
      'Or use the testnet dispenser: https://bank.testnet.algorand.network/',
    ].join('\n')
  }
  if (cmd === '/status' || cmd.includes('status')) {
    mem.lastIntent = 'platform_inquiry'
    if (!mem.preferredLanguage) return formatLanguagePrompt()
    try {
      const appAddr = algosdk.getApplicationAddress(deps.appId)
      const info = await deps.algodClient.accountInformation(appAddr).do()
      const balAlgo = Number(info.amount ?? 0) / 1_000_000
      mem.lastVault = { appId: deps.appId, ts: nowTs() }
      return [
        '✅ **Vault Status**',
        '',
        `Vault App ID: ${deps.appId}`,
        `Balance (on-chain): ${balAlgo.toFixed(6)} ALGO`,
        '',
        `View on Lora: ${loraAppUrl(deps.appId)}`,
      ].join('\n')
    } catch {
      return 'Vault status unavailable right now.'
    }
  }

  // If language is not set yet, keep the experience simple.
  if (!mem.preferredLanguage) {
    return formatLanguagePrompt()
  }

  // Universal intent understanding layer (pre-Gemini)
  const intent = classifyIntent(clean)
  mem.lastIntent = intent

  // Small-talk / humanization engine
  if (intent === 'greeting') {
    const t = clean.toLowerCase()
    if (t.includes('who made') || t.includes('who built') || t.includes('creator')) {
      return [
        'I’m powered by AlgoVault’s AI crisis intelligence infrastructure and blockchain oracle verification system.',
        '',
        'If you tell me a city/region, I can verify the current situation with sources and explain what to do next.',
      ].join('\n')
    }
    if (t.includes('thank')) {
      return [
        "You're welcome. I’m here whenever you need verified crisis intelligence or on-chain transparency.",
        '',
        'If you want, tell me your location and I’ll start with a quick situation check.',
      ].join('\n')
    }
    if (t.includes('how are you') || t === 'hru') {
      return [
        "Doing well — I’m actively monitoring humanitarian and crisis intelligence feeds worldwide.",
        'How can I assist you today?',
        '',
        'Examples: “flood in India?”, “show proof”, “can I help?”',
      ].join('\n')
    }
    return [
      'Hi — glad you’re here.',
      'Tell me a location or crisis you’re concerned about, and I’ll verify it with sources + confidence.',
    ].join('\n')
  }

  if (intent === 'platform_inquiry') {
    return [
      'AlgoVault is an AI-powered humanitarian intelligence layer with blockchain-native transparency.',
      '',
      '- **AI Oracle**: verifies crisis claims with live sources',
      '- **Algorand**: records actions transparently for independent audit',
      '- **Safety-first**: no blind releases; decisions are explainable and verifiable',
      '',
      'Tell me what you want: crisis verification, transparency/proof, or funding guidance.',
    ].join('\n')
  }

  if (intent === 'transparency_inquiry') {
    mem.lastProofTopic = { label: clean, ts: nowTs() }
    return [
      'Absolutely — transparency is the core promise here.',
      '',
      'Every contribution and contract action is recorded on **Algorand** and can be verified on **Lora Explorer**.',
      '',
      'Send me one of these and I’ll explain it clearly:',
      '- A **TxID** (transaction hash), or',
      '- Your **wallet address**, or',
      '- Say `/proof` for the verification links.',
    ].join('\n')
  }

  if (intent === 'impact_inquiry') {
    const crisis = mem.lastCrisis?.query
    return [
      'Impact should be specific, measurable, and verifiable.',
      '',
      crisis ? `Based on our last topic (**${crisis}**), I can recommend a safe next step.` : 'Tell me the crisis/location you care about.',
      '',
      'If you want, say “can I help?” and I’ll guide you without pressure.',
    ].join('\n')
  }

  if (intent === 'donation_intent') {
    // Donation conversion system (no pressure; explain WHY first)
    const appAddr = algosdk.getApplicationAddress(deps.appId)
    let raised = 0
    let agentBal: number | undefined = undefined
    let totalDepositedAlgo: number | undefined = undefined
    let totalUsers: number | undefined = undefined
    try {
      raised = await getAlgoBalance(deps, appAddr)
    } catch {
      raised = 0
    }
    try {
      const a = String(deps.agentAddress ?? '').trim()
      if (a) agentBal = await getAlgoBalance(deps, a)
    } catch {
      agentBal = undefined
    }
    try {
      const totalDepositedMicro = await getAppGlobalUInt({ algodClient: deps.algodClient, appId: deps.appId, key: 'total_deposited' })
      if (typeof totalDepositedMicro === 'number') totalDepositedAlgo = totalDepositedMicro / 1_000_000
      const tu = await getAppGlobalUInt({ algodClient: deps.algodClient, appId: deps.appId, key: 'total_users' })
      if (typeof tu === 'number') totalUsers = tu
    } catch {
      totalDepositedAlgo = undefined
      totalUsers = undefined
    }

    const crisis = mem.lastCrisis?.query ?? 'Humanitarian Relief'
    mem.lastDonationTopic = { label: crisis, ts: nowTs() }
    mem.lastVault = { appId: deps.appId, ts: nowTs() }

    const urgency = mem.lastCrisis?.query ? 'MEDIUM (verification available)' : 'CONTEXT-DEPENDENT (tell me location)'

    const sheet = formatPremiumVaultSheet({
      title: `${crisis} Vault`,
      subtitle: 'AI-verified humanitarian reserve with on-chain auditability',
      urgency,
      raisedAlgo: raised,
      totalDepositedAlgo,
      totalUsers,
      vaultAppId: deps.appId,
      vaultAddress: appAddr,
      agentAddress: String(deps.agentAddress ?? '').trim() || undefined,
      agentBalanceAlgo: agentBal,
    })

    return [
      'Thank you — generosity matters most when it’s **fast, verified, and transparent**.',
      '',
      'Before you donate, I’ll keep it premium and clear: what this is, how to verify it, and the safest way to contribute.',
      '',
      sheet,
      '',
      'After you contribute, paste the **TxID** here and I’ll generate a clean verification receipt (Lora link + what the transaction did).',
      '',
      mem.lastCrisis?.query
        ? 'If you want, I can verify the latest sources for this crisis and return a structured brief + confidence.'
        : 'Tell me the city/region you want to support, and I’ll verify the situation first (sources + confidence).',
    ].join('\n')
  }

  // Smart fallback (unknown/ambiguous input)
  if (intent === 'unknown') {
    const hint = parsed.hint ? `\n\n${parsed.hint}` : ''
    return [
      'I’m not fully certain what you mean yet, but I can help with:',
      '- verified crisis intelligence',
      '- vault funding guidance',
      '- transparency / proof (Lora verification)',
      '- impact explanations',
      '',
      'Could you clarify what you’d like assistance with? Example: “flood in Chennai”, “show proof”, “can I help?”',
    ].join('\n') + hint
  }

  // TxID verification micro-flow (works in any context; no Gemini)
  const maybeTxId = extractTxId(clean)
  if (maybeTxId) {
    mem.lastProofTopic = { label: `TxID ${maybeTxId}`, ts: nowTs() }
    return [
      '🧾 **Verification Receipt (Algorand)**',
      '',
      `TxID: ${maybeTxId}`,
      `Lora proof: ${loraTxUrl(maybeTxId)}`,
      '',
      'What to check on Lora:',
      '- Confirm sender/receiver addresses',
      '- Confirm amount + fee',
      '- Confirm app call (if any) succeeded',
      '',
      'If you tell me what you expected (deposit / withdrawal / release), I’ll explain what this TxID represents in plain English.',
    ].join('\n')
  }

  // Crisis inquiry is the ONLY path that uses Gemini oracle (preserves [DENY]/[RELEASE] parsing below).
  if (intent === 'crisis_inquiry') {
    mem.lastCrisis = { query: clean, ts: nowTs() }
  }

  let aiText = ''
  try {
    const crisisPrompt = [
      'You are a premium humanitarian intelligence oracle for AlgoVault.',
      'First line MUST be exactly either "[DENY]" or "[RELEASE: X%]" where X is 15 or 100.',
      'Then output the following sections in a warm, premium tone (not robotic), concise but informative:',
      '1) 🚨 Situation Header',
      '2) Intelligence Summary (what happened / why it matters / urgency)',
      '3) Verification Layer (Gemini + Google Search Oracle, 2-4 source links, timestamp)',
      '4) Confidence Layer (0-100%)',
      '5) Recommendation Layer (suggested action + suggested vault)',
      '',
      `User message: ${clean}`,
    ].join('\n')

    pushAudit(`[${new Date().toLocaleTimeString()}] 📡 INGRESS(${userId}): ${clean}`)
    aiText = await sendToGeminiWithFallback({
      userId,
      clean: crisisPrompt,
      geminiKey: deps.geminiKey,
      preferredLanguage: mem.preferredLanguage,
    })
  } catch (e) {
    // Do not leak raw Gemini errors to users
    // eslint-disable-next-line no-console
    console.error('[guardian] Gemini error:', e)
    pushAudit(`[${new Date().toLocaleTimeString()}] ❌ ORACLE: Gemini error`)
    return '🚨 [DENY] AI verification is temporarily unavailable. Please try again.'
  }

  const upper = aiText.toUpperCase()
  const releaseMatch = aiText.match(/\[RELEASE:\s*(\d+)%\]/i)
  const wantsRelease = !!releaseMatch || upper.includes('[RELEASE]')

  if (!wantsRelease) {
    // Return the denial reason (or a safe default)
    return aiText && aiText.length > 0 ? aiText : '[DENY] Unverified emergency.'
  }

  // Fractional release parsing (investor pitch layer).
  // NOTE: We do not change on-chain behavior; we only execute `agentic_release()` for 100%.
  const pct = releaseMatch ? Math.max(0, Math.min(100, Number(releaseMatch[1] ?? 0))) : 100
  let vaultBalanceMicro = 0
  try {
    const appAddr = algosdk.getApplicationAddress(deps.appId)
    const info = await deps.algodClient.accountInformation(appAddr).do()
    vaultBalanceMicro = Number(info.amount ?? 0)
  } catch {
    vaultBalanceMicro = 0
  }
  const recommendedMicro = Math.floor((vaultBalanceMicro * pct) / 100)

  // If fractional (<100%), do NOT execute on-chain release (contract currently releases as implemented).
  if (pct > 0 && pct < 100) {
    pushAudit(`[${new Date().toLocaleTimeString()}] ✅ Decision Made: RELEASE ${pct}% (recommended ${recommendedMicro} microAlgos)`)
    return [
      aiText,
      '',
      `Recommended fractional payout: ${(recommendedMicro / 1_000_000).toFixed(6)} ALGO (${pct}%)`,
      'For safety, fractional payouts require a dedicated contract method; this demo provides the recommendation without altering on-chain release logic.',
    ].join('\n')
  }

  // RELEASE path: attempt on-chain execution with Shield.
  try {
    pushAudit(`[${new Date().toLocaleTimeString()}] ⚡ SMART CONTRACT: agentic_release() executing`)
    const { txId } = await sendAgenticReleaseTx({
      appId: deps.appId,
      agentMnemonic: deps.agentMnemonic,
      algodServer: deps.algodServer,
      algodPort: deps.algodPort,
      algodToken: deps.algodToken,
    })
    pushAudit(`[${new Date().toLocaleTimeString()}] ✅ CONFIRMED: ${txId}`)
    pushAudit(`[${new Date().toLocaleTimeString()}] ✅ Decision Made: RELEASE 100%`)
    return `${aiText}\n\n✅ Release executed.\n${loraTxUrl(txId)}`
  } catch (e) {
    pushAudit(`[${new Date().toLocaleTimeString()}] ❌ SMART CONTRACT: failed`)
    return humanizeChainError(e, { agentAddress: deps.agentAddress, network: deps.network })
  }
}

async function main() {
  // Required secrets (fail fast; prevents "silent" bot)
  const TELEGRAM_BOT_TOKEN = requiredEnv('TELEGRAM_BOT_TOKEN')
  const GEMINI_API_KEY = requiredEnv('GEMINI_API_KEY')
  const AGENT_MNEMONIC = requiredEnv('AGENT_MNEMONIC')
  const APP_ID = getEnvNumber('APP_ID')

  // Algod config (defaults to AlgoNode TestNet)
  const ALGOD_SERVER = process.env.ALGOD_SERVER ?? 'https://testnet-api.algonode.cloud'
  const ALGOD_PORT = Number(process.env.ALGOD_PORT ?? 443)
  const ALGOD_TOKEN = process.env.ALGOD_TOKEN ?? ''

  const agentAccount = algosdk.mnemonicToSecretKey(AGENT_MNEMONIC)
  const algodClient = new algosdk.Algodv2(ALGOD_TOKEN, ALGOD_SERVER, ALGOD_PORT)

  await initGeminiModelCandidates(GEMINI_API_KEY)

  const sharedDeps = {
    geminiKey: GEMINI_API_KEY,
    appId: APP_ID,
    agentMnemonic: AGENT_MNEMONIC,
    agentAddress: agentAccount.addr,
    network: process.env.VITE_NETWORK ?? process.env.NETWORK ?? 'testnet',
    algodClient,
    algodServer: ALGOD_SERVER,
    algodPort: ALGOD_PORT,
    algodToken: ALGOD_TOKEN,
  }

  /**
   * WhatsApp (Twilio Webhook via Express)
   * Twilio will POST x-www-form-urlencoded with `Body`
   */
  const app = express()
  // Minimal CORS so the Vite frontend can call localhost:3000 APIs without "Failed to fetch".
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    if ((req.method ?? '').toUpperCase() === 'OPTIONS') {
      res.status(204).send('')
      return
    }
    next()
  })
  app.use(express.urlencoded({ extended: true }))

  app.get('/api/agent-status', async (_req, res) => {
    try {
      const accountInfo = await algodClient.accountInformation(agentAccount.addr).do()
      const balance = Number(accountInfo.amount ?? 0) / 1_000_000
      res.json({ address: agentAccount.addr, balance, status: 'Online' })
    } catch {
      res.status(500).json({ error: 'Failed to fetch agent status' })
    }
  })

  app.get('/api/audit-log', (_req, res) => {
    res.json({ auditLog })
  })

  // SSE live oracle feed (frontend "UI juice")
  app.get('/api/live-oracle', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    const onUpdate = (data: string) => {
      res.write(`data: ${JSON.stringify({ log: data })}\n\n`)
    }

    oracleEvents.on('update', onUpdate)
    req.on('close', () => oracleEvents.off('update', onUpdate))
  })

  app.post('/whatsapp', async (req, res) => {
    const from = String((req as any)?.body?.From ?? '').trim()
    const text = String((req as any)?.body?.Body ?? '').trim()
    const userId = from || 'whatsapp:unknown'
    const aiReply = await processEmergency(userId, text, sharedDeps)

    const twimlRes = new (twilio as any).twiml.MessagingResponse()
    twimlRes.message(aiReply)
    res.type('text/xml').send(twimlRes.toString())
  })

  const port = Number(process.env.PORT ?? 3000)
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`[agent_service] WhatsApp webhook listening on http://localhost:${port}/whatsapp (v=${AGENT_VERSION})`)
  })

  /**
   * Telegram (Polling Bot)
   * We use a dynamic import so NTBA_FIX_319 is set before library initialization.
   */
  const mod: any = await import('node-telegram-bot-api')
  const TelegramBot = (mod?.default ?? mod) as TelegramBotType
  const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true })

  bot.onText(/\/start(?:\s+.*)?$/i, async (msg: any) => {
    const chatId = msg.chat.id
    const userId = String(chatId)
    const reply = await processEmergency(userId, '/start', sharedDeps)
    // Avoid parse_mode so links always work and formatting is consistent with WhatsApp.
    await bot.sendMessage(chatId, reply)
  })

  bot.on('polling_error', (err: any) => {
    // eslint-disable-next-line no-console
    const msg = String(err?.message ?? err)
    console.error('[telegram] polling_error:', msg)
    if (msg.includes('409 Conflict')) {
      // Another instance is polling. Stop this instance to recover cleanly.
      try {
        bot.stopPolling()
      } catch {
        // ignore
      }
      pushAudit(`[${new Date().toLocaleTimeString()}] ❌ TELEGRAM: 409 Conflict (another instance running) — polling stopped`)
    }

    // DNS / connectivity issues (ENOTFOUND, EAI_AGAIN) should not spam forever.
    if (msg.includes('ENOTFOUND') || msg.includes('EAI_AGAIN') || msg.includes('getaddrinfo')) {
      pushAudit(`[${new Date().toLocaleTimeString()}] ⚠️ TELEGRAM: network/DNS issue — backing off`)
      try { bot.stopPolling() } catch { /* ignore */ }
      if (telegramRestartTimer) return
      const wait = telegramBackoffMs
      telegramBackoffMs = Math.min(60_000, Math.floor(telegramBackoffMs * 1.8))
      telegramRestartTimer = setTimeout(async () => {
        telegramRestartTimer = null
        try {
          // Restart polling once network is back
          await (bot as any).startPolling?.()
          telegramBackoffMs = 2_000
          pushAudit(`[${new Date().toLocaleTimeString()}] ✅ TELEGRAM: polling resumed`)
        } catch {
          // will retry on next polling_error
        }
      }, wait)
    }
  })

  bot.on('message', async (msg: any) => {
    const chatId = msg?.chat?.id
    const text = String(msg?.text ?? '').trim()
    if (!chatId || !text) return
    if (text.startsWith('/start')) return

    try {
      const userId = String(chatId)
      await bot.sendChatAction(chatId, 'typing')
      const statusMsg = await bot.sendMessage(chatId, '⏳ Analyzing...')

      const aiReply = await processEmergency(userId, text, sharedDeps)
      // Parity: replace "Analyzing..." with the final response (same text WhatsApp gets)
      const maybePayLink = aiReply.match(/algorand:\/\/[^\s]+/i)?.[0] ?? null
      const opts: any = { chat_id: chatId, message_id: statusMsg.message_id }
      if (maybePayLink) {
        opts.reply_markup = {
          inline_keyboard: [
            [{ text: 'Tap to Pay (Pera / wallet)', url: maybePayLink }],
            [{ text: 'View on Lora', url: 'https://lora.algorand.foundation/' }],
          ],
        }
      }
      await bot.editMessageText(aiReply, opts)
    } catch {
      await bot.sendMessage(chatId, '🚨 [DENY] Internal error. Please try again.')
    }
  })

  // eslint-disable-next-line no-console
  console.log(`[agent_service] Telegram bot started (polling=true) (v=${AGENT_VERSION})`)
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e)
  process.exit(1)
})
