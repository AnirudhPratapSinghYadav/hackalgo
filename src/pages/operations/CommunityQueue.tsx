import { useCallback, useEffect, useMemo, useState } from 'react'
import OpsLayout from '../../components/ops/OpsLayout'
import AppealFeedCard from '../../components/ops/AppealFeedCard'
import { CountBadge, Button } from '../../components/ui'
import { useCommunityStore } from '../../store/communityStore'
import { usePlatformStore } from '../../store/platformStore'
import { fetchOnChainAppeals } from '../../services/chainRead'
import { getAppealsHubLoraUrls } from '../../services/humanitarianExplorer'
import { isAppealsHubConfigured } from '../../services/communityDonation'

type Filter = 'all' | 'pending' | 'active' | 'funded'

export default function CommunityQueue() {
  const crises = useCommunityStore((s) => s.crises)
  const [refreshing, setRefreshing] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('all')

  const loadChain = useCallback(async () => {
    if (!isAppealsHubConfigured()) return
    setRefreshing(true)
    setErr(null)
    try {
      const onChain = await fetchOnChainAppeals()
      usePlatformStore.getState().hydrateFromChain({ crises: onChain })
      const store = usePlatformStore.getState()
      await Promise.all(
        onChain
          .filter((c) => c.onChainAppealId != null)
          .map((c) => store.refreshAppealFromChain(c.id, c.onChainAppealId!)),
      )
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Chain sync failed')
    } finally {
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void loadChain()
  }, [loadChain])

  const feed = useMemo(() => {
    let list = [...crises].sort((a, b) => b.upvotes - a.downvotes - (a.upvotes - a.downvotes))
    if (filter === 'pending') {
      list = list.filter((c) => c.chainStatus === 'pending' || c.status === 'pending' || c.status === 'under_review')
    }
    if (filter === 'active') list = list.filter((c) => c.chainStatus === 'active')
    if (filter === 'funded') list = list.filter((c) => c.raisedAmount > 0)
    return list
  }, [crises, filter])

  const pendingCount = crises.filter(
    (c) => c.status === 'pending' || c.status === 'under_review' || c.chainStatus === 'pending',
  ).length

  const appealsLora = getAppealsHubLoraUrls()

  return (
    <OpsLayout
      title="Community appeals"
      description="Review individual emergencies. Images match appeal type. Every approve and fund action is signed in Pera and verifiable on the blockchain."
      breadcrumb="Community"
      headerActions={
        <div className="flex items-center gap-2">
          <CountBadge count={feed.length} variant="neutral" />
          <Button variant="outline" className="text-xs min-h-0 py-1" disabled={refreshing} onClick={() => void loadChain()}>
            {refreshing ? 'Syncing…' : 'Sync from chain'}
          </Button>
        </div>
      }
    >
      {appealsLora ? (
        <p className="text-xs text-text-secondary mb-4">
          Appeals contract{' '}
          <a href={appealsLora.appUrl} target="_blank" rel="noopener noreferrer" className="text-accent-primary font-mono">
            #{appealsLora.appId}
          </a>{' '}
          on blockchain
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2 mb-6">
        {(
          [
            ['all', 'All'],
            ['pending', 'Needs approval'],
            ['active', 'Open for funding'],
            ['funded', 'Has donations'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`px-3 py-1.5 text-xs font-medium rounded border ${
              filter === key
                ? 'border-accent-primary text-accent-primary bg-accent-primary/10'
                : 'border-border-subtle text-text-tertiary hover:text-text-secondary'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {err ? <p className="text-xs text-alert-critical font-mono mb-4">{err}</p> : null}

      {feed.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-border-medium bg-bg-surface rounded-lg">
          <p className="text-sm text-text-secondary">No appeals in this view.</p>
          <Button variant="primary" className="mt-6" disabled={refreshing} onClick={() => void loadChain()}>
            Sync from chain
          </Button>
        </div>
      ) : (
        <div className="space-y-8 max-w-3xl mx-auto">
          {feed.map((c) => (
            <AppealFeedCard key={c.id} crisis={c} onApproved={() => void loadChain()} />
          ))}
        </div>
      )}

      {pendingCount > 0 ? (
        <p className="mt-8 text-xs text-text-secondary text-center">
          {pendingCount} appeal(s) waiting for admin approval in Pera before funding opens.
        </p>
      ) : null}
    </OpsLayout>
  )
}
