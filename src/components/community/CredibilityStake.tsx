import { ArrowDown, ArrowUp } from 'lucide-react'
import { useCommunityStore } from '../../store/communityStore'

interface CredibilityStakeProps {
  crisisId: string
  upvotes: number
  downvotes: number
  layout?: 'vertical' | 'horizontal'
}

/**
 * Community credibility voting — styled as staked attestation, not social "likes".
 */
export default function CredibilityStake({ crisisId, upvotes, downvotes, layout = 'vertical' }: CredibilityStakeProps) {
  const vote = useCommunityStore((s) => s.vote)
  const userVote = useCommunityStore((s) => s.votes[crisisId])
  const score = upvotes - downvotes

  const stop = (e: React.MouseEvent) => e.stopPropagation()

  const btnBase =
    'flex items-center justify-center min-h-[44px] min-w-[44px] border border-border-medium transition-colors'
  const btnActive = 'bg-bg-elevated border-accent-primary'

  if (layout === 'horizontal') {
    return (
      <div className="flex items-center gap-1" onClick={stop} role="group" aria-label="Credibility stake">
        <button
          type="button"
          aria-label="Increase credibility"
          aria-pressed={userVote === 'up'}
          onClick={() => vote(crisisId, 'up')}
          className={`${btnBase} ${userVote === 'up' ? btnActive : 'hover:border-community-upvote'}`}
        >
          <ArrowUp size={18} strokeWidth={1.5} className="text-community-upvote" />
        </button>
        <div className="px-3 py-2 border border-border-subtle bg-bg-primary min-w-[3rem] text-center">
          <p className="font-mono text-sm font-medium text-text-primary tabular-nums">{score}</p>
          <p className="font-mono text-[9px] uppercase text-text-tertiary tracking-wide">Stake</p>
        </div>
        <button
          type="button"
          aria-label="Challenge credibility"
          aria-pressed={userVote === 'down'}
          onClick={() => vote(crisisId, 'down')}
          className={`${btnBase} ${userVote === 'down' ? btnActive : 'hover:border-community-downvote'}`}
        >
          <ArrowDown size={18} strokeWidth={1.5} className="text-community-downvote" />
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-1 shrink-0" onClick={stop} role="group" aria-label="Credibility stake">
      <button
        type="button"
        aria-label="Increase credibility"
        aria-pressed={userVote === 'up'}
        onClick={() => vote(crisisId, 'up')}
        className={`${btnBase} w-full ${userVote === 'up' ? btnActive : 'hover:border-community-upvote'}`}
      >
        <ArrowUp size={18} strokeWidth={1.5} className="text-community-upvote" />
      </button>
      <div className="py-2 px-1 text-center border-x border-border-subtle w-full">
        <p className="font-mono text-sm font-medium text-text-primary tabular-nums">{score}</p>
        <p className="font-mono text-[9px] uppercase text-text-tertiary tracking-wide mt-0.5">Credibility</p>
      </div>
      <button
        type="button"
        aria-label="Challenge credibility"
        aria-pressed={userVote === 'down'}
        onClick={() => vote(crisisId, 'down')}
        className={`${btnBase} w-full ${userVote === 'down' ? btnActive : 'hover:border-community-downvote'}`}
      >
        <ArrowDown size={18} strokeWidth={1.5} className="text-community-downvote" />
      </button>
    </div>
  )
}
