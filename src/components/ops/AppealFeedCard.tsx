import { Link } from 'react-router-dom'
import { ExternalLink, Heart, MapPin, ShieldCheck } from 'lucide-react'
import { useWallet } from '@txnlab/use-wallet-react'
import { useState } from 'react'
import type { Crisis } from '../../types/crisis'
import CredibilityStake from '../community/CredibilityStake'
import { FundingProgress } from '../community'
import { Button, StatusBadge } from '../ui'
import { ROUTES } from '../../config/routes'
import { formatCategory, truncateAddress } from '../../lib/format'
import { getLoraApplicationUrl } from '../../services/humanitarianExplorer'
import {
  adminApproveAppeal,
  donateToAppeal,
  getAdminAddress,
  isAppealsHubConfigured,
} from '../../services/communityDonation'
import { usePlatformStore } from '../../store/platformStore'
import { inferCategoryFromText, resolveAppealHeroImage } from '../../lib/crisisImages'
import LoraProofCard from './LoraProofCard'

const APPEALS_APP = Number(import.meta.env.VITE_APPEALS_APP_ID) || 0

interface AppealFeedCardProps {
  crisis: Crisis
  onApproved?: () => void
}

export default function AppealFeedCard({ crisis, onApproved }: AppealFeedCardProps) {
  const approveOnChain = usePlatformStore((s) => s.approveAppealOnChain)
  const recordFromChain = usePlatformStore((s) => s.recordDonationFromChain)
  const refreshAppealFromChain = usePlatformStore((s) => s.refreshAppealFromChain)
  const { activeAddress, signTransactions } = useWallet()
  const [busy, setBusy] = useState<'approve' | 'fund' | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [fundAlgo, setFundAlgo] = useState('0.5')
  const [lastTxId, setLastTxId] = useState<string | null>(null)

  const category = inferCategoryFromText(crisis.title, crisis.description)
  const hero = resolveAppealHeroImage({
    title: crisis.title,
    description: crisis.description,
    category: crisis.category,
    images: crisis.images,
  })

  const adminAddr = getAdminAddress()
  const canApprove =
    isAppealsHubConfigured() &&
    crisis.onChainAppealId != null &&
    crisis.chainStatus === 'pending' &&
    !!activeAddress &&
    !!signTransactions &&
    (!adminAddr || activeAddress === adminAddr)

  const canFund =
    isAppealsHubConfigured() &&
    crisis.chainStatus === 'active' &&
    crisis.onChainAppealId != null &&
    !!activeAddress &&
    signTransactions

  const loraUrl = APPEALS_APP ? getLoraApplicationUrl(APPEALS_APP) : null

  const handleApprove = async () => {
    if (!canApprove || crisis.onChainAppealId == null) return
    setBusy('approve')
    setErr(null)
    try {
      const txId = await adminApproveAppeal(activeAddress!, signTransactions!, crisis.onChainAppealId)
      approveOnChain(crisis.id, crisis.onChainAppealId, txId)
      setLastTxId(txId)
      onApproved?.()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Approve failed — connect admin wallet in Pera')
    } finally {
      setBusy(null)
    }
  }

  const handleFund = async () => {
    if (!canFund || crisis.onChainAppealId == null) return
    const algo = Number(fundAlgo)
    if (!Number.isFinite(algo) || algo <= 0) return
    setBusy('fund')
    setErr(null)
    try {
      const micro = Math.round(algo * 1_000_000)
      const txId = await donateToAppeal(activeAddress!, signTransactions!, crisis.onChainAppealId, micro)
      recordFromChain(crisis.id, micro, txId, activeAddress!, crisis.onChainAppealId)
      setLastTxId(txId)
      await refreshAppealFromChain(crisis.id, crisis.onChainAppealId)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Fund failed — confirm in Pera wallet')
    } finally {
      setBusy(null)
    }
  }

  return (
    <article className="rounded-xl border border-border-medium bg-bg-surface overflow-hidden shadow-md hover:border-accent-primary/50 transition-all">
      <div className="relative aspect-[16/9] max-h-80 overflow-hidden bg-bg-primary">
        <img src={hero} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-bg-primary via-transparent to-transparent pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm bg-bg-primary/80 text-[10px] font-mono uppercase tracking-wider text-accent-primary border border-accent-primary/30">
              {formatCategory(category)}
            </span>
            {crisis.onChainAppealId != null ? (
              <StatusBadge variant={crisis.chainStatus === 'active' ? 'operational' : 'pending'}>
                On-chain #{crisis.onChainAppealId}
              </StatusBadge>
            ) : null}
          </div>
          <h3 className="font-serif text-xl sm:text-2xl text-text-primary leading-snug drop-shadow-sm">{crisis.title}</h3>
          <p className="mt-1 flex items-center gap-1 text-xs text-text-secondary">
            <MapPin className="w-3 h-3 shrink-0" />
            {crisis.location.city}, {crisis.location.state}
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row">
        <div className="sm:w-14 flex sm:flex-col items-center justify-center gap-2 py-3 sm:py-4 bg-bg-elevated border-b sm:border-b-0 sm:border-r border-border-subtle">
          <CredibilityStake
            crisisId={crisis.id}
            upvotes={crisis.upvotes}
            downvotes={crisis.downvotes}
            layout="horizontal"
          />
        </div>

        <div className="flex-1 p-4 sm:p-5 min-w-0">
          <p className="text-sm text-text-secondary leading-relaxed">{crisis.description}</p>

          <div className="mt-4 max-w-md">
            <FundingProgress raised={crisis.raisedAmount} required={crisis.requiredAmount} unit="ALGO" />
            <p className="font-mono text-[10px] text-text-tertiary mt-2 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              Beneficiary {truncateAddress(crisis.beneficiaryWallet || '—')}
            </p>
          </div>

          {!activeAddress ? (
            <p className="mt-3 text-xs text-alert-warning">Connect Pera wallet to approve or fund.</p>
          ) : null}
          {err ? <p className="mt-3 text-xs text-alert-critical font-mono">{err}</p> : null}

          {lastTxId ? (
            <div className="mt-4">
              <LoraProofCard
                title="What this transaction means"
                action={busy === 'approve' ? 'admin_approve' : 'donate'}
                entityId={`Appeal #${crisis.onChainAppealId}`}
                txnHash={lastTxId}
                technicalRecord={{
                  appealId: crisis.onChainAppealId,
                  raisedAlgo: crisis.raisedAmount,
                  targetAlgo: crisis.requiredAmount,
                  chainStatus: crisis.chainStatus,
                  beneficiary: crisis.beneficiaryWallet,
                  txnId: lastTxId,
                }}
              />
            </div>
          ) : crisis.onChainAppealId != null ? (
            <details className="mt-4 text-xs border border-border-subtle rounded p-2 bg-bg-elevated/50">
              <summary className="text-text-tertiary cursor-pointer px-1">On-chain record (JSON)</summary>
              <pre className="mt-2 p-2 overflow-x-auto font-mono text-[10px] text-text-secondary">
                {JSON.stringify(
                  {
                    appealId: crisis.onChainAppealId,
                    status: crisis.chainStatus,
                    raisedAlgo: crisis.raisedAmount,
                    targetAlgo: crisis.requiredAmount,
                    beneficiary: crisis.beneficiaryWallet,
                  },
                  null,
                  2,
                )}
              </pre>
            </details>
          ) : null}

          <div className="mt-5 flex flex-wrap items-center gap-2">
            {canFund ? (
              <>
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={fundAlgo}
                  onChange={(e) => setFundAlgo(e.target.value)}
                  className="w-20 font-mono text-xs bg-bg-elevated border border-border-medium px-2 py-2.5 text-text-primary rounded"
                  aria-label="ALGO amount"
                />
                <Button variant="primary" disabled={busy !== null} onClick={() => void handleFund()}>
                  <Heart className="w-4 h-4 mr-1 inline" />
                  {busy === 'fund' ? 'Waiting for Pera…' : 'Fund in Pera'}
                </Button>
              </>
            ) : crisis.chainStatus === 'pending' ? (
              <p className="text-xs text-text-tertiary">Awaiting admin approval before donors can fund</p>
            ) : null}

            {canApprove ? (
              <Button variant="outline" disabled={busy !== null} onClick={() => void handleApprove()}>
                {busy === 'approve' ? 'Waiting for Pera…' : 'Approve in Pera'}
              </Button>
            ) : null}

            {loraUrl && crisis.onChainAppealId != null ? (
              <a
                href={loraUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-accent-primary min-h-[44px] px-3"
              >
                Verify on blockchain
                <ExternalLink className="w-3 h-3" />
              </a>
            ) : null}

            <Link
              to={ROUTES.communityDetail(crisis.id)}
              className="text-xs text-text-tertiary hover:text-text-primary ml-auto min-h-[44px] inline-flex items-center"
            >
              Full details →
            </Link>
          </div>
        </div>
      </div>
    </article>
  )
}
