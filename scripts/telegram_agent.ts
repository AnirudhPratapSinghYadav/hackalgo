import 'dotenv/config'

import algosdk from 'algosdk'
import TelegramBot from 'node-telegram-bot-api'
import { GoogleGenerativeAI } from '@google/generative-ai'

/**
 * AlgoVault — Agentic AI Telegram Bot (Phase 3)
 *
 * What this script does:
 * - Listens for Telegram messages
 * - Asks Gemini to classify the message as emergency vs non-emergency
 * - If Gemini returns "[RELEASE]", it automatically:
 *   1) constructs an ARC-4 app call to `agentic_release()`
 *   2) signs with AGENT_MNEMONIC from env
 *   3) submits to Algorand TestNet
 *   4) replies with the TxID + Lora explorer link
 *
 * Safety:
 * - Only triggers release if Gemini outputs the exact tag "[RELEASE]"
 * - Robust error handling; bot stays alive on failures
 */

function requiredEnv(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing ${name} in environment`)
  return v
}

function getEnvNumber(name: string, fallback?: number): number {
  const v = process.env[name]
  if (!v) {
    if (typeof fallback === 'number') return fallback
    throw new Error(`Missing ${name} in environment`)
  }
  const n = Number(v)
  if (!Number.isFinite(n) || n <= 0) throw new Error(`Invalid ${name}: ${v}`)
  return n
}

function getLoraTxUrl(txId: string): string {
  // Keep this script deterministic for demo: always TestNet.
  return `https://lora.algokit.io/testnet/transaction/${txId}`
}

function buildGeminiPrompt(userMessage: string): string {
  return [
    'SYSTEM CONSTRAINT (STRICT):',
    "You are AlgoVault's Guardian AI. You have live internet access.",
    'Always search the web to verify if a reported disaster or weather event is currently happening in reality before deciding to output [RELEASE] or [DENY].',
    'If you cannot verify with a credible source, output [DENY].',
    'If it represents a valid disaster emergency (e.g., severe floods), output exactly:',
    '[RELEASE] <one sentence justification>',
    'If not, output exactly:',
    '[DENY] <one sentence reason>',
    '',
    'MESSAGE:',
    userMessage,
  ].join('\n')
}

async function callGeminiDecision(geminiKey: string, userMessage: string): Promise<string> {
  const genAI = new GoogleGenerativeAI(geminiKey)
  // Inject Google Search tool (grounding) for live verification.
  // NOTE: Typed support may vary by SDK version; keep this additive and safe.
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash', tools: [{ googleSearch: {} }] } as any)
  const res = await model.generateContent(buildGeminiPrompt(userMessage))
  const text = res.response.text()
  return String(text ?? '').trim()
}

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
  // Flat fee for app call + inner ASA transfer
  sp.flatFee = true
  sp.fee = 4000

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

async function main() {
  const TELEGRAM_BOT_TOKEN = requiredEnv('TELEGRAM_BOT_TOKEN')
  const GEMINI_API_KEY = requiredEnv('GEMINI_API_KEY')
  const AGENT_MNEMONIC = requiredEnv('AGENT_MNEMONIC')
  const APP_ID = getEnvNumber('APP_ID')

  // Algod config (defaults to AlgoNode TestNet)
  const ALGOD_SERVER = process.env.ALGOD_SERVER ?? 'https://testnet-api.algonode.cloud'
  const ALGOD_PORT = Number(process.env.ALGOD_PORT ?? 443)
  const ALGOD_TOKEN = process.env.ALGOD_TOKEN ?? ''

  const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true })

  console.log('[telegram-agent] started')
  console.log('[telegram-agent] APP_ID:', APP_ID)
  console.log('[telegram-agent] Algod:', ALGOD_SERVER, ALGOD_PORT)

  bot.on('message', async (msg) => {
    const chatId = msg.chat.id
    const text = (msg.text ?? '').trim()
    if (!text) return

    // UX feedback: show "typing" / status messages
    try {
      await bot.sendChatAction(chatId, 'typing')
      await bot.sendMessage(chatId, 'Analyzing…')
    } catch {
      // ignore
    }

    let decision = ''
    try {
      decision = await callGeminiDecision(GEMINI_API_KEY, text)
    } catch (e: any) {
      const err = String(e?.message ?? e)
      await bot.sendMessage(chatId, `Gemini error: ${err}`)
      return
    }

    const normalized = decision.replace(/\r/g, '').trim()
    const tag = normalized.startsWith('[RELEASE]') ? '[RELEASE]' : normalized.startsWith('[DENY]') ? '[DENY]' : 'UNKNOWN'

    if (tag === '[DENY]') {
      await bot.sendMessage(chatId, normalized)
      return
    }

    if (tag !== '[RELEASE]') {
      await bot.sendMessage(chatId, `Unexpected Gemini output. Expected [RELEASE] or [DENY].\n\nRaw:\n${normalized}`)
      return
    }

    // Autonomous on-chain execution
    try {
      await bot.sendChatAction(chatId, 'typing')
      await bot.sendMessage(chatId, 'Emergency verified. Executing on-chain release…')

      const { txId } = await sendAgenticReleaseTx({
        appId: APP_ID,
        agentMnemonic: AGENT_MNEMONIC,
        algodServer: ALGOD_SERVER,
        algodPort: Number.isFinite(ALGOD_PORT) ? ALGOD_PORT : 443,
        algodToken: ALGOD_TOKEN,
      })

      await bot.sendMessage(
        chatId,
        `✅ Emergency verified. Funds released.\nTxID: ${txId}\nLora: ${getLoraTxUrl(txId)}`,
      )
    } catch (e: any) {
      const err = String(e?.message ?? e)
      await bot.sendMessage(chatId, `Release failed: ${err}`)
    }
  })
}

main().catch((e) => {
  console.error('[telegram-agent] fatal:', e)
  process.exit(1)
})

