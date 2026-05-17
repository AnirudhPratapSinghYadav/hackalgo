import { Fragment, useState } from 'react'
import { ExternalLink } from 'lucide-react'
import type { LedgerProofRecord } from '../../services/platform/indexerBridge'
import { getLoraTransactionUrl } from '../../services/humanitarianExplorer'
import { txnHumanSentence } from '../../lib/loraHumanReadable'
import { truncateAddress } from '../../lib/format'
import { EXPLORER_PROOF_COLUMN } from '../../lib/explorerCopy'

interface Props {
  records: LedgerProofRecord[]
  emptyMessage?: string
}

export default function LedgerProofTable({ records, emptyMessage }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null)

  if (records.length === 0) {
    return (
      <p className="py-8 text-center text-text-tertiary text-xs">
        {emptyMessage ?? 'No confirmed on-chain transactions yet.'}
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border-medium font-mono text-[10px] uppercase text-text-tertiary">
            <th className="py-2 pr-4">Time (UTC)</th>
            <th className="py-2 pr-4">What happened</th>
            <th className="py-2 pr-4">App</th>
            <th className="py-2 pr-4">Signer</th>
            <th className="py-2">{EXPLORER_PROOF_COLUMN}</th>
          </tr>
        </thead>
        <tbody>
          {records.map((r) => (
            <Fragment key={r.id}>
              <tr className="border-b border-border-subtle hover:bg-bg-elevated/40">
                <td className="py-3 pr-4 font-mono text-[11px] text-text-tertiary whitespace-nowrap">
                  {new Date(r.timestamp).toISOString().slice(0, 19).replace('T', ' ')}
                </td>
                <td className="py-3 pr-4 text-text-primary">
                  {txnHumanSentence(r.action, r.appLabel, undefined)}
                  {r.amountDisplay ? (
                    <span className="block text-xs text-text-tertiary mt-0.5">{r.amountDisplay}</span>
                  ) : null}
                </td>
                <td className="py-3 pr-4 text-xs text-text-secondary">{r.appLabel}</td>
                <td className="py-3 pr-4 font-mono text-[10px] text-text-tertiary">
                  {truncateAddress(r.sender, 6, 4)}
                </td>
                <td className="py-3">
                  <button
                    type="button"
                    className="text-xs text-accent-primary mr-3"
                    onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                  >
                    {expanded === r.id ? 'Hide JSON' : 'JSON'}
                  </button>
                  <a
                    href={getLoraTransactionUrl(r.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-accent-primary"
                  >
                    Open <ExternalLink className="w-3 h-3" />
                  </a>
                </td>
              </tr>
              {expanded === r.id ? (
                <tr>
                  <td colSpan={5} className="pb-4">
                    <pre className="p-3 text-[10px] font-mono bg-bg-elevated border border-border-subtle overflow-x-auto text-text-secondary max-h-48">
                      {JSON.stringify(r.explorerPayload, null, 2)}
                    </pre>
                  </td>
                </tr>
              ) : null}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}
