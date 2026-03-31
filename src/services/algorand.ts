import algosdk, { type Algodv2 } from 'algosdk'

export type SignTransactionsFn = (txns: Uint8Array[]) => Promise<(Uint8Array | null)[]>

const APP_ID = Number(import.meta.env.VITE_APP_ID)
const APP_ADDRESS = import.meta.env.VITE_APP_ADDRESS
const NETWORK = (import.meta.env.VITE_NETWORK || 'testnet').toLowerCase()

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

function assertConfig() {
  if (!Number.isFinite(APP_ID) || APP_ID <= 0) {
    throw new Error('Invalid VITE_APP_ID. Set a valid app id in .env.')
  }
  if (!import.meta.env.VITE_ALGOD_SERVER) {
    throw new Error('Missing VITE_ALGOD_SERVER in .env.')
  }
  if (!import.meta.env.VITE_INDEXER_SERVER) {
    throw new Error('Missing VITE_INDEXER_SERVER in .env.')
  }
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

function getIndexerPort(): number {
  const configured = Number(import.meta.env.VITE_INDEXER_PORT || 443)
  return Number.isFinite(configured) ? configured : 443
}

function getLoraBaseUrl(): string {
  const networkSegment = NETWORK === 'mainnet' ? 'mainnet' : NETWORK === 'localnet' ? 'localnet' : 'testnet'
  return `https://lora.algokit.io/${networkSegment}`
}

export function getExplorerTransactionUrl(txId: string): string {
  return `${getLoraBaseUrl()}/transaction/${txId}`
}

export function getExplorerAssetUrl(assetId: number | string): string {
  return `${getLoraBaseUrl()}/asset/${assetId}`
}

function getAppAddress(): string {
  // Prefer explicit env value; fallback to deterministic app address by APP_ID.
  if (APP_ADDRESS && APP_ADDRESS.length > 0) return APP_ADDRESS
  return algosdk.getApplicationAddress(APP_ID)
}

export function getAlgodClient(): Algodv2 {
  assertConfig()
  return new algosdk.Algodv2(
    import.meta.env.VITE_ALGOD_TOKEN || '',
    import.meta.env.VITE_ALGOD_SERVER,
    Number(import.meta.env.VITE_ALGOD_PORT),
  )
}

export function getIndexerClient(): algosdk.Indexer {
  assertConfig()
  return new algosdk.Indexer('', import.meta.env.VITE_INDEXER_SERVER, getIndexerPort())
}

export async function getBalance(address: string): Promise<string> {
  const algod = getAlgodClient()
  try {
    const info = (await algod.accountInformation(address).do()) as { amount?: number }
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
  const bytesToSign = txns.map((t) => t.toByte())
  const signed = await signTransactions(bytesToSign)
  const validSigned = signed.filter((s): s is Uint8Array => s !== null)
  const { txId } = await algod.sendRawTransaction(validSigned).do()
  await algosdk.waitForConfirmation(algod, txId, 8)
  return txId
}

// Opt into vault app
export async function optInToVault(signTransactions: SignTransactionsFn, address: string): Promise<string> {
  const sp = await getSuggestedParams()
  const txn = algosdk.makeApplicationOptInTxnFromObject({
    from: address,
    appIndex: APP_ID,
    appArgs: [SELECTOR_OPT_IN],
    suggestedParams: sp,
  })
  const signed = await signTransactions([txn.toByte()])
  const validSigned = signed.filter((s): s is Uint8Array => s !== null)
  const algod = getAlgodClient()
  const { txId } = await algod.sendRawTransaction(validSigned[0]).do()
  await algosdk.waitForConfirmation(algod, txId, 8)
  return txId
}

// ATOMIC GROUP: PaymentTxn + AppCallTxn together
export async function depositToVault(signTransactions: SignTransactionsFn, address: string, amountAlgo: number): Promise<string> {
  if (amountAlgo < 1) throw new Error('Minimum 1 ALGO')
  const sp = await getSuggestedParams()
  const amountMicro = Math.round(amountAlgo * 1_000_000)

  const payTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: address,
    to: getAppAddress(),
    amount: amountMicro,
    suggestedParams: sp,
  })

  const appCallTxn = algosdk.makeApplicationNoOpTxnFromObject({
    from: address,
    appIndex: APP_ID,
    // ARC-4 txn arg: reference the payment txn by index (0)
    appArgs: [SELECTOR_DEPOSIT, encodeTxnRefArg(0)],
    suggestedParams: sp,
  })

  return await signAndSendGroup(signTransactions, [payTxn, appCallTxn])
}

