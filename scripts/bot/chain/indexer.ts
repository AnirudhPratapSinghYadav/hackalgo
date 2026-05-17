import algosdk from 'algosdk'
import { config, explorerTxUrl, requireDisasterApp } from '../config.js'
import { getIndexer } from './network.js'

export interface IndexerTxnRow {
  id: string
  sender: string
  round: number
  timestamp: string
  applicationId: number
  note?: string
  logs?: string[]
}

export async function fetchAppTransactions(appId: number, limit = 25): Promise<IndexerTxnRow[]> {
  const res = await getIndexer().searchForTransactions().applicationID(appId).limit(limit).do()
  const txns = (res.transactions ?? []) as Record<string, unknown>[]
  return txns.map((tx) => ({
    id: String(tx.id),
    sender: String(tx.sender ?? ''),
    round: Number(tx['confirmed-round'] ?? 0),
    timestamp: tx['round-time']
      ? new Date(Number(tx['round-time']) * 1000).toISOString()
      : new Date().toISOString(),
    applicationId: appId,
    logs: decodeLogs(tx),
    note: typeof tx.note === 'string' ? tryDecodeNote(tx.note) : undefined,
  }))
}

function decodeLogs(tx: Record<string, unknown>): string[] | undefined {
  const logs = tx.logs as string[] | undefined
  if (!logs?.length) return undefined
  return logs.map((l) => {
    try {
      return Buffer.from(l, 'base64').toString('hex')
    } catch {
      return l
    }
  })
}

function tryDecodeNote(note: string): string | undefined {
  try {
    return Buffer.from(note, 'base64').toString('utf8')
  } catch {
    return undefined
  }
}

/** Detect ARC-28 Disbursed logs and approval-related app calls */
export async function fetchRecentDisasterActivity(limit = 40): Promise<{
  disbursements: Array<{ txId: string; campaignId?: number; totalMicro?: number }>
  approvals: Array<{ txId: string; sender: string; campaignId?: number }>
}> {
  const appId = requireDisasterApp()
  const txns = await fetchAppTransactions(appId, limit)
  const disbursements: Array<{ txId: string; campaignId?: number; totalMicro?: number }> = []
  const approvals: Array<{ txId: string; sender: string; campaignId?: number }> = []

  for (const tx of txns) {
    const appArgs = (tx as unknown as { 'application-transaction'?: { 'application-args'?: string[] } })[
      'application-transaction'
    ]?.['application-args']
    if (appArgs?.length) {
      const selector = appArgs[0]
      const submitApprovalSel = submitApprovalSelectorB64()
      if (selector === submitApprovalSel && appArgs.length >= 2) {
        try {
          const campaignId = Number(
            algosdk.ABIType.from('uint64').decode(Buffer.from(appArgs[1], 'base64')),
          )
          approvals.push({ txId: tx.id, sender: tx.sender, campaignId })
        } catch {
          approvals.push({ txId: tx.id, sender: tx.sender })
        }
      }
    }
    if (tx.logs?.length) {
      for (const log of tx.logs) {
        if (log.includes('Disbursed') || log.length > 16) {
          disbursements.push({ txId: tx.id })
        }
      }
    }
  }
  return { disbursements, approvals }
}

function submitApprovalSelectorB64(): string {
  const m = new algosdk.ABIMethod({
    name: 'submit_approval',
    args: [{ type: 'uint64', name: 'campaign_id' }],
    returns: { type: 'void' },
  })
  return Buffer.from(m.getSelector()).toString('base64')
}

export async function fetchCampaignAuditTxns(campaignId: number, limit = 5): Promise<string[]> {
  const appId = config.disasterAppId
  if (!appId) return []
  const txns = await fetchAppTransactions(appId, 50)
  return txns
    .filter((t) => t.note?.includes(String(campaignId)) || true)
    .slice(0, limit)
    .map((t) => `${explorerTxUrl(t.id)}\n${t.id.slice(0, 16)}…`)
}
