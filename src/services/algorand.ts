import algosdk, { type Algodv2, type SuggestedParams } from 'algosdk'
import { base64ToBytes, decodeAppCallArgs, decodeArc69Note, decodeGlobalStateKv, decodeLocalStateKv, decodeLogs, tryDecodeJsonFromBytes, tryDecodeUtf8 } from '../utils/algorandDecode'
import { getNetworkConfig } from './networkConfig'

export type SignTransactionsFn = (txns: Uint8Array[]) => Promise<(Uint8Array | null)[]>

const APP_ID = Number(import.meta.env.VITE_APP_ID)
const NETWORK = getNetworkConfig().network

/** MicroAlgo flat fees — explicit so grouped txns and inner-txn-heavy calls have enough budget. */
const FEE_OPT_IN = 1000
const FEE_PAY_DEPOSIT = 1000
const FEE_APP_DEPOSIT = 2000
const FEE_APP_STANDARD = 2000
const FEE_APP_WITHDRAW = 5000
const FEE_APP_CLAIM_BADGE = 4000
const FEE_PAY_PACT = 1000
const FEE_APP_PACT = 2000

let loggedVaultConfig = false
let loggedMilestones = false

// Performance: avoid repeated algod/indexer round-trips on first paint.
// These caches are in-memory only (safe for Vercel/static hosting) and never “invent” data.
const ACCOUNT_INFO_TTL_MS = 10_000
const APP_INFO_TTL_MS = 10_000
const accountInfoCache = new Map<string, { ts: number; promise: Promise<any> }>()
let appInfoCache: { ts: number; promise: Promise<any> } | null = null

// ARC-4 method selectors computed from signatures to avoid hardcoded drift.
const SELECTOR_OPT_IN = new algosdk.ABIMethod({ name: 'opt_in', args: [], returns: { type: 'void' } }).getSelector()
const SELECTOR_DEPOSIT = new algosdk.ABIMethod({ name: 'deposit', args: [{ type: 'pay' }], returns: { type: 'uint64' } }).getSelector()
const SELECTOR_CLAIM_BADGE = new algosdk.ABIMethod({ name: 'claim_badge', args: [{ type: 'uint64' }], returns: { type: 'uint64' } }).getSelector()
const SELECTOR_WITHDRAW = new algosdk.ABIMethod({ name: 'withdraw', args: [{ type: 'uint64' }, { type: 'address' }], returns: { type: 'void' } }).getSelector()
const SELECTOR_SETUP_PACT = new algosdk.ABIMethod({
  name: 'setup_savings_pact',
  args: [{ type: 'address' }, { type: 'uint64' }, { type: 'uint64' }, { type: 'uint64' }],
  returns: { type: 'void' },
}).getSelector()
const SELECTOR_APPLY_PACT_PENALTY = new algosdk.ABIMethod({
  name: 'apply_pact_penalty',
  args: [{ type: 'address' }, { type: 'pay' }],
  returns: { type: 'uint64' },
}).getSelector()
const SELECTOR_SET_LOCK = new algosdk.ABIMethod({
  name: 'set_temptation_lock',
  args: [{ type: 'uint64' }, { type: 'uint64' }, { type: 'address' }],
  returns: { type: 'void' },
}).getSelector()
const SELECTOR_DISABLE_LOCK = new algosdk.ABIMethod({
  name: 'disable_temptation_lock',
  args: [],
  returns: { type: 'void' },
}).getSelector()
const SELECTOR_SET_DREAM = new algosdk.ABIMethod({
  name: 'set_dream_board',
  args: [{ type: 'byte[]' }, { type: 'byte[]' }],
  returns: { type: 'void' },
}).getSelector()
const DEPOSIT_SELECTOR_B64 = toBase64(SELECTOR_DEPOSIT)
const byteArrayType = algosdk.ABIType.from('byte[]')

// ARC-4 selectors match `savings_vault/.../artifacts/savings_vault/SavingsVault.arc56.json` (deposit pay ref, withdraw + penalty_sink, etc.).

// Legacy on-chain app (previous testnet deployment) is an older ARC-4 router that DOES NOT include Pact/Lock/Dream.
// It also uses a different withdraw signature (`withdraw(uint64)void`).
const SELECTOR_WITHDRAW_LEGACY = Uint8Array.from([0x21, 0xf1, 0xdd, 0xff])

type VaultContractMode = 'legacy_minimal' | 'full_pack'
let cachedMode: VaultContractMode | null = null

export async function getContractMode(): Promise<VaultContractMode> {
  return await detectContractMode()
}

export function selectorHex(selector: Uint8Array): string {
  return Array.from(selector)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function detectContractMode(): Promise<VaultContractMode> {
  if (cachedMode) return cachedMode
  const algod = getAlgodClient()
  const app = (await algod.getApplicationByID(APP_ID).do()) as any
  const approvalB64 = app?.params?.['approval-program']
  if (typeof approvalB64 !== 'string' || approvalB64.length === 0) {
    cachedMode = 'legacy_minimal'
    return cachedMode
  }
  const program = base64ToBytes(approvalB64)
  const dis = (await algod.disassemble(program).do()) as any
  const teal = String(dis?.result ?? '')
  const hasFullWithdraw = teal.includes(`0x${selectorHex(SELECTOR_WITHDRAW)}`)
  const hasLegacyWithdraw = teal.includes(`0x${selectorHex(SELECTOR_WITHDRAW_LEGACY)}`)
  // Heuristic: full pack includes withdraw(uint64,address) + extra methods; legacy includes withdraw(uint64).
  cachedMode = hasFullWithdraw ? 'full_pack' : hasLegacyWithdraw ? 'legacy_minimal' : 'legacy_minimal'
  return cachedMode
}

function requiresFullPack(feature: string): never {
  throw new Error(
    `This feature (${feature}) is not supported by the currently deployed app (App ID ${APP_ID}). ` +
      `Your on-chain contract is the legacy minimal vault. Deploy the latest SavingsVault contract and update VITE_APP_ID.`,
  )
}

function assertConfig() {
  if (!Number.isFinite(APP_ID) || APP_ID <= 0) {
    throw new Error('Invalid VITE_APP_ID. Set a valid app id in .env.')
  }
  // Network endpoints validated in `getNetworkConfig()`; keep this check as a guardrail.
  getNetworkConfig()
}

function withFlatFee(sp: SuggestedParams, fee: number): SuggestedParams {
  return { ...sp, fee, flatFee: true }
}

function encodeTxnBytes(txn: algosdk.Transaction): Uint8Array {
  return algosdk.encodeUnsignedTransaction(txn)
}

/**
 * Application account for this vault — always derived from `VITE_APP_ID`.
 * Never read `VITE_APP_ADDRESS` from env (wrong values cause “malformed address” on payments).
 */
export function getVaultAppAddress(): string {
  assertConfig()
  return algosdk.getApplicationAddress(APP_ID)
}

function toBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
}