// Withdraw from vault
export async function withdrawFromVault(signTransactions: SignTransactionsFn, address: string, amountAlgo: number, penaltySinkAddress?: string): Promise<string> {
  if (amountAlgo <= 0) throw new Error('Withdrawal must be greater than 0')
  const sp = await getSuggestedParams()
  const amountMicro = Math.round(amountAlgo * 1_000_000)
  const sink = penaltySinkAddress || address

  const appCallTxn = algosdk.makeApplicationNoOpTxnFromObject({
    from: address,
    appIndex: APP_ID,
    appArgs: [
      SELECTOR_WITHDRAW,
      algosdk.encodeUint64(amountMicro),
      encodeAddressArg(sink),
    ],
    suggestedParams: sp,
  })

  const signed = await signTransactions([appCallTxn.toByte()])
  const validSigned = signed.filter((s): s is Uint8Array => s !== null)
  const algod = getAlgodClient()
  const { txId } = await algod.sendRawTransaction(validSigned[0]).do()
  await algosdk.waitForConfirmation(algod, txId, 8)
  return txId
}

// Read user local state
export async function getUserStats(address: string): Promise<{
  totalSaved: number
  milestone: number
  streak: number
  lastDeposit: number
}> {
  const algod = getAlgodClient()
  try {
    const info = (await algod.accountApplicationInformation(address, APP_ID).do()) as any
    const kv = info?.['app-local-state']?.['key-value'] ?? []

    const get = (key: string) => {
      const b64 = btoa(key)
      const entry = kv.find((x: any) => x.key === b64)
      return decodeStateValue(entry?.value)
    }

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
}> {
  const algod = getAlgodClient()
  const app = (await algod.getApplicationByID(APP_ID).do()) as any
  const kv = app?.params?.['global-state'] ?? []

  const get = (key: string) => {
    const b64 = btoa(key)
    const entry = kv.find((x: any) => x.key === b64)
    return decodeStateValue(entry?.value)
  }

  return {
    totalDeposited: get('total_deposited'),
    totalUsers: get('total_users'),
  }
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
  const sp = await getSuggestedParams()
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
  const signed = await signTransactions([appCallTxn.toByte()])
  const validSigned = signed.filter((s): s is Uint8Array => s !== null)
  const algod = getAlgodClient()
  const { txId } = await algod.sendRawTransaction(validSigned[0]).do()
  await algosdk.waitForConfirmation(algod, txId, 8)

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
  const sp = await getSuggestedParams()
  const requiredMicro = Math.round(requiredAmountAlgo * 1_000_000)
  const penaltyMicro = Math.round(penaltyAmountAlgo * 1_000_000)
  const cadenceSeconds = Math.round(cadenceDays * 24 * 60 * 60)
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
    suggestedParams: sp,
  })
  const signed = await signTransactions([txn.toByte()])
  const validSigned = signed.filter((s): s is Uint8Array => s !== null)
  const algod = getAlgodClient()
  const { txId } = await algod.sendRawTransaction(validSigned[0]).do()
  await algosdk.waitForConfirmation(algod, txId, 8)
  return txId
}

