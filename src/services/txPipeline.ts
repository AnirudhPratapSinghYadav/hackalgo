import algosdk from 'algosdk'
import type { SignTransactionsFn } from './algorand'
import { getExplorerTransactionUrl } from './algorand'
import { getNetworkConfig } from './networkConfig'

export interface ConfirmedTx {
  txId: string
  explorerUrl: string
  round: number
}

function getAlgod(): algosdk.Algodv2 {
  const { algod } = getNetworkConfig()
  return new algosdk.Algodv2(algod.token, algod.server, algod.port)
}

export function makeSigner(signTransactions: SignTransactionsFn): algosdk.TransactionSigner {
  return async (txnGroup, indexesToSign) => {
    const toSign = indexesToSign.map((i) => algosdk.encodeUnsignedTransaction(txnGroup[i]))
    const signed = await signTransactions(toSign)
    return indexesToSign.map((_, j) => {
      const bytes = signed[j]
      if (!bytes) throw new Error('Wallet did not sign the transaction')
      return bytes
    })
  }
}

export function isValidTxnId(id: string): boolean {
  return /^[A-Z2-7]{52}$/.test(id)
}

export function friendlyTxError(e: unknown): string {
  if (e instanceof Error) {
    const m = e.message
    if (/overspend|underflow|balance/.test(m)) return 'Transaction failed: insufficient balance'
    if (/rejected|cancel/i.test(m)) return 'Transaction failed: wallet rejected signing'
    if (/logic eval|assert/i.test(m))
      return 'Transaction failed: smart contract rejected this action. Common causes: vault not initialized on testnet, wrong signing wallet (admin required), or missing USDC opt-in on the app account.'
    return `Transaction failed: ${m}`
  }
  return 'Transaction failed: unknown error'
}

export async function executeAtcAndConfirm(
  atc: algosdk.AtomicTransactionComposer,
  waitRounds = 4,
): Promise<ConfirmedTx & { methodResults: algosdk.ABIResult[] }> {
  const algod = getAlgod()
  try {
    const result = await atc.execute(algod, waitRounds)
    const txId = result.txIDs[0]
    if (!txId || !isValidTxnId(txId)) throw new Error('No valid transaction ID returned')
    const pending = await algod.pendingTransactionInformation(txId).do()
    const round = Number(pending['confirmed-round'] ?? 0)
    return {
      txId,
      explorerUrl: getExplorerTransactionUrl(txId),
      round,
      methodResults: result.methodResults ?? [],
    }
  } catch (e) {
    throw new Error(friendlyTxError(e))
  }
}

export async function waitForTxn(txId: string): Promise<ConfirmedTx> {
  const algod = getAlgod()
  const info = await algosdk.waitForConfirmation(algod, txId, 4)
  return {
    txId,
    explorerUrl: getExplorerTransactionUrl(txId),
    round: info['confirmed-round'] ?? 0,
  }
}
