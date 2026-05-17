import { useMemo } from 'react'
import { usePlatformStore } from '../../store/platformStore'
import { POST_TYPE_LABELS } from '../../domain/platform'

export default function CommunityActivityPage() {
  const posts = usePlatformStore((s) => s.communityPosts)
  const donations = usePlatformStore((s) => s.donations)
  const milestones = usePlatformStore((s) => s.campaignMilestones)

  const timeline = useMemo(() => {
    const items: { id: string; ts: string; label: string; detail: string }[] = []
    posts.forEach((p) =>
      items.push({
        id: p.id,
        ts: p.timestamp,
        label: POST_TYPE_LABELS[p.type],
        detail: p.title,
      }),
    )
    donations.forEach((d) =>
      items.push({
        id: d.id,
        ts: d.timestamp,
        label: 'Donation',
        detail: `${d.amount} USDC — crisis ${d.crisisId}`,
      }),
    )
    milestones.forEach((m) =>
      items.push({
        id: m.id,
        ts: m.reachedAt ?? '',
        label: 'Milestone',
        detail: m.label,
      }),
    )
    return items
      .filter((i) => i.ts)
      .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
  }, [posts, donations, milestones])

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 pb-16">
      <p className="text-sm text-text-secondary mb-6">
        Chronological activity across posts, donations, and campaign milestones.
      </p>
      <ul className="border border-border-subtle divide-y divide-border-subtle">
        {timeline.map((item) => (
          <li key={item.id} className="px-4 py-4 flex gap-4 bg-bg-surface">
            <time className="font-mono text-[10px] text-text-tertiary shrink-0 w-36">
              {new Date(item.ts).toLocaleString()}
            </time>
            <div>
              <p className="text-xs font-mono uppercase text-accent-primary">{item.label}</p>
              <p className="text-sm text-text-primary mt-1">{item.detail}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