function encodeAddressArg(address: string): Uint8Array {
  return algosdk.decodeAddress(address).publicKey
}

function encodeByteArrayArg(text: string): Uint8Array {
  return byteArrayType.encode(new TextEncoder().encode(text))
}

function encodeTxnRefArg(txnIndex: number): Uint8Array {
  if (!Number.isInteger(txnIndex) || txnIndex < 0 || txnIndex > 255) {
    throw new Error('Invalid transaction reference index')
  }
  return Uint8Array.from([txnIndex])
}

function buildActionNote(action: string, fields: Record<string, unknown>): Uint8Array {
  const payload = {
    standard: 'algovault',
    action,
    ts: new Date().toISOString(),
    app_id: APP_ID,
    network: NETWORK,
    ...fields,
  }
  return new TextEncoder().encode(JSON.stringify(payload))
}

function getLoraBaseUrl(): string {
  const { loraNetworkSegment } = getNetworkConfig()
  return `https://lora.algokit.io/${loraNetworkSegment}`
}

export function getExplorerTransactionUrl(txId: string): string {
  return `${getLoraBaseUrl()}/transaction/${txId}`
}

export function getExplorerAssetUrl(assetId: number | string): string {
  return `${getLoraBaseUrl()}/asset/${assetId}`
}

export function getExplorerAccountUrl(address: string): string {
  return `${getLoraBaseUrl()}/account/${address}`
}

export function getExplorerApplicationUrl(appId: number | string): string {
  return `${getLoraBaseUrl()}/application/${appId}`
}

export function getExplorerGroupUrl(groupIdBase64: string): string {
  return `${getLoraBaseUrl()}/group/${groupIdBase64}`
}

export function getAlgodClient(): Algodv2 {
  assertConfig()
  const net = getNetworkConfig()
  if (import.meta.env.DEV && !loggedVaultConfig) {
    loggedVaultConfig = true
    console.log('[AlgoVault] APP_ID:', APP_ID)
    console.log('[AlgoVault] APP_ADDRESS (derived):', algosdk.getApplicationAddress(APP_ID))
    console.log('[AlgoVault] NETWORK:', net.network)
  }
  return new algosdk.Algodv2(
    net.algod.token,
    net.algod.server,
    net.algod.port,
  )
}

export function getIndexerClient(): algosdk.Indexer {
  assertConfig()
  const net = getNetworkConfig()
  return new algosdk.Indexer('', net.indexer.server, net.indexer.port)
}

async function getAccountInformationCached(address: string): Promise<any> {
  const now = Date.now()
  const hit = accountInfoCache.get(address)
  if (hit && now - hit.ts < ACCOUNT_INFO_TTL_MS) return await hit.promise
  const algod = getAlgodClient()
  const promise = algod.accountInformation(address).do()
  accountInfoCache.set(address, { ts: now, promise })
  try {
    return await promise
  } catch (e) {
    // Do not cache failures.
    if (accountInfoCache.get(address)?.promise === promise) accountInfoCache.delete(address)
    throw e
  }
}

async function getApplicationByIdCached(): Promise<any> {
  const now = Date.now()
  if (appInfoCache && now - appInfoCache.ts < APP_INFO_TTL_MS) return await appInfoCache.promise
  const algod = getAlgodClient()
  const promise = algod.getApplicationByID(APP_ID).do()
  appInfoCache = { ts: now, promise }
  try {
    return await promise
  } catch (e) {
    if (appInfoCache?.promise === promise) appInfoCache = null
    throw e
  }
}

export async function getBalance(address: string): Promise<string> {
  try {
    const info = (await getAccountInformationCached(address)) as { amount?: number }
    const microAlgos = info.amount ?? 0
    return (microAlgos / 1_000_000).toFixed(2)
  } catch (e) {
    console.error('Failed to fetch balance:', e)
    return '0.00'
  }
}

function decodeStateValue(v: any): number {
  if (!v) return 0
  if (typeof v.uint === 'number') return v.uint
  if (typeof v.uint === 'bigint') return Number(v.uint)
  return 0
}

