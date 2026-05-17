import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ExternalLink } from 'lucide-react'
import { useWallet } from '@txnlab/use-wallet-react'
import OpsLayout from '../../components/ops/OpsLayout'
import BeneficiaryImport from './BeneficiaryImport'
import LoraProofCard from '../../components/ops/LoraProofCard'
import LedgerProofTable from '../../components/ops/LedgerProofTable'
import { OpsPanel, TerminalLog, StatusBadge, Button } from '../../components/ui'
import type { TerminalLogEntry } from '../../components/ui/TerminalLog'
import { ROUTES } from '../../config/routes'
import { useOpsData } from '../../store/opsStore'
import { usePlatformStore } from '../../store/platformStore'
import {
  disburseCampaign,
  isDisasterVaultConfigured,
  readCampaignState,
  getDisasterExplorerAppUrl,
} from '../../services/disasterVault'
import { getLoraApplicationUrl, getLoraTransactionUrl } from '../../services/humanitarianExplorer'
import { fetchLedgerProofRecords, type LedgerProofRecord } from '../../services/platform/indexerBridge'
import { explainCampaignState } from '../../lib/loraHumanReadable'
import { humanizeContractError } from '../../lib/contractErrorMap'
import { campaignStatusLabel } from '../../lib/severityLabels'

const DISASTER_APP_ID = Number(import.meta.env.VITE_DISASTER_APP_ID || 0)
const APPEALS_APP_ID = Number(import.meta.env.VITE_APPEALS_APP_ID || 0)

type Tab = 'release' | 'proof'

