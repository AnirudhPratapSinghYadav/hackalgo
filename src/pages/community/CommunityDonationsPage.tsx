import { useEffect, useState } from 'react'
import ComplianceBanner from '../../components/ComplianceBanner'
import {
  fetchAppealsDonationTxns,
  isDemoStrict,
  type IndexerTxnSummary,
} from '../../services/platform/indexerBridge'
import { getExplorerTransactionUrl } from '../../services/communityDonation'

export default function CommunityDonationsPage() {
  const [txns, setTxns] = useState<IndexerTxnSummary[]>([])
  const [err, setErr] = useState<string | null>(null)
  const strict = isDemoStrict()

  useEffect(() => {
    void (async () => {
      const { txns: rows, error } = await fetchAppealsDonationTxns(40)
      setTxns(rows)
      setErr(error ?? null)
    })()
  }, [])

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 pb-16">
      <ComplianceBanner />
      <p className="text-sm text-text-secondary mb-6 mt-6">
        On-chain donations for verified community appeals (VITE_APPEALS_APP_ID).{' '}
        {strict ? 'Seed donations hidden in strict demo mode.' : ''}
      </p>
      {err ? <p className="text-xs text-text-tertiary font-mono mb-4">{err}</p> : null}
      <div className="border border-border-subtle overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-subtle bg-bg-surface text-left font-mono text-[10px] uppercase text-text-tertiary">
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">ALGO</th>
              <th className="px-4 py-3">Sender</th>
              <th className="px-4 py-3">Txn</th>
            </tr>
          </thead>
          <tbody>
            {txns.map((t) => (
              <tr key={t.id} className="border-b border-border-subtle/50">
                <td className="px-4 py-3 font-mono text-xs text-text-tertiary">
                  {new Date(t.timestamp).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-text-primary">{t.amount?.toFixed(4) ?? '—'}</td>
                <td className="px-4 py-3 font-mono text-xs text-text-secondary">{t.sender.slice(0, 12)}…</td>
                <td className="px-4 py-3">
                  <a
                    href={getExplorerTransactionUrl(t.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs text-accent-primary"
                  >
                    {t.id.slice(0, 16)}…
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {txns.length === 0 ? (
          <p className="p-8 text-center text-xs text-text-tertiary font-mono">No confirmed donations on-chain yet.</p>
        ) : null}
      </div>
    </div>
  )
}