function decodeStateBytes(v: any): string {
  if (!v || typeof v.bytes !== 'string') return ''
  const decoded = atob(v.bytes)
  const bytes = Uint8Array.from(decoded, (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

async function getSuggestedParams() {
  const algod = getAlgodClient()
  return await algod.getTransactionParams().do()
}

async function signAndSendGroup(signTransactions: SignTransactionsFn, txns: algosdk.Transaction[]): Promise<string> {
  const algod = getAlgodClient()
  algosdk.assignGroupID(txns)
  const bytesToSign = txns.map((t) => encodeTxnBytes(t))
  const signed = await signTransactions(bytesToSign)
  const validSigned = signed.filter((s): s is Uint8Array => s !== null)
  const { txId } = await algod.sendRawTransaction(validSigned).do()
  await algosdk.waitForConfirmation(algod, txId, 4)
  return txId
}

// Opt into vault app
export async function optInToVault(signTransactions: SignTransactionsFn, address: string): Promise<string> {
  const spBase = await getSuggestedParams()
  const sp = withFlatFee(spBase, FEE_OPT_IN)
  const note = buildActionNote('opt_in', { user: address })
  const txn = algosdk.makeApplicationOptInTxnFromObject({
    from: address,
    appIndex: APP_ID,
    appArgs: [SELECTOR_OPT_IN],
    note,
    suggestedParams: sp,
  })
  const signed = await signTransactions([encodeTxnBytes(txn)])
  const validSigned = signed.filter((s): s is Uint8Array => s !== null)
  const algod = getAlgodClient()
  const { txId } = await algod.sendRawTransaction(validSigned[0]).do()
  await algosdk.waitForConfirmation(algod, txId, 4)
  return txId
}

// ATOMIC GROUP: PaymentTxn + AppCallTxn together
export async function depositToVault(signTransactions: SignTransactionsFn, address: string, amountAlgo: number): Promise<string> {
  if (amountAlgo < 1) throw new Error('Minimum 1 ALGO')
  const spBase = await getSuggestedParams()
  const amountMicro = Math.round(amountAlgo * 1_000_000)
  const appAddr = getVaultAppAddress()
  const note = buildActionNote('deposit', { user: address, amount_micro: amountMicro })

  const payTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: address,
    to: appAddr,
    amount: amountMicro,
    note,
    suggestedParams: withFlatFee(spBase, FEE_PAY_DEPOSIT),
  })

  const appCallTxn = algosdk.makeApplicationNoOpTxnFromObject({
    from: address,
    appIndex: APP_ID,
    // ARC-4 txn arg: reference the payment txn by index (0) — matches SavingsVault.arc56.json deposit(pay)
    appArgs: [SELECTOR_DEPOSIT, encodeTxnRefArg(0)],
    note,
    suggestedParams: withFlatFee(spBase, FEE_APP_DEPOSIT),
  })

  return await signAndSendGroup(signTransactions, [payTxn, appCallTxn])
}

// Withdraw from vault
export async function withdrawFromVault(signTransactions: SignTransactionsFn, address: string, amountAlgo: number, penaltySinkAddress?: string): Promise<string> {
  if (amountAlgo <= 0) throw new Error('Withdrawal must be greater than 0')
  const spBase = await getSuggestedParams()
  const amountMicro = Math.round(amountAlgo * 1_000_000)
  const mode = await detectContractMode()
  const note = buildActionNote('withdraw', { user: address, amount_micro: amountMicro })

  const appCallTxn =
    mode === 'legacy_minimal'
      ? algosdk.makeApplicationNoOpTxnFromObject({
          from: address,
          appIndex: APP_ID,
          appArgs: [SELECTOR_WITHDRAW_LEGACY, algosdk.encodeUint64(amountMicro)],
          note,
          suggestedParams: withFlatFee(spBase, FEE_APP_STANDARD),
        })
      : algosdk.makeApplicationNoOpTxnFromObject({
          from: address,
          appIndex: APP_ID,
          appArgs: [
            SELECTOR_WITHDRAW,
            algosdk.encodeUint64(amountMicro),
            encodeAddressArg(penaltySinkAddress || address),
          ],
          note,
          suggestedParams: withFlatFee(spBase, FEE_APP_WITHDRAW),
        })

  const signed = await signTransactions([encodeTxnBytes(appCallTxn)])
  const validSigned = signed.filter((s): s is Uint8Array => s !== null)
  const algod = getAlgodClient()
  const { txId } = await algod.sendRawTransaction(validSigned[0]).do()
  await algosdk.waitForConfirmation(algod, txId, 4)
  return txId
}

// Read user local state (`user_total` is microAlgos on-chain — UI divides by 1e6 for ALGO)
export async function getUserStats(address: string): Promise<{
  totalSaved: number
  milestone: number
  streak: number
  lastDeposit: number
}> {
  try {
    const info = (await getAccountInformationCached(address)) as any
    const local = (info?.['apps-local-state'] ?? []).find((a: any) => a.id === APP_ID)
    const kv = local?.['key-value'] ?? []

    const getEntry = (key: string) => kv.find((x: any) => x.key === btoa(key))?.value
    const get = (key: string) => decodeStateValue(getEntry(key))

    return {
      totalSaved: get('user_total'),
      milestone: get('user_milestone'),
      streak: get('user_streak'),
      lastDeposit: get('last_deposit'),
    }
  } catch {
    return { totalSaved: 0, milestone: 0, streak: 0, lastDeposit: 0 }
  }
}

// Read global state
export async function getGlobalStats(): Promise<{
  totalDeposited: number
  totalUsers: number
  milestones: { m1: number; m2: number; m3: number }
}> {
  const app = (await getApplicationByIdCached()) as any
  const kv = app?.params?.['global-state'] ?? []

  const get = (key: string) => {
    const b64 = btoa(key)
    const entry = kv.find((x: any) => x.key === b64)
    return decodeStateValue(entry?.value)
  }

  const milestones = {
    m1: get('milestone_1'),
    m2: get('milestone_2'),
    m3: get('milestone_3'),
  }
  if (![milestones.m1, milestones.m2, milestones.m3].every((v) => Number.isFinite(v) && v > 0)) {
    throw new Error('Missing milestone thresholds in on-chain global state (milestone_1/2/3).')
  }
  if (import.meta.env.DEV && !loggedMilestones) {
    loggedMilestones = true
    console.log('[AlgoVault] Milestones (microALGO):', milestones)
    console.log('[AlgoVault] Milestones (ALGO):', {
      m1: milestones.m1 / 1_000_000,
      m2: milestones.m2 / 1_000_000,
      m3: milestones.m3 / 1_000_000,
    })
  }

  return {
    totalDeposited: get('total_deposited'),
    totalUsers: get('total_users'),
    milestones,
  }
}

export async function getMilestonesFromGlobalState(): Promise<{ m1: number; m2: number; m3: number }> {
  const global = await getGlobalStats()
  return global.milestones
}

export async function getGlobalStateTable(): Promise<ReturnType<typeof decodeGlobalStateKv>> {
  const app = (await getApplicationByIdCached()) as any
  const kv = app?.params?.['global-state'] ?? []
  return decodeGlobalStateKv(kv)
}

export async function getLocalStateTable(address: string): Promise<ReturnType<typeof decodeLocalStateKv>> {
  const info = (await getAccountInformationCached(address)) as any
  const local = (info['apps-local-state'] ?? []).find((a: any) => a.id === APP_ID)
  const kv = local?.['key-value'] ?? []
  return decodeLocalStateKv(kv)
}

function extractLocalKvFromAccountInfo(info: any): any[] {
  const local = (info?.['apps-local-state'] ?? []).find((a: any) => a.id === APP_ID)
  return local?.['key-value'] ?? []
}

function localUIntFromKv(kv: any[], key: string): number {
  const entry = kv.find((x: any) => x.key === btoa(key))?.value
  return decodeStateValue(entry)
}

export async function getLocalStateSnapshot(address: string): Promise<{
  totalSavedMicro: number
  streak: number
  milestone: number
}> {
  const info = (await getAccountInformationCached(address)) as any
  const kv = extractLocalKvFromAccountInfo(info)
  return {
    totalSavedMicro: localUIntFromKv(kv, 'user_total'),
    streak: localUIntFromKv(kv, 'user_streak'),
    milestone: localUIntFromKv(kv, 'user_milestone'),
  }
}

export async function getLocalStateSnapshotAtRound(address: string, round: number): Promise<{
  round: number
  totalSavedMicro: number
  streak: number
  milestone: number
}> {
  const algod = getAlgodClient()
  // Historical read for BEFORE/AFTER without guessing.
  const req: any = algod.accountInformation(address)
  const info = (await (typeof req.round === 'function' ? req.round(round) : req).do()) as any
  const kv = extractLocalKvFromAccountInfo(info)
  return {
    round,
    totalSavedMicro: localUIntFromKv(kv, 'user_total'),
    streak: localUIntFromKv(kv, 'user_streak'),
    milestone: localUIntFromKv(kv, 'user_milestone'),
  }
}

export async function getBoxProof(): Promise<
  | { used: false; reason: string }
  | {
      used: true
      boxes: Array<{
        keyBase64: string
        keyUtf8: string
        keyHex: string
        size: number
        valueType: 'json' | 'utf8' | 'bytes'
        valuePreview: string
      }>
    }
> {
  const algod = getAlgodClient()
  const res = (await algod.getApplicationBoxes(APP_ID).do()) as any
  const boxes = (res?.boxes ?? []) as any[]
  if (!Array.isArray(boxes) || boxes.length === 0) {
    return { used: false, reason: 'No boxes found via algod.getApplicationBoxes(appId).' }
  }

  const out: Array<{
    keyBase64: string
    keyUtf8: string
    keyHex: string
    size: number
    valueType: 'json' | 'utf8' | 'bytes'
    valuePreview: string
  }> = []

  for (const b of boxes.slice(0, 40)) {
    const nameB64 = String(b?.name ?? '')
    if (!nameB64) continue
    const keyBytes = base64ToBytes(nameB64)
    const keyUtf8 = tryDecodeUtf8(keyBytes) ?? ''
    const keyHex = Array.from(keyBytes).map((x) => x.toString(16).padStart(2, '0')).join('')
    try {
      const box = (await algod.getApplicationBoxByName(APP_ID, keyBytes).do()) as any
      const valueB64 = String(box?.value ?? '')
      const valueBytes = valueB64 ? base64ToBytes(valueB64) : new Uint8Array()
      const size = valueBytes.length
      const json = tryDecodeJsonFromBytes(valueBytes)
      if (json !== null) {
        out.push({ keyBase64: nameB64, keyUtf8: keyUtf8 || '(non-utf8)', keyHex, size, valueType: 'json', valuePreview: JSON.stringify(json).slice(0, 220) })
        continue
      }
      const utf8 = tryDecodeUtf8(valueBytes)
      if (utf8 !== null) {
        out.push({ keyBase64: nameB64, keyUtf8: keyUtf8 || '(non-utf8)', keyHex, size, valueType: 'utf8', valuePreview: utf8.slice(0, 220) })
        continue
      }
      out.push({
        keyBase64: nameB64,
        keyUtf8: keyUtf8 || '(non-utf8)',
        keyHex,
        size,
        valueType: 'bytes',
        valuePreview: Array.from(valueBytes.slice(0, 32)).map((x) => x.toString(16).padStart(2, '0')).join(''),
      })
    } catch {
      // Box exists but cannot be read (permissions/size). Keep a row anyway.
      out.push({ keyBase64: nameB64, keyUtf8: keyUtf8 || '(non-utf8)', keyHex, size: 0, valueType: 'bytes', valuePreview: 'unreadable' })
    }
  }

  return { used: true, boxes: out }
}

export async function getPendingTxnDetails(txId: string): Promise<{
  logs: ReturnType<typeof decodeLogs>
  innerTxns: Array<{ txType: string; sender?: string; receiver?: string; amount?: number; createdAssetId?: number }>
}> {
  const algod = getAlgodClient()
  const p = (await algod.pendingTransactionInformation(txId).do()) as any
  const logs = decodeLogs(p?.logs) ?? []
  const inner = (p?.['inner-txns'] ?? []) as any[]
  const innerTxns = Array.isArray(inner)
    ? inner.map((it: any) => ({
        txType: String(it?.['tx-type'] ?? 'UNKNOWN'),
        sender: typeof it?.sender === 'string' ? it.sender : undefined,
        receiver: typeof it?.['payment-transaction']?.receiver === 'string' ? it['payment-transaction'].receiver : undefined,
        amount: typeof it?.['payment-transaction']?.amount === 'number' ? it['payment-transaction'].amount : undefined,
        createdAssetId: typeof it?.['created-asset-index'] === 'number' ? it['created-asset-index'] : undefined,
      }))
    : []
  return { logs, innerTxns }
}

type ProtocolTxnRow = {
  txId: string
  loraTxUrl: string
  loraGroupUrl?: string
  group?: string
  confirmedRound?: number
  timestamp?: number
  txType: string
  sender: string
  receiver?: string
  amount?: number
  appId?: number
  onCompletion?: string
  method?: string
  selectorHex?: string
  decodedArgs?: ReturnType<typeof decodeAppCallArgs>['args']
  note?: ReturnType<typeof decodeArc69Note>
  logs?: ReturnType<typeof decodeLogs>
  innerTxns?: Array<{
    txType: string
    sender?: string
    receiver?: string
    amount?: number
    assetId?: number
    createdAssetId?: number
  }>
}

const METHOD_REGISTRY: Record<string, { name: string; argTypes: Array<'uint64' | 'address' | 'byte[]' | 'txn_ref'> }> = {
  [selectorHex(SELECTOR_OPT_IN)]: { name: 'opt_in()', argTypes: [] },
  [selectorHex(SELECTOR_DEPOSIT)]: { name: 'deposit(pay)', argTypes: ['txn_ref'] },
  [selectorHex(SELECTOR_CLAIM_BADGE)]: { name: 'claim_badge(uint64)', argTypes: ['uint64'] },
  [selectorHex(SELECTOR_WITHDRAW)]: { name: 'withdraw(uint64,address)', argTypes: ['uint64', 'address'] },
  [selectorHex(SELECTOR_WITHDRAW_LEGACY)]: { name: 'withdraw(uint64) [legacy]', argTypes: ['uint64'] },
  [selectorHex(SELECTOR_SETUP_PACT)]: { name: 'setup_savings_pact(address,uint64,uint64,uint64)', argTypes: ['address', 'uint64', 'uint64', 'uint64'] },
  [selectorHex(SELECTOR_APPLY_PACT_PENALTY)]: { name: 'apply_pact_penalty(address,pay)', argTypes: ['address', 'txn_ref'] },
  [selectorHex(SELECTOR_SET_LOCK)]: { name: 'set_temptation_lock(uint64,uint64,address)', argTypes: ['uint64', 'uint64', 'address'] },
  [selectorHex(SELECTOR_DISABLE_LOCK)]: { name: 'disable_temptation_lock()', argTypes: [] },
  [selectorHex(SELECTOR_SET_DREAM)]: { name: 'set_dream_board(byte[],byte[])', argTypes: ['byte[]', 'byte[]'] },
}

export async function getProtocolTransactions(address: string, limit: number = 40): Promise<{
  rows: ProtocolTxnRow[]
  groups: Record<string, ProtocolTxnRow[]>
}> {
  const indexer = getIndexerClient()
  const res = (await indexer.searchForTransactions().address(address).limit(Math.max(60, limit * 4)).do()) as any
  const txns = (res?.transactions ?? []) as any[]

  const rows: ProtocolTxnRow[] = txns.map((t: any) => {
    const txId = String(t?.id ?? '')
    const txType = String(t?.['tx-type'] ?? 'UNKNOWN')
    const sender = String(t?.sender ?? '')
    const group = typeof t?.group === 'string' ? t.group : undefined
    const confirmedRound = typeof t?.['confirmed-round'] === 'number' ? t['confirmed-round'] : undefined
    const timestamp = typeof t?.['round-time'] === 'number' ? t['round-time'] : undefined

    const pay = t?.['payment-transaction']
    const appl = t?.['application-transaction']
    const receiver = typeof pay?.receiver === 'string' ? pay.receiver : undefined
    const amount = typeof pay?.amount === 'number' ? pay.amount : undefined
    const appId = typeof appl?.['application-id'] === 'number' ? appl['application-id'] : undefined
    const onCompletion = appl?.['on-completion'] ? String(appl['on-completion']).toUpperCase() : undefined

    const appArgs = Array.isArray(appl?.['application-args']) ? (appl['application-args'] as string[]) : undefined
    const decoded = appArgs ? decodeAppCallArgs(appArgs, METHOD_REGISTRY) : undefined

    const note = decodeArc69Note(t?.note) ?? undefined
    const logs = decodeLogs(t?.logs) ?? undefined

    const inner = (t?.['inner-txns'] ?? []) as any[]
    const innerTxns = Array.isArray(inner)
      ? inner.map((it: any) => ({
          txType: String(it?.['tx-type'] ?? 'UNKNOWN'),
          sender: typeof it?.sender === 'string' ? it.sender : undefined,
          receiver: typeof it?.['payment-transaction']?.receiver === 'string' ? it['payment-transaction'].receiver : undefined,
          amount: typeof it?.['payment-transaction']?.amount === 'number' ? it['payment-transaction'].amount : undefined,
          assetId: typeof it?.['asset-config-transaction']?.['asset-id'] === 'number' ? it['asset-config-transaction']['asset-id'] : undefined,
          createdAssetId: typeof it?.['created-asset-index'] === 'number' ? it['created-asset-index'] : undefined,
        }))
      : undefined

    return {
      txId,
      loraTxUrl: getExplorerTransactionUrl(txId),
      group,
      loraGroupUrl: group ? getExplorerGroupUrl(group) : undefined,
      confirmedRound,
      timestamp,
      txType,
      sender,
      receiver,
      amount,
      appId,
      onCompletion,
      method: decoded?.method,
      selectorHex: decoded?.selectorHex,
      decodedArgs: decoded?.args,
      note,
      logs,
      innerTxns,
    }
  })

  const filtered = rows
    .filter((r) => r.txId.length > 0)
    .sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0))
    .slice(0, limit)

  const groups: Record<string, ProtocolTxnRow[]> = {}
  for (const r of filtered) {
    if (!r.group) continue
    groups[r.group] = groups[r.group] ?? []
    groups[r.group].push(r)
  }
  for (const g of Object.keys(groups)) {
    groups[g].sort((a, b) => (a.txType === 'pay' ? -1 : 1) - (b.txType === 'pay' ? -1 : 1))
  }

  return { rows: filtered, groups }
}

