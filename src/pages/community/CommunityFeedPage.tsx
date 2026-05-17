import { useMemo, useState } from 'react'
import CommunityPostCard from '../../components/community/CommunityPostCard'
import { usePlatformStore } from '../../store/platformStore'
import { FEED_ALLOWED_POST_TYPES } from '../../domain/platform'
type Filter = 'all' | 'official' | 'field' | 'milestones'

export default function CommunityFeedPage() {
  const posts = usePlatformStore((s) => s.communityPosts)
  const [filter, setFilter] = useState<Filter>('all')

  const filtered = useMemo(() => {
    let list = [...posts]
      .filter((p) => FEED_ALLOWED_POST_TYPES.includes(p.type))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    if (filter === 'official') list = list.filter((p) => p.authorKind === 'official')
    if (filter === 'field') list = list.filter((p) => p.authorKind === 'field_verified')
    if (filter === 'milestones')
      list = list.filter((p) => p.type === 'fundraising_update' || p.type === 'impact_report')
    return list
  }, [posts, filter])

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 pb-16 space-y-6">
      <div className="flex flex-wrap gap-2">
        {(
          [
            ['all', 'All updates'],
            ['official', 'Official'],
            ['field', 'Field verified'],
            ['milestones', 'Funding & milestones'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`px-3 py-1.5 text-xs font-mono uppercase border ${
              filter === key
                ? 'border-accent-primary text-accent-primary'
                : 'border-border-subtle text-text-tertiary'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="text-xs text-text-tertiary font-mono">{filtered.length} posts</p>
      <div className="space-y-5">
        {filtered.map((post) => (
          <CommunityPostCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  )
}
