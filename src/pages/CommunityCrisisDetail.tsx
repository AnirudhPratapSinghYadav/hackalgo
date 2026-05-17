import { Link, useParams } from 'react-router-dom'
import { MapPin, Shield, Clock } from 'lucide-react'
import PublicHeader from '../components/layout/PublicHeader'
import {
  CrisisStatusBadge,
  CredibilityStake,
  FundingProgress,
  VerifierAttestation,
} from '../components/community'
import { OpsPanel, ConfidenceBar, TerminalLog } from '../components/ui'
import type { TerminalLogEntry } from '../components/ui/TerminalLog'
import { ROUTES } from '../config/routes'
import { useCommunityStore } from '../store/communityStore'
import { formatCategory, formatUsdc, truncateAddress } from '../lib/format'

const linkBtnPrimary =
  'flex items-center justify-center w-full min-h-[44px] px-4 py-2.5 text-sm font-medium bg-accent-primary text-text-inverse hover:bg-accent-hover border border-transparent transition-colors'
const linkBtnOutline =
  'flex items-center justify-center w-full min-h-[44px] px-4 py-2.5 text-sm font-medium border border-border-medium text-text-secondary hover:border-accent-primary hover:text-text-primary transition-colors'

export default function CommunityCrisisDetail() {
  const { crisisId } = useParams<{ crisisId: string }>()
  const storeCrisis = useCommunityStore((s) => s.crises.find((c) => c.id === crisisId))
  const getDonations = useCommunityStore((s) => s.getDonationsForCrisis)
  const crisis = storeCrisis

  if (!crisis) {
    return (
      <div className="min-h-screen bg-bg-primary">
        <PublicHeader />
        <p className="p-10 text-text-secondary font-mono text-sm">Crisis record not found: {crisisId}</p>
      </div>
    )
  }

  const donations = getDonations(crisis.id)
  const donationLog: TerminalLogEntry[] = donations.map((d) => ({
    id: d.txnHash,
    timestamp: new Date(d.timestamp).toISOString().slice(0, 19),
    level: 'success',
    message: `${formatUsdc(d.amount)} from ${d.donor}`,
    meta: truncateAddress(d.txnHash, 8, 6),
  }))

  return (
    <div className="min-h-screen bg-bg-primary">
      <PublicHeader subtitle={crisis.id} />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 pb-16">
        <Link to={ROUTES.communityCrises} className="text-sm text-accent-primary hover:text-accent-hover font-mono">
          ← Community feed
        </Link>

        <div className="mt-8 flex flex-col lg:flex-row gap-8">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-start gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-mono text-[10px] uppercase text-text-tertiary">{formatCategory(crisis.category)}</p>
                <h1 className="font-serif text-3xl sm:text-4xl text-text-primary mt-2 leading-tight">{crisis.title}</h1>
                <p className="mt-3 flex items-center gap-2 text-sm text-text-secondary">
                  <MapPin size={14} strokeWidth={1.5} />
                  {crisis.location.city}, {crisis.location.state}
                </p>
              </div>
              <CrisisStatusBadge status={crisis.status} />
            </div>

            <p className="mt-6 text-text-secondary leading-relaxed">{crisis.description}</p>

            {crisis.images.length > 0 ? (
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {crisis.images.map((src) => (
                  <div key={src} className="aspect-video border border-border-medium overflow-hidden bg-bg-elevated">
                    <img src={src} alt="Field evidence" className="w-full h-full object-cover cinema-img" />
                  </div>
                ))}
              </div>
            ) : null}

            {crisis.guardianAIScore != null ? (
              <OpsPanel title="Guardian AI cross-check" className="mt-8" accent="left">
                <div className="flex items-center gap-2 mb-4">
                  <Shield size={18} strokeWidth={1.5} className="text-accent-primary" />
                  <ConfidenceBar value={crisis.guardianAIScore} className="flex-1" />
                </div>
                <ul className="space-y-2">
                  {crisis.guardianAISources?.map((s) => (
                    <li key={s} className="font-mono text-xs text-text-secondary flex gap-2">
                      <span className="text-text-tertiary">·</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </OpsPanel>
            ) : null}

            {crisis.verifiers.length > 0 ? (
              <section className="mt-8">
                <h2 className="font-sans text-sm font-semibold text-text-primary mb-4">VerifyChain field attestations</h2>
                <ul className="space-y-4">
                  {crisis.verifiers.map((v) => (
                    <VerifierAttestation key={v.address + v.verifiedAt} verifier={v} />
                  ))}
                </ul>
              </section>
            ) : null}

            {donationLog.length > 0 ? (
              <OpsPanel title="Release audit log" className="mt-8">
                <TerminalLog entries={donationLog} title="Donor releases" maxHeight="max-h-48" />
              </OpsPanel>
            ) : null}
          </div>

          <aside className="w-full lg:w-80 shrink-0 space-y-4">
            <div className="p-5 bg-bg-surface border border-border-subtle">
              <p className="font-mono text-[10px] uppercase tracking-label text-text-tertiary mb-4">Community credibility</p>
              <CredibilityStake
                crisisId={crisis.id}
                upvotes={crisis.upvotes}
                downvotes={crisis.downvotes}
                layout="horizontal"
              />
            </div>

            <div className="p-5 bg-bg-surface border border-border-subtle">
              <p className="font-mono text-[10px] uppercase tracking-label text-text-tertiary mb-3">Verification score</p>
              <ConfidenceBar value={crisis.verificationScore || crisis.guardianAIScore || 0} />
            </div>

            <div className="p-5 bg-bg-surface border border-border-subtle">
              <p className="font-mono text-[10px] uppercase tracking-label text-text-tertiary mb-3">Funding vault</p>
              <FundingProgress raised={crisis.raisedAmount} required={crisis.requiredAmount} />
              <p className="mt-4 font-mono text-[10px] text-text-tertiary break-all">
                Beneficiary: {crisis.beneficiaryWallet}
              </p>
              {crisis.vaultAddress ? (
                <p className="mt-1 font-mono text-[10px] text-text-tertiary">Vault: {crisis.vaultAddress}</p>
              ) : null}
            </div>

            <div className="p-5 bg-bg-surface border border-border-subtle space-y-3">
              {(crisis.status === 'verified' || crisis.status === 'funded') && (
                <Link to={ROUTES.crisisDonate(crisis.id)} className={linkBtnPrimary}>
                  Initiate release
                </Link>
              )}
              <Link to={ROUTES.verifyCrisis(crisis.id)} className={linkBtnOutline}>
                Verify as field officer
              </Link>
            </div>

            <div className="flex items-start gap-2 text-xs text-text-tertiary font-mono p-4 border border-border-subtle">
              <Clock size={14} className="shrink-0 mt-0.5" />
              <span>Submitted {new Date(crisis.submittedAt).toLocaleString()}</span>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
