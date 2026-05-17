/** Hyperlocal crisis list — legacy VerifyChain surface under community nav */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CrisisCard, CommunityFilterBar, type CommunityFilter, type CommunitySort } from '../../components/community'
import { MetricCard } from '../../components/ui'
import { ROUTES } from '../../config/routes'
import { useCommunityStore } from '../../store/communityStore'
import { formatUsdc } from '../../lib/format'

export default function CommunityCrisesPage() {
  const crises = useCommunityStore((s) => s.crises)
  const stats = useMemo(() => {
    const verified = crises.filter((c) => c.status === 'verified' || c.status === 'funded')
    const pending = crises.filter((c) => c.status === 'pending' || c.status === 'under_review')
    const scored = crises.filter((c) => c.verificationScore > 0)
    const avgVerificationScore =
      scored.length > 0 ? Math.round(scored.reduce((s, c) => s + c.verificationScore, 0) / scored.length) : 0
    return {
      verifiedCount: verified.length,
      totalRaised: crises.reduce((s, c) => s + c.raisedAmount, 0),
      pendingCount: pending.length,
      avgVerificationScore,
    }
  }, [crises])
  const [filter, setFilter] = useState<CommunityFilter>('all')
  const [sort, setSort] = useState<CommunitySort>('recent')

  const filtered = useMemo(() => {
    let list = crises.filter((c) => {
      if (filter === 'verified') return c.status === 'verified' || c.status === 'funded'
      if (filter === 'pending') return c.status === 'pending' || c.status === 'under_review'
      return true
    })
    if (sort === 'popular') {
      list = [...list].sort((a, b) => b.upvotes - b.downvotes - (a.upvotes - a.downvotes))
    } else if (sort === 'urgent') {
      list = [...list].sort(
        (a, b) => b.requiredAmount - b.raisedAmount - (a.requiredAmount - a.raisedAmount),
      )
    } else {
      list = [...list].sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
    }
    return list
  }, [crises, filter, sort])

  return (
    <div className="pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <p className="text-sm text-text-secondary max-w-2xl">
          Individual emergencies with staked verification — separate from institutional disaster campaigns.
        </p>
        <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="Crises verified" value={stats.verifiedCount} variant="accent" className="!p-4" />
          <MetricCard label="Total raised" value={formatUsdc(stats.totalRaised)} variant="accent" className="!p-4" />
          <MetricCard label="Pending review" value={stats.pendingCount} variant="warning" className="!p-4" />
          <MetricCard label="Avg verification score" value={`${stats.avgVerificationScore}%`} className="!p-4" />
        </div>
        <Link to={ROUTES.submitCrisis} className="inline-block mt-6 text-sm text-accent-primary">
          Submit crisis →
        </Link>
      </div>
      <CommunityFilterBar
        filter={filter}
        sort={sort}
        onFilterChange={setFilter}
        onSortChange={setSort}
        resultCount={filtered.length}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-5">
        {filtered.map((c) => (
          <CrisisCard key={c.id} crisis={c} />
        ))}
      </div>
    </div>
  )
}