export async function applyPactPenalty(
  signTransactions: SignTransactionsFn,
  address: string,
  partnerAddress: string,
  penaltyAmountAlgo: number,
): Promise<string> {
  const sp = await getSuggestedParams()
  const amountMicro = Math.round(penaltyAmountAlgo * 1_000_000)
  const payTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: address,
    to: getAppAddress(),
    amount: amountMicro,
    suggestedParams: sp,
  })
  const appCallTxn = algosdk.makeApplicationNoOpTxnFromObject({
    from: address,
    appIndex: APP_ID,
    // ARC-4 txn arg: reference the payment txn by index (0)
    appArgs: [SELECTOR_APPLY_PACT_PENALTY, encodeAddressArg(partnerAddress), encodeTxnRefArg(0)],
    suggestedParams: sp,
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
  const sp = await getSuggestedParams()
  const goalMicro = Math.round(goalAmountAlgo * 1_000_000)
  const txn = algosdk.makeApplicationNoOpTxnFromObject({
    from: address,
    appIndex: APP_ID,
    appArgs: [
      SELECTOR_SET_LOCK,
      algosdk.encodeUint64(goalMicro),
      algosdk.encodeUint64(penaltyBps),
      encodeAddressArg(penaltySinkAddress),
    ],
    suggestedParams: sp,
  })
  const signed = await signTransactions([txn.toByte()])
  const validSigned = signed.filter((s): s is Uint8Array => s !== null)
  const algod = getAlgodClient()
  const { txId } = await algod.sendRawTransaction(validSigned[0]).do()
  await algosdk.waitForConfirmation(algod, txId, 8)
  return txId
}

export async function disableTemptationLock(signTransactions: SignTransactionsFn, address: string): Promise<string> {
  const sp = await getSuggestedParams()
  const txn = algosdk.makeApplicationNoOpTxnFromObject({
    from: address,
    appIndex: APP_ID,
    appArgs: [SELECTOR_DISABLE_LOCK],
    suggestedParams: sp,
  })
  const signed = await signTransactions([txn.toByte()])
  const validSigned = signed.filter((s): s is Uint8Array => s !== null)
  const algod = getAlgodClient()
  const { txId } = await algod.sendRawTransaction(validSigned[0]).do()
  await algosdk.waitForConfirmation(algod, txId, 8)
  return txId
}

export async function setDreamBoard(signTransactions: SignTransactionsFn, address: string, dreamUri: string, dreamTitle: string): Promise<string> {
  const sp = await getSuggestedParams()
  const txn = algosdk.makeApplicationNoOpTxnFromObject({
    from: address,
    appIndex: APP_ID,
    appArgs: [
      SELECTOR_SET_DREAM,
      encodeByteArrayArg(dreamUri),
      encodeByteArrayArg(dreamTitle),
    ],
    suggestedParams: sp,
  })
  const signed = await signTransactions([txn.toByte()])
  const validSigned = signed.filter((s): s is Uint8Array => s !== null)
  const algod = getAlgodClient()
  const { txId } = await algod.sendRawTransaction(validSigned[0]).do()
  await algosdk.waitForConfirmation(algod, txId, 8)
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
  const algod = getAlgodClient()
  const info = (await algod.accountInformation(address).do()) as any
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
): Promise<Array<{ txId: string; amount: number; type: string; timestamp: number; action: string; loraUrl: string }>> {
  const indexer = getIndexerClient()
  const res = (await indexer.searchForTransactions().address(address).limit(Math.max(30, limit * 3)).do()) as any
  const txns = res?.transactions ?? []
  const byId = new Map<string, any>(txns.map((t: any) => [t?.id, t]))

  const classifyAction = (t: any): string => {
    const type = t?.['tx-type']
    if (type === 'pay' && t?.sender === address && t?.['payment-transaction']?.receiver === getAppAddress()) {
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

  type HistoryItem = { txId: string; amount: number; type: string; timestamp: number; action: string; loraUrl: string }
  const mapped: HistoryItem[] = txns.map((t: any) => {
    const txId = t.id as string
    const amount = t?.['payment-transaction']?.amount ?? 0
    const type = t?.['tx-type'] ?? 'UNKNOWN'
    const timestamp = t?.['round-time'] ?? 0
    const action = classifyAction(t)
    return {
      txId,
      amount,
      type,
      timestamp,
      action,
      loraUrl: getExplorerTransactionUrl(txId),
    }
  })
  return mapped
    .sort((a: HistoryItem, b: HistoryItem) => b.timestamp - a.timestamp)
    .slice(0, limit)
    .filter((item: HistoryItem) => byId.has(item.txId))
}

export async function getRecentDepositsSummary(address: string, count: number = 3): Promise<string> {
  const indexer = getIndexerClient()
  const appAddress = getAppAddress()
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
  const algod = getAlgodClient()
  const info = (await algod.accountInformation(address).do()) as any
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
