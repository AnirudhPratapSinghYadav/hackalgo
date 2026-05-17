import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '@txnlab/use-wallet-react'
import OpsLayout from '../../components/ops/OpsLayout'
import EventDetailDrawer from '../../components/ops/EventDetailDrawer'
import CreateCampaignModal, { type CreateCampaignOptions } from '../../components/ops/CreateCampaignModal'
import type { CampaignOpsMeta } from '../../domain/campaignOpsMeta'
import { TRIGGER_LABELS } from '../../domain/campaignOpsMeta'
import { OpsPanel, DataTable, ConfidenceBar, Button } from '../../components/ui'
import type { DataTableColumn } from '../../components/ui'
import type { DisasterEvent } from '../../domain/platform'
import { useOpsData } from '../../store/opsStore'
import { usePlatformStore } from '../../store/platformStore'
import { useGdacsAutoPoll } from '../../hooks/useGdacsAutoPoll'
import algosdk from 'algosdk'
import {
  createCampaign,
  isDisasterVaultConfigured,
  readVaultAdmin,
  uniqueApprovers,
} from '../../services/disasterVault'
import { getLoraApplicationUrl } from '../../services/humanitarianExplorer'
import { getNetworkConfig } from '../../services/networkConfig'
import { ROUTES } from '../../config/routes'
import { Link } from 'react-router-dom'
import { humanizeContractError } from '../../lib/contractErrorMap'
import { severityDisplayLabel, campaignStatusLabel } from '../../lib/severityLabels'

const ADMIN = (): string => (import.meta.env.VITE_ADMIN_ADDRESS || '').trim()

function adminWalletHint(
  activeAddress: string | undefined,
  signTransactions: unknown,
): 'connect' | 'wrong' | 'ready' | 'no-admin-config' {
  const admin = ADMIN()
  if (!admin) return 'no-admin-config'
  if (!activeAddress || !signTransactions) return 'connect'
  if (activeAddress !== admin) return 'wrong'
  return 'ready'
}

