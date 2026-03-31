import algosdk, { type Algodv2 } from 'algosdk'

const APP_ID = Number(import.meta.env.VITE_APP_ID)
const APP_ADDRESS = import.meta.env.VITE_APP_ADDRESS

export function getAlgodClient(): Algodv2 {
  return new algosdk.Algodv2(
    import.meta.env.VITE_ALGOD_TOKEN || '',
    import.meta.env.VITE_ALGOD_SERVER,
    Number(import.meta.env.VITE_ALGOD_PORT),
  )
}

export function getIndexerClient(): algosdk.Indexer {
  return new algosdk.Indexer('', import.meta.env.VITE_INDEXER_SERVER, 443)
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

async function getSuggestedParams() {
  const algod = getAlgodClient()
  return await algod.getTransactionParams().do()
}

async function signAndSendGroup(signer: any, txns: algosdk.Transaction[]): Promise<string> {
  const algod = getAlgodClient()
  algosdk.assignGroupID(txns)

  // use-wallet signers typically expose `signTransactions(txns: Uint8Array[])`
  const bytesToSign = txns.map((t) => t.toByte())
  const signed = await signer.signTransactions(bytesToSign)
  const { txId } = await algod.sendRawTransaction(signed).do()
  await algosdk.waitForConfirmation(algod, txId, 4)
  return txId
}

// Opt into vault app
export async function optInToVault(signer: any, address: string): Promise<string> {
  const sp = await getSuggestedParams()
  const txn = algosdk.makeApplicationOptInTxnFromObject({
    from: address,
    appIndex: APP_ID,
    suggestedParams: sp,
  })
  const bytes = [txn.toByte()]
  const signed = await signer.signTransactions(bytes)
  const algod = getAlgodClient()
  const { txId } = await algod.sendRawTransaction(signed[0]).do()
  await algosdk.waitForConfirmation(algod, txId, 4)
  return txId
}

// ATOMIC GROUP: PaymentTxn + AppCallTxn together
export async function depositToVault(signer: any, address: string, amountAlgo: number): Promise<string> {
  if (amountAlgo < 1) throw new Error('Minimum 1 ALGO')
  const sp = await getSuggestedParams()
  const amountMicro = Math.round(amountAlgo * 1_000_000)

  const payTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: address,
    to: APP_ADDRESS,
    amount: amountMicro,
    suggestedParams: sp,
  })

  const appCallTxn = algosdk.makeApplicationNoOpTxnFromObject({
    from: address,
    appIndex: APP_ID,
    appArgs: [new TextEncoder().encode('deposit')],
    suggestedParams: sp,
  })

  return await signAndSendGroup(signer, [payTxn, appCallTxn])
}

// Withdraw from vault
export async function withdrawFromVault(signer: any, address: string, amountAlgo: number): Promise<string> {
  const sp = await getSuggestedParams()
  const amountMicro = Math.round(amountAlgo * 1_000_000)

  const appCallTxn = algosdk.makeApplicationNoOpTxnFromObject({
    from: address,
    appIndex: APP_ID,
    appArgs: [
      new TextEncoder().encode('withdraw'),
      algosdk.encodeUint64(amountMicro),
    ],
    suggestedParams: sp,
  })

  const bytes = [appCallTxn.toByte()]
  const signed = await signer.signTransactions(bytes)
  const algod = getAlgodClient()
  const { txId } = await algod.sendRawTransaction(signed[0]).do()
  await algosdk.waitForConfirmation(algod, txId, 4)
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
  const info = (await algod.accountInformation(address).do()) as any
  const local = (info['apps-local-state'] ?? []).find((a: any) => a.id === APP_ID)
  const kv = local?.['key-value'] ?? []

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

// Claim badge NFT
export async function claimBadge(signer: any, address: string, level: number): Promise<string> {
  const sp = await getSuggestedParams()
  const appCallTxn = algosdk.makeApplicationNoOpTxnFromObject({
    from: address,
    appIndex: APP_ID,
    appArgs: [
      new TextEncoder().encode('claim_badge'),
      algosdk.encodeUint64(level),
    ],
    suggestedParams: sp,
  })
  const bytes = [appCallTxn.toByte()]
  const signed = await signer.signTransactions(bytes)
  const algod = getAlgodClient()
  const { txId } = await algod.sendRawTransaction(signed[0]).do()
  await algosdk.waitForConfirmation(algod, txId, 4)
  return txId
}

// Get transaction history from indexer
export async function getTransactionHistory(
  address: string,
  limit: number = 10,
): Promise<Array<{ txId: string; amount: number; type: string; timestamp: number; loraUrl: string }>> {
  const indexer = getIndexerClient()
  const res = (await indexer.searchForTransactions().address(address).limit(limit).do()) as any
  const txns = res?.transactions ?? []
  return txns.map((t: any) => {
    const txId = t.id as string
    const amount = t?.['payment-transaction']?.amount ?? 0
    const type = t?.['tx-type'] ?? 'UNKNOWN'
    const timestamp = t?.['round-time'] ?? 0
    return {
      txId,
      amount,
      type,
      timestamp,
      loraUrl: `https://lora.algokit.io/testnet/transaction/${txId}`,
    }
  })
}

// Check if user opted in
export async function isOptedIn(address: string): Promise<boolean> {
  const algod = getAlgodClient()
  const info = (await algod.accountInformation(address).do()) as any
  const local = info?.['apps-local-state'] ?? []
  return local.some((a: any) => a.id === APP_ID)
}