const BADGE_NAMES: Record<number, string> = {
  1: 'Vault Starter',
  2: 'Vault Builder',
  3: 'Vault Master',
}

function buildArc69Note(address: string, level: number): Uint8Array {
  const walletSeed = address.slice(0, 8)
  const metadata = {
    standard: 'arc69',
    description: `${BADGE_NAMES[level] ?? 'Badge'} — AlgoVault milestone achievement`,
    properties: {
      wallet: address,
      wallet_seed: walletSeed,
      milestone: level,
      vault_type: 'savings',
      earned_date: new Date().toISOString(),
      app_id: APP_ID,
      network: NETWORK,
    },
  }
  return new TextEncoder().encode(JSON.stringify(metadata))
}

export async function claimBadge(signTransactions: SignTransactionsFn, address: string, level: number): Promise<{ txId: string; assetId?: number }> {
  if (![1, 2, 3].includes(level)) throw new Error('Milestone level must be 1, 2, or 3')
  const spBase = await getSuggestedParams()
  const sp = withFlatFee(spBase, FEE_APP_CLAIM_BADGE)
  const arc69Note = buildArc69Note(address, level)
  const appCallTxn = algosdk.makeApplicationNoOpTxnFromObject({
    from: address,
    appIndex: APP_ID,
    appArgs: [
      SELECTOR_CLAIM_BADGE,
      algosdk.encodeUint64(level),
    ],
    note: arc69Note,
    suggestedParams: sp,
  })
  const signed = await signTransactions([encodeTxnBytes(appCallTxn)])
  const validSigned = signed.filter((s): s is Uint8Array => s !== null)
  const algod = getAlgodClient()
  const { txId } = await algod.sendRawTransaction(validSigned[0]).do()
  await algosdk.waitForConfirmation(algod, txId, 4)

  try {
    const p = (await algod.pendingTransactionInformation(txId).do()) as any
    const inner = (p?.['inner-txns'] ?? []) as any[]
    const created = inner
      .map((t) => t?.['created-asset-index'])
      .find((x) => typeof x === 'number' && x > 0) as number | undefined
    return { txId, assetId: created }
  } catch {
    return { txId }
  }
}