export default function Events() {
  const navigate = useNavigate()
  const { events } = useOpsData()
  const linkCampaign = usePlatformStore((s) => s.linkEventOnChainCampaign)
  const registerCampaignMeta = usePlatformStore((s) => s.registerCampaignMeta)
  const getCampaignMeta = usePlatformStore((s) => s.getCampaignMeta)
  const syncFromChain = usePlatformStore((s) => s.syncEventCampaignFromChain)
  const { activeAddress, signTransactions } = useWallet()
  const { busy: gdacsBusy, lastSyncedLabel, refreshGdacs } = useGdacsAutoPoll()
  const [createBusy, setCreateBusy] = useState<string | null>(null)
  const [modalEvent, setModalEvent] = useState<DisasterEvent | null>(null)
  const [selected, setSelected] = useState<DisasterEvent | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const highSeverityCount = events.filter(
    (e) => e.severity === 'Critical' || e.severity === 'High',
  ).length

  const walletState = adminWalletHint(activeAddress ?? undefined, signTransactions)

  useEffect(() => {
    if (walletState === 'ready') setErr(null)
  }, [walletState])

  const runCreateCampaign = async (event: DisasterEvent, options: CreateCampaignOptions) => {
    if (walletState !== 'ready') return
    if (!activeAddress || !signTransactions) return
    setErr(null)

    const chainAdmin = await readVaultAdmin()
    if (!chainAdmin) {
      setErr('Relief vault admin is not configured on-chain. Run bootstrap before creating campaigns.')
      return
    }
    const admin = ADMIN()
    if (admin && chainAdmin !== admin) {
      setErr('Connected operations wallet does not match the vault administrator.')
      return
    }

    const approvers = uniqueApprovers()
    if (approvers.length === 0) {
      setErr('Approver wallets are not configured.')
      return
    }
    const threshold = Math.min(2, approvers.length)
    const campaignName = `Relief: ${event.location}`.slice(0, 16)

    setCreateBusy(event.id)
    try {
      const { algod } = getNetworkConfig()
      const client = new algosdk.Algodv2(algod.token, algod.server, algod.port)
      const status = await client.status().do()
      const lastRound = Number(status['last-round'])
      const expiryRounds = Number(import.meta.env.VITE_CAMPAIGN_EXPIRY_ROUNDS || 2_000_000)
      const targetMicroUsdc = Number(import.meta.env.VITE_CAMPAIGN_TARGET_MICRO_USDC || 10_000_000)
      const { txId, campaignId } = await createCampaign(activeAddress, signTransactions, {
        name: campaignName,
        targetMicroUsdc,
        region: event.location.slice(0, 8),
        approvers,
        threshold,
        expiryRound: lastRound + expiryRounds,
      })
      linkCampaign(event.id, campaignId, txId)
      const meta: CampaignOpsMeta = {
        eventId: event.id,
        onChainCampaignId: campaignId,
        name: campaignName,
        region: event.location.slice(0, 32),
        kind: options.kind,
        triggerParameter: options.triggerParameter,
        triggerThreshold: options.triggerThreshold,
        currentTriggerValue: 0,
        autoTriggered: false,
        monitoringStatus:
          options.kind === 'anticipatory' && options.triggerParameter && options.triggerThreshold != null
            ? `Monitoring — will auto-disburse if ${TRIGGER_LABELS[options.triggerParameter].toLowerCase()} exceeds ${options.triggerThreshold}`
            : undefined,
        createdAt: new Date().toISOString(),
      }
      registerCampaignMeta(meta)
      await syncFromChain(event.id, campaignId)
      setModalEvent(null)
      setSelected((s) =>
        s?.id === event.id
          ? { ...s, onChainCampaignId: campaignId, opsStatus: 'approval_pending', onChainStatus: 1 }
          : s,
      )
      navigate(`${ROUTES.operationsVerification}?campaign=${campaignId}`)
    } catch (e) {
      setErr(humanizeContractError(e))
    } finally {
      setCreateBusy(null)
    }
  }

  const columns: DataTableColumn<DisasterEvent>[] = [
    { key: 'id', header: 'Event ID', render: (e) => <span className="font-mono text-xs">{e.id}</span> },
    { key: 'loc', header: 'Location', render: (e) => e.location },
    { key: 'type', header: 'Type', render: (e) => e.type },
    {
      key: 'sev',
      header: 'Severity',
      render: (e) => (
        <span className="text-xs text-text-primary">{severityDisplayLabel(e.severity)}</span>
      ),
    },
    { key: 'conf', header: 'Confidence', render: (e) => <ConfidenceBar value={e.confidence} /> },
    {
      key: 'status',
      header: 'Workflow',
      render: (e) => {
        const meta = e.onChainCampaignId ? getCampaignMeta(e.onChainCampaignId) : undefined
        return (
          <span className="text-xs text-text-secondary">
            {meta?.kind === 'anticipatory' ? '⚡ ' : ''}
            {e.onChainCampaignId
              ? e.onChainStatus != null
                ? campaignStatusLabel(e.onChainStatus)
                : 'Campaign linked'
              : 'No campaign'}
          </span>
        )
      },
    },
    {
      key: 'chain',
      header: 'On-chain',
      render: (e) =>
        e.onChainCampaignId ? (
          <span className="font-mono text-xs text-accent-primary">#{e.onChainCampaignId}</span>
        ) : isDisasterVaultConfigured() ? (
          <Button
            variant="outline"
            className="min-h-0 py-1 text-[10px]"
            disabled={createBusy === e.id || walletState !== 'ready'}
            title={
              walletState === 'wrong'
                ? 'Switch to operations wallet to create a campaign'
                : walletState === 'connect'
                  ? 'Connect the operations wallet to create a campaign'
                  : undefined
            }
            onClick={(ev) => {
              ev.stopPropagation()
              void (walletState === 'ready' ? setModalEvent(e) : undefined)
            }}
          >
            {createBusy === e.id ? '…' : 'Create'}
          </Button>
        ) : (
          <span className="text-xs text-text-tertiary">—</span>
        ),
    },
  ]

  const disasterLora = Number(import.meta.env.VITE_DISASTER_APP_ID)
    ? getLoraApplicationUrl(Number(import.meta.env.VITE_DISASTER_APP_ID))
    : null

  return (
    <OpsLayout
      title="Active Events"
      description="Review disaster signals, open incident details, and link each event to a relief campaign."
    >
      <div className="mb-4 flex flex-wrap gap-3 items-center min-w-0">
        <Button variant="primary" disabled={gdacsBusy} onClick={() => void refreshGdacs()}>
          {gdacsBusy ? 'Refreshing…' : 'Refresh events'}
        </Button>
        <span className="text-xs font-mono text-text-tertiary shrink-0">Last synced: {lastSyncedLabel}</span>
        {highSeverityCount > 0 ? (
          <span className="text-xs text-alert-warning font-mono shrink-0">
            {highSeverityCount} high/critical alert{highSeverityCount === 1 ? '' : 's'}
          </span>
        ) : null}
        {disasterLora ? (
          <a
            href={disasterLora}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-accent-primary shrink-0 whitespace-nowrap"
          >
            Verify on blockchain
          </a>
        ) : null}
        <Link
          to={ROUTES.operationsVerification}
          className="text-sm text-text-secondary hover:text-accent-primary shrink-0 whitespace-nowrap"
        >
          Approvals →
        </Link>
      </div>
      {walletState === 'wrong' ? (
        <p className="text-xs text-text-primary mb-4 border border-alert-warning/40 bg-alert-warning/10 text-alert-warning px-3 py-2 rounded">
          You are connected as a viewer. Connect the operations wallet to create campaigns.
        </p>
      ) : walletState === 'connect' ? (
        <p className="text-xs text-text-secondary mb-4 border border-border-subtle bg-bg-elevated/50 px-3 py-2 rounded">
          Connect the operations wallet in Pera to create relief campaigns.
        </p>
      ) : null}
      {err ? <p className="text-xs text-alert-critical mb-4">{err}</p> : null}
      <OpsPanel title="Incidents" noPadding>
        <DataTable
          columns={columns}
          data={events}
          rowKey={(e) => e.id}
          onRowClick={(e) => setSelected(e)}
        />
      </OpsPanel>
      {modalEvent ? (
        <CreateCampaignModal
          event={modalEvent}
          open
          busy={createBusy === modalEvent.id}
          onClose={() => setModalEvent(null)}
          onConfirm={(opts) => void runCreateCampaign(modalEvent, opts)}
        />
      ) : null}
      <EventDetailDrawer
        event={selected}
        onClose={() => setSelected(null)}
        onCreateCampaign={(ev) => setModalEvent(ev)}
        createBusy={!!createBusy}
        canCreateCampaign={walletState === 'ready'}
        wrongWallet={walletState === 'wrong'}
      />
    </OpsLayout>
  )
}
