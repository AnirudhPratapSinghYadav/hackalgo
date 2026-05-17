import { Link } from 'react-router-dom'
import { MapPin, Shield, Users } from 'lucide-react'
import type { Crisis } from '../../types/crisis'
import { ROUTES } from '../../config/routes'
import { formatCategory } from '../../lib/format'
import CredibilityStake from './CredibilityStake'
import CrisisStatusBadge from './CrisisStatusBadge'
import FundingProgress from './FundingProgress'
import { ConfidenceBar } from '../ui'

interface CrisisCardProps {
  crisis: Crisis
}

export default function CrisisCard({ crisis }: CrisisCardProps) {
  const detailPath = ROUTES.communityDetail(crisis.id)

  return (
    <article className="bg-bg-surface border border-border-subtle hover:border-accent-primary/60 transition-colors duration-200">
      <div className="flex flex-col md:flex-row">
        <div className="flex flex-row md:flex-col items-center justify-center gap-2 md:gap-1 p-4 md:py-6 md:px-3 border-b md:border-b-0 md:border-r border-border-subtle bg-bg-primary/40">
          <CredibilityStake crisisId={crisis.id} upvotes={crisis.upvotes} downvotes={crisis.downvotes} />
        </div>

        <Link to={detailPath} className="block md:w-52 lg:w-56 shrink-0 h-44 md:h-auto md:min-h-[200px] overflow-hidden border-b md:border-b-0 md:border-r border-border-subtle">
          {crisis.images[0] ? (
            <img src={crisis.images[0]} alt="" className="w-full h-full object-cover cinema-img min-h-[176px]" />
          ) : (
            <div className="w-full h-full min-h-[176px] flex items-center justify-center bg-bg-elevated">
              <span className="font-mono text-[10px] uppercase text-text-tertiary">No evidence image</span>
            </div>
          )}
        </Link>

        <div className="flex-1 p-5 sm:p-6 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-start gap-3">
            <Link to={detailPath} className="flex-1 min-w-0 group">
              <p className="font-mono text-[10px] text-text-tertiary">{crisis.id}</p>
              <h2 className="font-serif text-xl text-text-primary mt-1 group-hover:text-accent-primary transition-colors line-clamp-2">
                {crisis.title}
              </h2>
            </Link>
            <CrisisStatusBadge status={crisis.status} />
          </div>

          <p className="mt-3 text-sm text-text-secondary line-clamp-2 leading-relaxed">{crisis.description}</p>

          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-text-tertiary">
            <span className="inline-flex items-center gap-1.5">
              <MapPin size={14} strokeWidth={1.5} />
              {crisis.location.city}, {crisis.location.state}
            </span>
            <span className="font-mono uppercase tracking-wide">{formatCategory(crisis.category)}</span>
            {crisis.verifiers.length > 0 ? (
              <span className="inline-flex items-center gap-1.5">
                <Users size={14} strokeWidth={1.5} />
                {crisis.verifiers.length} field verifier{crisis.verifiers.length > 1 ? 's' : ''}
              </span>
            ) : null}
          </div>

          {crisis.verificationScore > 0 || crisis.guardianAIScore != null ? (
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {crisis.verificationScore > 0 ? (
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-label text-text-tertiary mb-2">
                    Verification score
                  </p>
                  <ConfidenceBar value={crisis.verificationScore} />
                </div>
              ) : null}
              {crisis.guardianAIScore != null ? (
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-label text-text-tertiary mb-2 flex items-center gap-1">
                    <Shield size={12} className="text-accent-primary" />
                    Guardian AI
                  </p>
                  <ConfidenceBar value={crisis.guardianAIScore} />
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="mt-5">
            <FundingProgress raised={crisis.raisedAmount} required={crisis.requiredAmount} />
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              to={detailPath}
              className="text-sm text-accent-primary hover:text-accent-hover font-medium"
            >
              View crisis dossier →
            </Link>
            {(crisis.status === 'verified' || crisis.status === 'funded') && (
              <Link to={ROUTES.crisisDonate(crisis.id)} className="text-sm text-text-secondary hover:text-text-primary">
                Initiate release
              </Link>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}