export async function setupSavingsPact(
  signTransactions: SignTransactionsFn,
  address: string,
  partnerAddress: string,
  requiredAmountAlgo: number,
  cadenceDays: number,
  penaltyAmountAlgo: number,
): Promise<string> {
  const mode = await detectContractMode()
  if (mode !== 'full_pack') return requiresFullPack('Savings Pact')
  const spBase = await getSuggestedParams()
  const sp = withFlatFee(spBase, FEE_APP_STANDARD)
  const requiredMicro = Math.round(requiredAmountAlgo * 1_000_000)
  const penaltyMicro = Math.round(penaltyAmountAlgo * 1_000_000)
  const cadenceSeconds = Math.round(cadenceDays * 24 * 60 * 60)
  const note = buildActionNote('pact_setup', {
    user: address,
    partner: partnerAddress,
    required_micro: requiredMicro,
    cadence_seconds: cadenceSeconds,
    penalty_micro: penaltyMicro,
  })
  const txn = algosdk.makeApplicationNoOpTxnFromObject({
    from: address,
    appIndex: APP_ID,
    appArgs: [
      SELECTOR_SETUP_PACT,
      encodeAddressArg(partnerAddress),
      algosdk.encodeUint64(requiredMicro),
      algosdk.encodeUint64(cadenceSeconds),
      algosdk.encodeUint64(penaltyMicro),
    ],
    note,
    suggestedParams: sp,
  })
  const signed = await signTransactions([encodeTxnBytes(txn)])
  const validSigned = signed.filter((s): s is Uint8Array => s !== null)
  const algod = getAlgodClient()
  const { txId } = await algod.sendRawTransaction(validSigned[0]).do()
  await algosdk.waitForConfirmation(algod, txId, 4)
  return txId
}

