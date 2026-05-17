import { Link } from 'react-router-dom'
import { Activity, ArrowRight, Layers, Map, Send, Shield } from 'lucide-react'
import OpsLayout from '../../components/ops/OpsLayout'
import { OpsPanel, MetricCard, StatusBadge, TerminalLog, Button } from '../../components/ui'
import type { TerminalLogEntry } from '../../components/ui/TerminalLog'
import { ROUTES } from '../../config/routes'
import { useOpsData } from '../../store/opsStore'
import { isValidTxnId } from '../../services/txPipeline'
import { getLoraTransactionUrl } from '../../services/humanitarianExplorer'
import { useEffect, useState } from 'react'
import { fetchLedgerProofRecords } from '../../services/platform/indexerBridge'
import SpeedComparisonTable from '../../components/ops/SpeedComparisonTable'
import AnticipatoryCampaignsPanel from '../../components/ops/AnticipatoryCampaignsPanel'
import { DEMO_CORE_FOCUS } from '../../config/demoFocus'

const STRICT = import.meta.env.VITE_DEMO_STRICT === 'true'

const CORE_QUICK_ACTIONS = [
  { to: ROUTES.operationsEvents, label: 'Active Events', desc: 'GDACS signals & campaigns', icon: Activity },
  { to: ROUTES.operationsVerification, label: 'Approvals', desc: 'Two approvers sign in Pera', icon: Shield },
  { to: ROUTES.operationsDisbursements, label: 'Release & proof', desc: 'Bulk USDC to wallets', icon: Send },
  { to: ROUTES.operationsMap, label: 'Incident Map', desc: 'Geographic incident view', icon: Map },
] as const

const APPEALS_ACTION = {
  to: ROUTES.operationsCommunityQueue,
  label: 'Appeals',
  desc: 'Community crisis queue',
  icon: Layers,
} as const

export default function CommandCenter() {
  const quickActions = DEMO_CORE_FOCUS
    ? CORE_QUICK_ACTIONS
    : [...CORE_QUICK_ACTIONS.slice(0, 2), APPEALS_ACTION, ...CORE_QUICK_ACTIONS.slice(2)]
  const { events, disbursements, campaigns } = useOpsData()
  const pendingApprovals = events.filter((e) => e.opsStatus === 'approval_pending').length
  const [recentTx, setRecentTx] = useState<TerminalLogEntry[]>([])

  const totalDisbursed = disbursements
    .filter((d) => d.status === 'confirmed' && (!STRICT || isValidTxnId(d.txnHash)))
    .reduce((s, d) => s + d.amount, 0)
  const pendingGdacs = events.filter((e) => e.opsStatus === 'detected').length
  const onChainCampaigns = events.filter((e) => e.onChainCampaignId).length
  const activeCampaigns = campaigns.filter((c) => c.status === 'active').length

  useEffect(() => {
    void fetchLedgerProofRecords(8).then(({ records }) => {
      setRecentTx(
        records.map((t) => ({
          id: t.id,
          timestamp: new Date(t.timestamp).toISOString().slice(11, 19) + ' UTC',
          level: 'success' as const,
          message: `${t.appLabel} · ${t.sender.slice(0, 8)}…`,
          meta: 'Chain',
        })),
      )
    })
  }, [])

  const pipelineLog: TerminalLogEntry[] = disbursements
    .filter((d) => !STRICT || isValidTxnId(d.txnHash))
    .slice(0, 6)
    .map((d) => ({
      id: d.txnHash,
      timestamp: new Date(d.timestamp).toISOString().slice(11, 19) + ' UTC',
      level: d.status === 'confirmed' ? 'success' : 'warn',
      message: `${d.amount.toLocaleString()} USDC → ${d.destination}`,
      meta: d.txnHash,
    }))

  return (
    <OpsLayout
      title="Overview"
      description="GDACS detection → dual approval → USDC release — all verifiable on Algorand testnet."
    >
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <MetricCard label="USDC disbursed (confirmed)" value={totalDisbursed.toLocaleString()} variant="accent" />
        <MetricCard label="Active campaigns" value={String(activeCampaigns)} />
        <MetricCard label="Signals awaiting campaign" value={String(pendingGdacs)} />
        <MetricCard label="Awaiting approver signatures" value={String(pendingApprovals)} />
      </section>

      {!DEMO_CORE_FOCUS ? <AnticipatoryCampaignsPanel /> : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 mb-8">
        <OpsPanel title="Workflow" className="lg:col-span-2">
          <div className="grid gap-3 sm:grid-cols-2">
            {quickActions.map(({ to, label, desc, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className="group flex items-start gap-3 border border-border-subtle bg-bg-elevated p-4 transition-colors hover:border-accent-primary"
              >
                <Icon className="mt-0.5 h-5 w-5 shrink-0 text-accent-primary" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text-primary group-hover:text-accent-primary">{label}</p>
                  <p className="mt-0.5 text-xs text-text-tertiary">{desc}</p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-text-tertiary group-hover:text-accent-primary" />
              </Link>
            ))}
          </div>
        </OpsPanel>

        <OpsPanel title="Pipeline snapshot">
          <p className="mb-3 text-xs text-text-secondary">
            On-chain campaigns linked: <strong>{onChainCampaigns}</strong> / {events.length} events
          </p>
          <StatusBadge variant={pendingGdacs > 0 ? 'attention' : 'operational'}>
            {pendingGdacs > 0 ? `${pendingGdacs} events need campaign` : 'All events linked or idle'}
          </StatusBadge>
          <Link to={ROUTES.operationsEvents} className="mt-4 inline-block w-full">
            <Button variant="primary" className="w-full text-xs">
              Open event registry
            </Button>
          </Link>
        </OpsPanel>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <OpsPanel title="Recent on-chain activity">
          <TerminalLog
            entries={
              recentTx.length > 0
                ? recentTx
                : [{ id: 'none', timestamp: '—', level: 'info', message: 'No blockchain transactions yet' }]
            }
            maxHeight="max-h-48"
          />
          {(() => {
            const latestId = recentTx[0]?.id
            if (!latestId || latestId === 'none') return null
            return (
              <a
                href={getLoraTransactionUrl(latestId)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block text-xs text-accent-primary"
              >
                Verify latest on blockchain →
              </a>
            )
          })()}
        </OpsPanel>
        <OpsPanel title="Disbursement log">
          <TerminalLog
            entries={
              pipelineLog.length
                ? pipelineLog
                : [{ id: '—', timestamp: '—', level: 'info', message: 'No disbursements yet' }]
            }
            maxHeight="max-h-48"
          />
          <Link to={ROUTES.operationsDisbursements} className="mt-3 inline-block text-xs text-accent-primary">
            Manage disbursements →
          </Link>
        </OpsPanel>
      </div>

      <SpeedComparisonTable />
    </OpsLayout>
  )
}
