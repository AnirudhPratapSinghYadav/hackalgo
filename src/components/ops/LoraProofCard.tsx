import { useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { OpsPanel } from '../ui'
import {
  explainCampaignState,
  explainGlobalState,
  txnHumanSentence,
} from '../../lib/loraHumanReadable'
import { getLoraTransactionUrl } from '../../services/humanitarianExplorer'
import { EXPLORER_TX_LINK } from '../../lib/explorerCopy'

interface LoraProofCardProps {
  title?: string
  bullets?: string[]
  technicalRecord?: unknown
  txnHash?: string
  action?: string
  entityId?: string
  amount?: number
}

export default function LoraProofCard({
  title = 'What this means',
  bullets,
  technicalRecord,
  txnHash,
  action,
  entityId,
  amount,
}: LoraProofCardProps) {
  const [open, setOpen] = useState(false)
  const displayBullets =
    bullets ??
    (action ? [txnHumanSentence(action, entityId, amount)] : technicalRecord ? explainFromRecord(technicalRecord) : [])

  return (
    <OpsPanel title={title} className="mb-4">
      <ul className="list-disc pl-5 space-y-2 text-sm text-text-primary">
        {displayBullets.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      {txnHash && !txnHash.startsWith('SIMULATED') ? (
        <a
          href={getLoraTransactionUrl(txnHash)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 mt-4 text-sm text-accent-primary"
        >
          {EXPLORER_TX_LINK} <ExternalLink className="w-3 h-3" />
        </a>
      ) : null}
      {technicalRecord != null ? (
        <details className="mt-4" open={open} onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
          <summary className="text-xs font-mono text-text-tertiary cursor-pointer select-none">
            Technical record (JSON)
          </summary>
          <pre className="mt-2 p-3 text-[10px] font-mono bg-bg-elevated border border-border-subtle overflow-x-auto text-text-secondary max-h-64">
            {JSON.stringify(technicalRecord, null, 2)}
          </pre>
        </details>
      ) : null}
    </OpsPanel>
  )
}

function explainFromRecord(record: unknown): string[] {
  if (!record || typeof record !== 'object') return ['Record available for verification.']
  const r = record as Record<string, unknown>
  if ('status' in r && ('target' in r || 'raised' in r)) {
    return explainCampaignState({
      target: Number(r.target),
      raised: Number(r.raised),
      approvalCount: Number(r.approvalCount ?? r.approval_count),
      threshold: Number(r.threshold),
      status: Number(r.status),
    })
  }
  return explainGlobalState(r)
}