export async function applyPactPenalty(
  signTransactions: SignTransactionsFn,
  address: string,
  partnerAddress: string,
  penaltyAmountAlgo: number,
): Promise<string> {
  const mode = await detectContractMode()
  if (mode !== 'full_pack') return requiresFullPack('Savings Pact penalty')
  const spBase = await getSuggestedParams()
  const amountMicro = Math.round(penaltyAmountAlgo * 1_000_000)
  const appAddr = getVaultAppAddress()
  const note = buildActionNote('pact_penalty', { user: address, partner: partnerAddress, amount_micro: amountMicro })
  const payTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: address,
    to: appAddr,
    amount: amountMicro,
    note,
    suggestedParams: withFlatFee(spBase, FEE_PAY_PACT),
  })
  const appCallTxn = algosdk.makeApplicationNoOpTxnFromObject({
    from: address,
    appIndex: APP_ID,
    // ARC-4 txn arg: reference the payment txn by index (0)
    appArgs: [SELECTOR_APPLY_PACT_PENALTY, encodeAddressArg(partnerAddress), encodeTxnRefArg(0)],
    note,
    suggestedParams: withFlatFee(spBase, FEE_APP_PACT),
  })
  return signAndSendGroup(signTransactions, [payTxn, appCallTxn])
}

export async function setTemptationLock(
  signTransactions: SignTransactionsFn,
  address: string,
  goalAmountAlgo: number,
  penaltyBps: number,
  penaltySinkAddress: string,
): Promise<string> {
  const mode = await detectContractMode()
  if (mode !== 'full_pack') return requiresFullPack('Temptation Lock')
  const spBase = await getSuggestedParams()
  const sp = withFlatFee(spBase, FEE_APP_STANDARD)
  const goalMicro = Math.round(goalAmountAlgo * 1_000_000)
  const note = buildActionNote('lock_set', {
    user: address,
    goal_micro: goalMicro,
    penalty_bps: penaltyBps,
    penalty_sink: penaltySinkAddress,
  })
  const txn = algosdk.makeApplicationNoOpTxnFromObject({
    from: address,
    appIndex: APP_ID,
    appArgs: [
      SELECTOR_SET_LOCK,
      algosdk.encodeUint64(goalMicro),
      algosdk.encodeUint64(penaltyBps),
      encodeAddressArg(penaltySinkAddress),
    ],
    note,
    suggestedParams: sp,
  })
  const signed = await signTransactions([encodeTxnBytes(txn)])
  const validSigned = signed.filter((s): s is Uint8Array => s !== null)
  const algod = getAlgodClient()
  const { txId } = await algod.sendRawTransaction(validSigned[0]).do()
  await algosdk.waitForConfirmation(algod, txId, 4)
  return txId
}

