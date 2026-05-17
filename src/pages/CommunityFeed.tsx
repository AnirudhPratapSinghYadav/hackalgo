import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import PublicHeader from '../components/layout/PublicHeader'
import { CrisisCard, CommunityFilterBar, type CommunityFilter, type CommunitySort } from '../components/community'
import { MetricCard } from '../components/ui'
import { ROUTES } from '../config/routes'
import { useCommunityStore } from '../store/communityStore'
import { formatUsdc } from '../lib/format'

export default function CommunityFeed() {
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
    <div className="min-h-screen bg-bg-primary">
      <PublicHeader
        subtitle="Community Crisis Verification"
        action={{ label: 'Submit crisis', to: ROUTES.submitCrisis }}
      />

      <section className="bg-bg-surface border-b border-border-subtle grain-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-text-tertiary">VerifyChain · Public layer</p>
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-text-primary mt-4 max-w-3xl leading-tight">
            Hyperlocal crises. Staked verification. Transparent release.
          </h1>
          <p className="mt-4 text-text-secondary max-w-2xl text-sm sm:text-base leading-relaxed">
            Individual emergencies verified by field officers and Guardian AI—not influencer reposts. Every release
            is traceable on Algorand from donor to beneficiary wallet.
          </p>
          <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard label="Crises verified" value={stats.verifiedCount} variant="accent" className="!p-4" />
            <MetricCard label="Total raised" value={formatUsdc(stats.totalRaised)} variant="accent" className="!p-4" />
            <MetricCard label="Pending review" value={stats.pendingCount} variant="warning" className="!p-4" />
            <MetricCard
              label="Avg verification score"
              value={`${stats.avgVerificationScore}%`}
              className="!p-4"
            />
          </div>
        </div>
      </section>

      <CommunityFilterBar
        filter={filter}
        sort={sort}
        onFilterChange={setFilter}
        onSortChange={setSort}
        resultCount={filtered.length}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 pb-16 space-y-5">
        {filtered.length === 0 ? (
          <div className="py-16 text-center border border-border-subtle bg-bg-surface">
            <p className="text-text-secondary">No crises match this filter.</p>
            <Link to={ROUTES.submitCrisis} className="inline-block mt-4 text-sm text-accent-primary">
              Submit the first crisis →
            </Link>
          </div>
        ) : (
          filtered.map((crisis) => <CrisisCard key={crisis.id} crisis={crisis} />)
        )}
      </div>
    </div>
  )
}
