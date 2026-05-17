import algosdk from 'algosdk'
import { getNetworkConfig } from '../networkConfig'
import type { AuditEntry, DataProvenance } from '../../domain/platform'

const DISASTER_APP_ID = Number(import.meta.env.VITE_DISASTER_APP_ID) || 0
const APPEALS_APP_ID = Number(import.meta.env.VITE_APPEALS_APP_ID) || 0
const DEMO_STRICT = import.meta.env.VITE_DEMO_STRICT === 'true'

export interface IndexerTxnSummary {
  id: string
  round: number
  timestamp: string
  amount?: number
  sender: string
  note?: string
  applicationId?: number
}

/** Rich indexer row for Payment proof — only real confirmed txns. */
export interface LedgerProofRecord {
  id: string
  round: number
  timestamp: string
  sender: string
  applicationId: number
  appLabel: string
  action: string
  amountDisplay?: string
  explorerPayload: Record<string, unknown>
}

function humanitarianAppIds(): number[] {
  return [DISASTER_APP_ID, APPEALS_APP_ID].filter((id) => id > 0)
}

function appLabel(appId: number): string {
  if (appId === DISASTER_APP_ID) return 'DisasterVault'
  if (appId === APPEALS_APP_ID) return 'Community appeals'
  return `App ${appId}`
}

function parseAppAction(tx: Record<string, unknown>): string {
  const appTx = tx['application-transaction'] as Record<string, unknown> | undefined
  if (!appTx) return 'Application call'
  const logs = (tx.logs as string[] | undefined) ?? []
  for (const log of logs) {
    try {
      const decoded = Buffer.from(log, 'base64').toString('utf8')
      if (decoded.length > 2 && decoded.length < 80) return decoded
    } catch {
      /* skip */
    }
  }
  const inner = tx['inner-txns'] as Record<string, unknown>[] | undefined
  if (inner?.some((t) => t['asset-transfer-transaction'])) return 'Asset transfer (payout/donation)'
  if (inner?.some((t) => t['payment-transaction'])) return 'Payment'
  return 'Contract method call'
}

function buildProofRecord(tx: Record<string, unknown>, appId: number): LedgerProofRecord | null {
  const id = String(tx.id ?? '')
  if (!/^[A-Z2-7]{52}$/.test(id)) return null

  const round = Number(tx['confirmed-round'] ?? 0)
  const roundTime = tx['round-time'] as number | undefined
  const pay = tx['payment-transaction'] as { amount?: number } | undefined
  const axfer = tx['asset-transfer-transaction'] as { amount?: number; 'asset-id'?: number } | undefined

  let amountDisplay: string | undefined
  if (pay?.amount) amountDisplay = `${(pay.amount / 1_000_000).toFixed(4)} ALGO`
  if (axfer?.amount) amountDisplay = `${(axfer.amount / 1_000_000).toFixed(4)} units (ASA ${axfer['asset-id']})`

  const action = parseAppAction(tx)
  const sender = String(tx.sender ?? '')

  const explorerPayload = {
    id,
    round,
    sender,
    applicationId: appId,
    action,
    'application-transaction': tx['application-transaction'],
    'asset-transfer-transaction': tx['asset-transfer-transaction'],
    'payment-transaction': tx['payment-transaction'],
    logs: tx.logs,
    'inner-txns': tx['inner-txns'],
    'global-state-delta': tx['global-state-delta'],
    'local-state-delta': tx['local-state-delta'],
  }

  return {
    id,
    round,
    timestamp: roundTime ? new Date(roundTime * 1000).toISOString() : new Date().toISOString(),
    sender,
    applicationId: appId,
    appLabel: appLabel(appId),
    action,
    amountDisplay,
    explorerPayload,
  }
}

/** Fetch recent confirmed transactions for DisasterVault + Appeals only. */
export async function fetchLedgerProofRecords(limit = 25): Promise<{
  records: LedgerProofRecord[]
  error?: string
}> {
  const appIds = humanitarianAppIds()
  if (appIds.length === 0) {
    return { records: [], error: 'Set VITE_DISASTER_APP_ID and/or VITE_APPEALS_APP_ID' }
  }

  let config
  try {
    config = getNetworkConfig()
  } catch (e) {
    return { records: [], error: e instanceof Error ? e.message : 'Network not configured' }
  }

  const indexerUrl = config.indexer.server
  if (!indexerUrl) return { records: [], error: 'Indexer URL not configured' }

  try {
    const indexer = new algosdk.Indexer('', '', indexerUrl)
    const perApp = Math.max(8, Math.ceil(limit / appIds.length))
    const batches = await Promise.all(
      appIds.map(async (appId) => {
        const res = await indexer.searchForTransactions().applicationID(appId).limit(perApp).do()
        return { appId, transactions: res.transactions ?? [] }
      }),
    )

    const records: LedgerProofRecord[] = []
    for (const { appId, transactions } of batches) {
      for (const tx of transactions as Record<string, unknown>[]) {
        const row = buildProofRecord(tx, appId)
        if (row) records.push(row)
      }
    }

    records.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    return { records: records.slice(0, limit) }
  } catch (e) {
    return { records: [], error: e instanceof Error ? e.message : 'Indexer fetch failed' }
  }
}

/** @deprecated use fetchLedgerProofRecords for ops proof UI */
export async function fetchLedgerTransactions(limit = 20): Promise<{
  txns: IndexerTxnSummary[]
  provenance: DataProvenance
  error?: string
}> {
  const { records, error } = await fetchLedgerProofRecords(limit)
  return {
    txns: records.map((r) => ({
      id: r.id,
      round: r.round,
      timestamp: r.timestamp,
      sender: r.sender,
      applicationId: r.applicationId,
      amount: r.amountDisplay ? parseFloat(r.amountDisplay) : undefined,
    })),
    provenance: 'verified',
    error,
  }
}

export async function fetchAppealsDonationTxns(limit = 30): Promise<{
  txns: IndexerTxnSummary[]
  error?: string
}> {
  if (!APPEALS_APP_ID) return { txns: [], error: 'VITE_APPEALS_APP_ID not set' }
  const { records, error } = await fetchLedgerProofRecords(limit)
  return {
    txns: records
      .filter((r) => r.applicationId === APPEALS_APP_ID)
      .map((r) => ({
        id: r.id,
        round: r.round,
        timestamp: r.timestamp,
        sender: r.sender,
        applicationId: r.applicationId,
      })),
    error,
  }
}

export function isDemoStrict(): boolean {
  return DEMO_STRICT
}

export function indexerTxnsToAuditHints(txns: IndexerTxnSummary[]): Partial<AuditEntry>[] {
  return txns.map((t) => ({
    id: `IDX-${t.id.slice(0, 12)}`,
    layer: 'ledger' as const,
    action: 'on_chain_activity',
    entityType: t.applicationId === DISASTER_APP_ID ? 'DisasterVault' : 'CommunityAppeal',
    entityId: String(t.applicationId ?? t.id),
    actorId: t.sender,
    actorRole: 'admin' as const,
    timestamp: t.timestamp,
    txnHash: t.id,
    dataSource: 'verified' as const,
  }))
}