export async function disableTemptationLock(signTransactions: SignTransactionsFn, address: string): Promise<string> {
  const mode = await detectContractMode()
  if (mode !== 'full_pack') return requiresFullPack('Temptation Lock disable')
  const spBase = await getSuggestedParams()
  const sp = withFlatFee(spBase, FEE_APP_STANDARD)
  const note = buildActionNote('lock_disable', { user: address })
  const txn = algosdk.makeApplicationNoOpTxnFromObject({
    from: address,
    appIndex: APP_ID,
    appArgs: [SELECTOR_DISABLE_LOCK],
    note,
    suggestedParams: sp,
  })
  const signed = await signTransactions([encodeTxnBytes(txn)])
  const validSigned = signed.filter((s): s is Uint8Array => s !== null)
  const algod = getAlgodClient()
  const { txId } = await algod.sendRawTransaction(validSigned[0]).do()
  await algosdk.waitForConfirmation(algod, txId, 4)
  return txId
}

export async function setDreamBoard(signTransactions: SignTransactionsFn, address: string, dreamUri: string, dreamTitle: string): Promise<string> {
  const mode = await detectContractMode()
  if (mode !== 'full_pack') return requiresFullPack('Dream Board')
  const spBase = await getSuggestedParams()
  const sp = withFlatFee(spBase, FEE_APP_STANDARD)
  const note = buildActionNote('dream_set', { user: address })
  const txn = algosdk.makeApplicationNoOpTxnFromObject({
    from: address,
    appIndex: APP_ID,
    appArgs: [
      SELECTOR_SET_DREAM,
      encodeByteArrayArg(dreamUri),
      encodeByteArrayArg(dreamTitle),
    ],
    note,
    suggestedParams: sp,
  })
  const signed = await signTransactions([encodeTxnBytes(txn)])
  const validSigned = signed.filter((s): s is Uint8Array => s !== null)
  const algod = getAlgodClient()
  const { txId } = await algod.sendRawTransaction(validSigned[0]).do()
  await algosdk.waitForConfirmation(algod, txId, 4)
  return txId
}

export async function getPactConfig(): Promise<{
  enabled: number
  requiredAmountMicro: number
  cadenceSeconds: number
  penaltyAmountMicro: number
  userA: string
  userB: string
}> {
  const algod = getAlgodClient()
  const app = (await algod.getApplicationByID(APP_ID).do()) as any
  const kv = app?.params?.['global-state'] ?? []
  const getEntry = (key: string) => kv.find((x: any) => x.key === btoa(key))?.value
  const getUInt = (key: string) => decodeStateValue(getEntry(key))
  const getAddr = (key: string) => {
    const entry = getEntry(key)
    if (!entry?.bytes) return ''
    const raw = Uint8Array.from(atob(entry.bytes), (c) => c.charCodeAt(0))
    if (raw.length !== 32) return ''
    return algosdk.encodeAddress(raw)
  }
  return {
    enabled: getUInt('pact_enabled'),
    requiredAmountMicro: getUInt('pact_required_amount'),
    cadenceSeconds: getUInt('pact_cadence_seconds'),
    penaltyAmountMicro: getUInt('pact_penalty_amount'),
    userA: getAddr('pact_user_a'),
    userB: getAddr('pact_user_b'),
  }
}

export async function getUserExtraState(address: string): Promise<{
  lockEnabled: number
  goalAmountMicro: number
  penaltyBps: number
  penaltySink: string
  dreamUri: string
  dreamTitle: string
}> {
  const info = (await getAccountInformationCached(address)) as any
  const local = (info['apps-local-state'] ?? []).find((a: any) => a.id === APP_ID)
  const kv = local?.['key-value'] ?? []
  const getEntry = (key: string) => kv.find((x: any) => x.key === btoa(key))?.value
  const getUInt = (key: string) => decodeStateValue(getEntry(key))
  const getAddr = (key: string) => {
    const v = getEntry(key)
    if (!v?.bytes) return ''
    const raw = Uint8Array.from(atob(v.bytes), (c) => c.charCodeAt(0))
    if (raw.length !== 32) return ''
    return algosdk.encodeAddress(raw)
  }
  return {
    lockEnabled: getUInt('lock_enabled'),
    goalAmountMicro: getUInt('user_goal_amount'),
    penaltyBps: getUInt('user_penalty_bps'),
    penaltySink: getAddr('penalty_sink'),
    dreamUri: decodeStateBytes(getEntry('dream_uri')),
    dreamTitle: decodeStateBytes(getEntry('dream_title')),
  }
}

