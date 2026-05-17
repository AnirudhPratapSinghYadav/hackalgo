import { useEffect, useMemo } from 'react'
import { ExternalLink } from 'lucide-react'
import OpsLayout from '../../components/ops/OpsLayout'
import ComplianceBanner from '../../components/ComplianceBanner'
import { OpsPanel, StatusBadge } from '../../components/ui'
import DataProvenanceBanner from '../../components/platform/DataProvenanceBanner'
import { getLoraApplicationUrl, getLoraTransactionUrl } from '../../services/humanitarianExplorer'
import {
  fetchLedgerTransactions,
  indexerTxnsToAuditHints,
  isDemoStrict,
} from '../../services/platform/indexerBridge'
import { getDisasterExplorerAppUrl, isDisasterVaultConfigured } from '../../services/disasterVault'
import { usePlatformStore } from '../../store/platformStore'
import { useOpsData } from '../../store/opsStore'
import type { AuditEntry } from '../../domain/platform'

const DISASTER_APP_ID = String(import.meta.env.VITE_DISASTER_APP_ID || '')
const APPEALS_APP_ID = String(import.meta.env.VITE_APPEALS_APP_ID || '')

const LAYER_LABEL: Record<AuditEntry['layer'], string> = {
  ledger: 'On-chain',
  operations: 'Operations',
  community: 'Community',
}

function layerVariant(layer: AuditEntry['layer']): 'operational' | 'attention' | 'pending' {
  if (layer === 'ledger') return 'operational'
  if (layer === 'operations') return 'attention'
  return 'pending'
}

export default function Audit() {
  const { auditEntries, platformDataMode } = useOpsData()
  const mergeLedgerAuditHints = usePlatformStore((s) => s.mergeLedgerAuditHints)
  const setLedgerFetchError = usePlatformStore((s) => s.setLedgerFetchError)
  const ledgerFetchError = usePlatformStore((s) => s.ledgerFetchError)
  const strict = isDemoStrict()

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const { txns, provenance, error } = await fetchLedgerTransactions(25)
      if (cancelled) return
      if (error) setLedgerFetchError(error)
      if (txns.length > 0) {
        const hints = indexerTxnsToAuditHints(txns).map(
          (h) =>
            ({
              ...h,
              id: h.id!,
              timestamp: h.timestamp!,
              dataSource: provenance,
            }) as AuditEntry,
        )
        mergeLedgerAuditHints(hints)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [mergeLedgerAuditHints, setLedgerFetchError])

  const filtered = useMemo(() => {
    const list = auditEntries.slice(0, 50)
    if (!strict) return list
    return list.filter((a) => a.dataSource === 'live' || (a.txnHash && !a.txnHash.startsWith('SIMULATED')))
  }, [auditEntries, strict])

  return (
    <OpsLayout
      title="Audit trail"
      description="Every row is attributable: what happened, which entity, and a blockchain proof link when recorded on Algorand."
    >
      <ComplianceBanner />
      <DataProvenanceBanner provenance={platformDataMode} className="mb-6" />

      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <OpsPanel title="Layers">
          <ul className="text-xs text-text-secondary space-y-2">
            <li>
              <strong className="text-accent-primary">Ledger</strong> — confirmed app calls &amp; transfers (blockchain)
            </li>
            <li>
              <strong className="text-text-primary">Operations</strong> — campaigns, approvals, disburse batches
            </li>
            <li>
              <strong className="text-text-primary">Community</strong> — appeals, votes, donations
            </li>
          </ul>
        </OpsPanel>
        {DISASTER_APP_ID ? (
          <OpsPanel title="DisasterVault">
            <p className="font-mono text-sm break-all text-text-primary">{DISASTER_APP_ID}</p>
            <a
              href={isDisasterVaultConfigured() ? getDisasterExplorerAppUrl() : getLoraApplicationUrl(Number(DISASTER_APP_ID))}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-3 text-sm text-accent-primary"
            >
              Verify on blockchain <ExternalLink className="w-3 h-3" />
            </a>
          </OpsPanel>
        ) : null}
        {APPEALS_APP_ID ? (
          <OpsPanel title="CommunityDonationHub">
            <p className="font-mono text-sm break-all text-text-primary">{APPEALS_APP_ID}</p>
            <a
              href={getLoraApplicationUrl(Number(APPEALS_APP_ID))}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-3 text-sm text-accent-primary"
            >
              Verify on blockchain <ExternalLink className="w-3 h-3" />
            </a>
          </OpsPanel>
        ) : null}
      </div>

      {ledgerFetchError ? <p className="text-xs text-alert-warning font-mono mb-4">Network: {ledgerFetchError}</p> : null}

      <OpsPanel title="Unified audit log">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border-medium font-mono text-[10px] uppercase text-text-tertiary">
                <th className="py-2 pr-4">Time (UTC)</th>
                <th className="py-2 pr-4">Layer</th>
                <th className="py-2 pr-4">Action</th>
                <th className="py-2 pr-4">Entity</th>
                <th className="py-2 pr-4">Source</th>
                <th className="py-2">Verify</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-text-tertiary font-mono text-xs">
                    No audit entries yet — perform an on-chain action or refresh after blockchain sync.
                  </td>
                </tr>
              ) : (
                filtered.map((a) => (
                  <tr key={a.id} className="border-b border-border-subtle hover:bg-bg-elevated/50">
                    <td className="py-3 pr-4 font-mono text-[11px] text-text-tertiary whitespace-nowrap">
                      {new Date(a.timestamp).toISOString().slice(0, 19).replace('T', ' ')}
                    </td>
                    <td className="py-3 pr-4">
                      <StatusBadge variant={layerVariant(a.layer)}>{LAYER_LABEL[a.layer]}</StatusBadge>
                    </td>
                    <td className="py-3 pr-4 text-text-primary">{a.action}</td>
                    <td className="py-3 pr-4 font-mono text-xs text-text-secondary">
                      {a.entityType}
                      <span className="text-text-tertiary"> · {a.entityId}</span>
                    </td>
                    <td className="py-3 pr-4 text-xs text-text-tertiary">{a.dataSource}</td>
                    <td className="py-3">
                      {a.txnHash && !a.txnHash.startsWith('SIMULATED') ? (
                        <a
                          href={getLoraTransactionUrl(a.txnHash)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-accent-primary"
                        >
                          Verify <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-text-tertiary text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </OpsPanel>
    </OpsLayout>
  )
}
