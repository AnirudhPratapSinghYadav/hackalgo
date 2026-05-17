import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useWallet } from '@txnlab/use-wallet-react'
import OpsLayout from '../../components/ops/OpsLayout'
import { OpsPanel, StatusBadge, Button } from '../../components/ui'
import { ROUTES } from '../../config/routes'
import { usePlatformStore } from '../../store/platformStore'
import {
  submitCampaignApproval,
  isDisasterVaultConfigured,
  readCampaignState,
  getDisasterExplorerAppUrl,
  uniqueApprovers,
} from '../../services/disasterVault'
import { getLoraTransactionUrl } from '../../services/humanitarianExplorer'
import { humanizeContractError } from '../../lib/contractErrorMap'
import { campaignStatusLabel, approvalProgressLabel } from '../../lib/severityLabels'

interface CampaignRow {
  eventId: string
  location: string
  campaignId: number
  chain: Awaited<ReturnType<typeof readCampaignState>> | null
}

export default function Verification() {
  const [searchParams] = useSearchParams()
  const highlightCampaign = searchParams.get('campaign')
  const syncFromChain = usePlatformStore((s) => s.syncEventCampaignFromChain)
  const { activeAddress, signTransactions } = useWallet()
  const [rows, setRows] = useState<CampaignRow[]>([])
  const [txByEvent, setTxByEvent] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const approverSet = new Set(uniqueApprovers().map((a) => a.toLowerCase()))
  const walletIsApprover =
    !!activeAddress && (approverSet.size === 0 || approverSet.has(activeAddress.toLowerCase()))

  const load = useCallback(async () => {
    if (!isDisasterVaultConfigured()) {
      setRows([])
      setLoading(false)
      return
    }
    setLoading(true)
    const currentEvents = usePlatformStore.getState().disasterEvents
    const candidates = currentEvents.filter((e) => e.onChainCampaignId != null)
    const loaded: CampaignRow[] = []
    for (const e of candidates) {
      try {
        const chain = await readCampaignState(e.onChainCampaignId!)
        if (chain.status === 1) {
          loaded.push({
            eventId: e.id,
            location: e.location,
            campaignId: e.onChainCampaignId!,
            chain,
          })
        }
      } catch {
        /* skip */
      }
    }
    setRows(loaded)
    setLoading(false)
  }, [])

  const linkedCampaignCount = usePlatformStore(
    (s) => s.disasterEvents.filter((e) => e.onChainCampaignId != null).length,
  )

  useEffect(() => {
    void load()
  }, [load, linkedCampaignCount])

  const handleApprove = async (row: CampaignRow) => {
    if (!activeAddress || !signTransactions) {
      setErr('Connect your Pera wallet to sign this approval.')
      return
    }
    if (!walletIsApprover) {
      setErr('This wallet is not listed as an approver. Use an address from Settings → admin/approvers.')
      return
    }
    setBusy(row.eventId)
    setErr(null)
    try {
      const txId = await submitCampaignApproval(activeAddress, signTransactions, row.campaignId)
      setTxByEvent((m) => ({ ...m, [row.eventId]: txId }))
      await syncFromChain(row.eventId, row.campaignId)
      await load()
    } catch (e) {
      setErr(humanizeContractError(e))
    } finally {
      setBusy(null)
    }
  }

  return (
    <OpsLayout
      title="Approvals"
      description="Each listed approver signs once in Pera. When enough signatures are collected, release relief funds from Release & proof."
    >
      <OpsPanel title="Workflow" className="mb-6">
        <ol className="grid sm:grid-cols-3 gap-4 text-sm">
          <li className="border-l-2 border-accent-primary pl-3">
            <span className="font-mono text-[10px] text-text-tertiary">Step 1</span>
            <p className="text-text-primary mt-1">Create campaign in Active Events</p>
          </li>
          <li className="border-l-2 border-alert-warning pl-3">
            <span className="font-mono text-[10px] text-text-tertiary">Step 2</span>
            <p className="text-text-primary mt-1">Approvers sign here (you are on this step)</p>
          </li>
          <li className="border-l-2 border-border-medium pl-3">
            <span className="font-mono text-[10px] text-text-tertiary">Step 3</span>
            <p className="text-text-primary mt-1">Release USDC in Disbursements</p>
          </li>
        </ol>
      </OpsPanel>

      {!isDisasterVaultConfigured() ? (
        <p className="text-sm text-text-secondary">DisasterVault is not configured. Check Settings.</p>
      ) : loading ? (
        <p className="text-sm text-text-tertiary">Loading campaigns awaiting signatures…</p>
      ) : rows.length === 0 ? (
        <OpsPanel title="Nothing awaiting your signature">
          <p className="text-sm text-text-secondary mb-4">
            Either no campaign exists yet, or all campaigns already have enough approver signatures.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to={ROUTES.operationsEvents}>
              <Button variant="primary">Go to Active Events</Button>
            </Link>
            <Link to={ROUTES.operationsDisbursements}>
              <Button variant="outline">Go to Disbursements</Button>
            </Link>
          </div>
        </OpsPanel>
      ) : (
        <div className="space-y-6">
          {rows.map((row) => (
            <OpsPanel
              key={row.eventId}
              title={`${row.location} — campaign #${row.campaignId}`}
              accent="left"
              action={<StatusBadge variant="attention">Needs signatures</StatusBadge>}
            >
              {highlightCampaign === String(row.campaignId) ? (
                <p className="text-xs text-accent-primary mb-3">Newly created — awaiting your signature</p>
              ) : null}
              {row.chain ? (
                <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mb-4">
                  <div>
                    <dt className="text-xs text-text-tertiary">Signatures</dt>
                    <dd className="text-text-primary">
                      {approvalProgressLabel(row.chain.approvalCount, row.chain.threshold)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-text-tertiary">Raised</dt>
                    <dd className="font-mono text-text-primary">
                      {(row.chain.raised / 1_000_000).toFixed(2)} USDC
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-text-tertiary">Target</dt>
                    <dd className="font-mono text-text-primary">
                      {(row.chain.target / 1_000_000).toFixed(2)} USDC
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-text-tertiary">Status</dt>
                    <dd className="text-accent-primary">{campaignStatusLabel(row.chain.status)}</dd>
                  </div>
                </dl>
              ) : null}
              <div className="flex flex-wrap gap-3 pt-2 border-t border-border-subtle">
                <Button
                  variant="primary"
                  disabled={busy === row.eventId || !activeAddress}
                  onClick={() => void handleApprove(row)}
                >
                  {busy === row.eventId ? 'Waiting for Pera…' : 'Sign approval in Pera'}
                </Button>
                <a
                  href={getDisasterExplorerAppUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center min-h-[44px] px-4 text-sm text-accent-primary"
                >
                  Verify on blockchain
                </a>
              </div>
              {txByEvent[row.eventId] ? (
                <p className="mt-3 text-xs font-mono text-alert-success">
                  Signed:{' '}
                  <a href={getLoraTransactionUrl(txByEvent[row.eventId])} target="_blank" rel="noopener noreferrer">
                    Verify on blockchain →
                  </a>
                </p>
              ) : null}
            </OpsPanel>
          ))}
        </div>
      )}

      {err ? <p className="mt-4 text-xs text-alert-critical font-mono">{err}</p> : null}
      {!activeAddress ? (
        <p className="mt-4 text-xs text-text-tertiary">Connect Pera wallet to sign approvals.</p>
      ) : null}
    </OpsLayout>
  )
}