// Get transaction history from indexer
export async function getTransactionHistory(
  address: string,
  limit: number = 10,
): Promise<Array<{
  txId: string
  amount: number
  type: string
  timestamp: number
  action: string
  loraUrl: string
  confirmedRound?: number
  group?: string
  groupSize?: number
  method?: string
}>> {
  const indexer = getIndexerClient()
  const vaultAddr = getVaultAppAddress()
  // Query by account only (not `application-id` alone): deposit groups include a pay txn
  // without application-id; we need the full group in the page to label "Deposit" vs "Payment".
  const res = (await indexer.searchForTransactions().address(address).limit(Math.max(40, limit * 5)).do()) as any
  const txns = res?.transactions ?? []
  const byId = new Map<string, any>(txns.map((t: any) => [t?.id, t]))
  const groupCounts = new Map<string, number>()
  for (const t of txns) {
    const g = t?.group
    if (typeof g === 'string' && g.length > 0) groupCounts.set(g, (groupCounts.get(g) ?? 0) + 1)
  }

  const selectorHexToMethod: Record<string, string> = {
    [selectorHex(SELECTOR_OPT_IN)]: 'opt_in',
    [selectorHex(SELECTOR_DEPOSIT)]: 'deposit',
    [selectorHex(SELECTOR_CLAIM_BADGE)]: 'claim_badge',
    [selectorHex(SELECTOR_WITHDRAW)]: 'withdraw',
    [selectorHex(SELECTOR_WITHDRAW_LEGACY)]: 'withdraw (legacy)',
    [selectorHex(SELECTOR_SETUP_PACT)]: 'setup_savings_pact',
    [selectorHex(SELECTOR_APPLY_PACT_PENALTY)]: 'apply_pact_penalty',
    [selectorHex(SELECTOR_SET_LOCK)]: 'set_temptation_lock',
    [selectorHex(SELECTOR_DISABLE_LOCK)]: 'disable_temptation_lock',
    [selectorHex(SELECTOR_SET_DREAM)]: 'set_dream_board',
  }

  const decodeMethod = (t: any): string | undefined => {
    if (t?.['tx-type'] !== 'appl') return undefined
    const appId = t?.['application-transaction']?.['application-id']
    if (appId !== APP_ID) return undefined
    const arg0 = t?.['application-transaction']?.['application-args']?.[0]
    if (typeof arg0 !== 'string' || arg0.length === 0) return undefined
    try {
      const raw = atob(arg0)
      const bytes = new Uint8Array(raw.length)
      for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
      const hex = selectorHex(bytes)
      return selectorHexToMethod[hex] ?? `method ${hex}`
    } catch {
      return undefined
    }
  }

  const classifyAction = (t: any): string => {
    const type = t?.['tx-type']
    if (type === 'pay' && t?.sender === address && t?.['payment-transaction']?.receiver === vaultAddr) {
      const group = t?.group
      if (!group) return 'Payment'
      const hasDepositCall = txns.some(
        (x: any) =>
          x?.group === group &&
          x?.sender === address &&
          x?.['tx-type'] === 'appl' &&
          x?.['application-transaction']?.['application-id'] === APP_ID &&
          x?.['application-transaction']?.['application-args']?.[0] === DEPOSIT_SELECTOR_B64,
      )
      if (hasDepositCall) return 'Deposit'
      return 'Payment'
    }
    if (type === 'appl' && t?.['application-transaction']?.['application-id'] === APP_ID) {
      return 'App Call'
    }
    return type ?? 'UNKNOWN'
  }

  type HistoryItem = {
    txId: string
    amount: number
    type: string
    timestamp: number
    action: string
    loraUrl: string
    confirmedRound?: number
    group?: string
    groupSize?: number
    method?: string
  }
  const mapped: HistoryItem[] = txns.map((t: any) => {
    const txId = t.id as string
    const amount = t?.['payment-transaction']?.amount ?? 0
    const type = t?.['tx-type'] ?? 'UNKNOWN'
    const timestamp = t?.['round-time'] ?? 0
    const action = classifyAction(t)
    const group = typeof t?.group === 'string' ? t.group : undefined
    return {
      txId,
      amount,
      type,
      timestamp,
      action,
      loraUrl: getExplorerTransactionUrl(txId),
      confirmedRound: typeof t?.['confirmed-round'] === 'number' ? t['confirmed-round'] : undefined,
      group,
      groupSize: group ? groupCounts.get(group) : undefined,
      method: decodeMethod(t),
    }
  })
  return mapped
    .sort((a: HistoryItem, b: HistoryItem) => b.timestamp - a.timestamp)
    .slice(0, limit)
    .filter((item: HistoryItem) => byId.has(item.txId))
}

export async function getRecentDepositsSummary(address: string, count: number = 3): Promise<string> {
  const indexer = getIndexerClient()
  const appAddress = getVaultAppAddress()
  const res = (await indexer.searchForTransactions().address(address).limit(50).do()) as any
  const txns = (res?.transactions ?? []) as any[]

  const deposits = txns
    .filter((t) => t?.['tx-type'] === 'pay')
    .filter((t) => t?.sender === address)
    .filter((t) => t?.['payment-transaction']?.receiver === appAddress)
    .filter((t) => {
      const group = t?.group
      if (!group) return false
      return txns.some(
        (x) =>
          x?.group === group &&
          x?.sender === address &&
          x?.['tx-type'] === 'appl' &&
          x?.['application-transaction']?.['application-id'] === APP_ID &&
          x?.['application-transaction']?.['application-args']?.[0] === DEPOSIT_SELECTOR_B64,
      )
    })
    .sort((a, b) => (b?.['round-time'] ?? 0) - (a?.['round-time'] ?? 0))
    .slice(0, count)
    .map((t) => Number(t?.['payment-transaction']?.amount ?? 0) / 1_000_000)

  if (deposits.length === 0) return 'none yet'
  return deposits.map((a) => `${a.toFixed(2)} ALGO`).join(', ')
}

// Check if user opted in
export async function isOptedIn(address: string): Promise<boolean> {
  const info = (await getAccountInformationCached(address)) as any
  const local = info?.['apps-local-state'] ?? []
  return local.some((a: any) => a.id === APP_ID)
}

export async function getLatestOptInTxId(address: string): Promise<string | null> {
  const indexer = getIndexerClient()
  const res = (await indexer
    .searchForTransactions()
    .address(address)
    .txType('appl')
    .applicationID(APP_ID)
    .limit(25)
    .do()) as any

  const txns = (res?.transactions ?? []) as any[]
  const optIn = txns
    .filter((t) => t?.['tx-type'] === 'appl')
    .filter((t) => t?.['application-transaction']?.['application-id'] === APP_ID)
    .filter((t) => String(t?.['application-transaction']?.['on-completion'] ?? '').toLowerCase() === 'optin')
    .sort((a, b) => (b?.['round-time'] ?? 0) - (a?.['round-time'] ?? 0))[0]

  return optIn?.id ? String(optIn.id) : null
}