export default function Disbursements() {
  const [searchParams] = useSearchParams()
  const initialTab = searchParams.get('tab') === 'proof' ? 'proof' : 'release'
  const [tab, setTab] = useState<Tab>(initialTab)
  const { disbursements, batches, events } = useOpsData()
  const pending = usePlatformStore((s) => s.pendingBeneficiaryPayouts)
  const confirmFromChain = usePlatformStore((s) => s.confirmDisbursementFromChain)
  const queueDisbursement = usePlatformStore((s) => s.queueDisbursement)
  const { activeAddress, signTransactions } = useWallet()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [proofRecords, setProofRecords] = useState<LedgerProofRecord[]>([])
  const [proofError, setProofError] = useState<string | null>(null)
  const [lastPayoutLines, setLastPayoutLines] = useState<
    { name: string; deliveryType: string; identifier: string; amountUsdc: number; status: string }[]
  >([])

  const campaigns = useMemo(() => events.filter((e) => e.onChainCampaignId != null), [events])
  const [selectedEventId, setSelectedEventId] = useState<string>('')
  const selected = campaigns.find((e) => e.id === selectedEventId) ?? campaigns[0]
  const campaignId = selected?.onChainCampaignId

  const [chainState, setChainState] = useState<{
    target: number
    raised: number
    approvalCount: number
    threshold: number
    status: number
  } | null>(null)

  useEffect(() => {
    if (!campaignId || !isDisasterVaultConfigured()) {
      setChainState(null)
      return
    }
    void readCampaignState(campaignId)
      .then(setChainState)
      .catch(() => setChainState(null))
  }, [campaignId])

  useEffect(() => {
    if (campaigns.length === 0) {
      if (selectedEventId) setSelectedEventId('')
      return
    }
    const valid = campaigns.some((c) => c.id === selectedEventId)
    if (!valid) setSelectedEventId(campaigns[0].id)
  }, [campaigns, selectedEventId])

  const refreshProof = async () => {
    setRefreshing(true)
    const { records, error } = await fetchLedgerProofRecords(30)
    setProofRecords(records)
    setProofError(error ?? null)
    setRefreshing(false)
  }

  useEffect(() => {
    if (tab === 'proof') void refreshProof()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  const confirmed = disbursements.filter((d) => d.status === 'confirmed').length
  const pendingTx = disbursements.filter((d) => d.status === 'pending').length
  const queued = batches.filter((b) => b.status === 'queued').length
  const canDisburse = chainState?.status === 2
  const walletPending = pending.filter((r) => r.deliveryType === 'wallet')
  const totalMicro = walletPending.reduce((s, r) => s + r.amountMicroUsdc, 0)

  const logEntries: TerminalLogEntry[] = disbursements.map((d) => ({
    id: d.txnHash,
    timestamp: new Date(d.timestamp).toISOString().replace('T', ' ').slice(0, 19),
    level: d.status === 'confirmed' ? 'success' : d.status === 'pending' ? 'warn' : 'info',
    message: `${d.amount.toLocaleString()} USDC → ${d.destination}`,
    meta: d.txnHash.length > 16 ? `${d.txnHash.slice(0, 16)}…` : d.txnHash,
  }))

  const handleDisburse = async () => {
    if (!activeAddress || !signTransactions || !campaignId || !selected) {
      setErr('Connect Pera wallet and select a campaign')
      return
    }
    if (pending.length === 0) {
      setErr('Import beneficiaries below (CSV: name, delivery_type, identifier, amount_usdc)')
      return
    }
    if (walletPending.length === 0) {
      setErr('No wallet rows to disburse on-chain. Add at least one delivery_type=wallet row.')
      return
    }
    if (!canDisburse) {
      setErr(
        `Campaign must be approved on-chain (${chainState ? campaignStatusLabel(chainState.status) : 'unknown'}). Collect signatures in Approvals first.`,
      )
      return
    }
    if (chainState && totalMicro > chainState.raised) {
      setErr(`Total exceeds raised balance on contract`)
      return
    }

    setBusy(true)
    setErr(null)
    try {
      queueDisbursement({
        eventId: selected.id,
        amount: totalMicro / 1_000_000,
        beneficiaryCount: pending.length,
        approverId: activeAddress,
      })
      const batchId = usePlatformStore.getState().disbursementBatches[0]?.id
      if (!batchId) throw new Error('Failed to queue batch')

      const txId = await disburseCampaign(
        activeAddress,
        signTransactions,
        campaignId,
        walletPending.map((r) => r.address),
        walletPending.map((r) => r.amountMicroUsdc),
      )
      confirmFromChain(batchId, txId, pending)
      setLastPayoutLines(
        pending.map((r) => ({
          name: r.name,
          deliveryType: r.deliveryType,
          identifier: r.identifier,
          amountUsdc: r.amountMicroUsdc / 1_000_000,
          status: 'On-chain USDC sent',
        })),
      )
      void readCampaignState(campaignId).then(setChainState)
      setTab('proof')
      void refreshProof()
    } catch (e) {
      setErr(humanizeContractError(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <OpsLayout
      title="Release & proof"
      description="Import beneficiaries, release USDC after approver signatures, and verify every payment on the blockchain."
    >
      <div className="flex gap-2 mb-6 border-b border-border-subtle">
        <button
          type="button"
          onClick={() => setTab('release')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${tab === 'release' ? 'border-accent-primary text-accent-primary' : 'border-transparent text-text-tertiary'}`}
        >
          Release funds
        </button>
        <button
          type="button"
          onClick={() => setTab('proof')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${tab === 'proof' ? 'border-accent-primary text-accent-primary' : 'border-transparent text-text-tertiary'}`}
        >
          Payment proof
        </button>
      </div>

      {tab === 'release' ? (
        <>
          <div className="grid gap-6 lg:grid-cols-2 mb-6">
            <OpsPanel title="Campaign">
              {!isDisasterVaultConfigured() ? (
                <p className="text-xs text-text-tertiary">DisasterVault not configured — see Settings.</p>
              ) : campaigns.length === 0 ? (
                <p className="text-xs text-text-tertiary">
                  No campaigns yet.{' '}
                  <Link to={ROUTES.operationsEvents} className="text-accent-primary">
                    Create in Active Events →
                  </Link>
                </p>
              ) : (
                <>
                  <label className="block text-xs text-text-tertiary mb-1">Select campaign</label>
                  <select
                    value={selected?.id ?? ''}
                    onChange={(e) => setSelectedEventId(e.target.value)}
                    className="w-full font-mono text-sm bg-bg-elevated border border-border-medium p-2 text-text-primary mb-3"
                  >
                    {campaigns.map((e) => (
                      <option key={e.id} value={e.id}>
                        #{e.onChainCampaignId} — {e.location}
                      </option>
                    ))}
                  </select>
                  {chainState ? (
                    <LoraProofCard
                      title="Campaign status"
                      bullets={explainCampaignState({
                        target: chainState.target,
                        raised: chainState.raised,
                        approvalCount: chainState.approvalCount,
                        threshold: chainState.threshold,
                        status: chainState.status,
                      })}
                      technicalRecord={chainState}
                    />
                  ) : (
                    <p className="text-xs text-text-tertiary">Loading…</p>
                  )}
                  {!canDisburse ? (
                    <Link to={ROUTES.operationsVerification} className="inline-block mt-3 text-xs text-accent-primary">
                      Collect approver signatures →
                    </Link>
                  ) : null}
                </>
              )}
            </OpsPanel>

            <BeneficiaryImport />
          </div>

          <OpsPanel title="Execute disbursement">
            <div className="flex flex-wrap gap-3 mb-6">
              <StatusBadge variant="operational">Confirmed {confirmed}</StatusBadge>
              <StatusBadge variant="pending">Pending {pendingTx}</StatusBadge>
              <StatusBadge variant="attention">Queued {queued}</StatusBadge>
            </div>

            {isDisasterVaultConfigured() && campaignId ? (
              <Button
                variant="primary"
                disabled={busy || pending.length === 0 || !canDisburse || !activeAddress}
                onClick={() => void handleDisburse()}
              >
                {busy
                  ? 'Waiting for Pera…'
                  : `Release USDC to ${walletPending.length} wallet beneficiary${walletPending.length === 1 ? '' : 'ies'}`}
              </Button>
            ) : null}

            {!activeAddress ? (
              <p className="text-xs text-text-tertiary mt-2">Connect Pera wallet to sign the disbursement.</p>
            ) : null}
            {err ? <p className="text-xs text-alert-critical font-mono mt-4">{err}</p> : null}

            <TerminalLog entries={logEntries} title="Release log" maxHeight="max-h-[360px]" className="mt-6" />
          </OpsPanel>
        </>
      ) : (
        <>
          <div className="flex flex-wrap gap-3 mb-4">
            <Button variant="outline" disabled={refreshing} onClick={() => void refreshProof()}>
              {refreshing ? 'Refreshing…' : 'Refresh blockchain proof'}
            </Button>
            {DISASTER_APP_ID ? (
              <a
                href={isDisasterVaultConfigured() ? getDisasterExplorerAppUrl() : getLoraApplicationUrl(DISASTER_APP_ID)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-accent-primary self-center"
              >
                Verify DisasterVault on blockchain <ExternalLink className="w-3 h-3" />
              </a>
            ) : null}
            {APPEALS_APP_ID ? (
              <a
                href={getLoraApplicationUrl(APPEALS_APP_ID)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-accent-primary self-center"
              >
                Verify appeals on blockchain <ExternalLink className="w-3 h-3" />
              </a>
            ) : null}
          </div>

          {proofError ? <p className="text-xs text-alert-warning font-mono mb-4">{proofError}</p> : null}

          <OpsPanel title="Blockchain-confirmed transactions">
            <p className="text-xs text-text-secondary mb-4">
              Confirmed testnet transactions from DisasterVault. Expand JSON or verify on blockchain.
            </p>
            <LedgerProofTable
              records={proofRecords}
              emptyMessage="No transactions yet — sign an action in Pera, then refresh."
            />
          </OpsPanel>

          {lastPayoutLines.length > 0 ? (
            <OpsPanel title="Last release breakdown" className="mt-6">
              <ul className="space-y-2 text-sm">
                {lastPayoutLines.map((line) => (
                  <li key={`${line.deliveryType}-${line.identifier}`} className="border-b border-border-subtle pb-2">
                    <span className="text-text-primary font-medium">{line.name}</span>
                    <span className="text-text-tertiary"> · {line.amountUsdc} USDC · {line.deliveryType}</span>
                    <p className="text-xs text-text-secondary mt-0.5">{line.status}</p>
                    {line.deliveryType === 'wallet' && disbursements[0]?.txnHash ? (
                      <a
                        href={getLoraTransactionUrl(disbursements[0].txnHash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-accent-primary"
                      >
                        Verify on blockchain →
                      </a>
                    ) : null}
                  </li>
                ))}
              </ul>
            </OpsPanel>
          ) : null}

          {disbursements[0]?.txnHash && !disbursements[0].txnHash.startsWith('SIMULATED') ? (
            <LoraProofCard
              title="Latest disbursement"
              action="disburse"
              entityId={selected?.location}
              txnHash={disbursements[0].txnHash}
              technicalRecord={{ txnHash: disbursements[0].txnHash, amount: disbursements[0].amount }}
            />
          ) : null}
        </>
      )}
    </OpsLayout>
  )
}
