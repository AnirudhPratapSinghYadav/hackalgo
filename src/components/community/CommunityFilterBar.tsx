type Filter = 'all' | 'verified' | 'pending'
type Sort = 'recent' | 'urgent' | 'popular'

interface CommunityFilterBarProps {
  filter: Filter
  sort: Sort
  onFilterChange: (f: Filter) => void
  onSortChange: (s: Sort) => void
  resultCount: number
}

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'verified', label: 'Verified' },
  { id: 'pending', label: 'Pending review' },
]

const SORTS: { id: Sort; label: string }[] = [
  { id: 'recent', label: 'Recent' },
  { id: 'urgent', label: 'Most urgent' },
  { id: 'popular', label: 'Highest credibility' },
]

export default function CommunityFilterBar({
  filter,
  sort,
  onFilterChange,
  onSortChange,
  resultCount,
}: CommunityFilterBarProps) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row sm:items-center gap-4 border-b border-border-subtle bg-bg-primary/80 sticky top-0 z-10 backdrop-blur-sm">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => onFilterChange(id)}
            className={`px-4 py-2 text-sm font-medium transition-colors min-h-[44px] ${
              filter === id
                ? 'bg-accent-primary text-text-inverse'
                : 'bg-bg-surface text-text-secondary border border-border-subtle hover:border-accent-primary'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
        <span className="font-mono text-[10px] uppercase text-text-tertiary mr-2">{resultCount} crises</span>
        {SORTS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => onSortChange(id)}
            className={`px-3 py-2 text-sm transition-colors min-h-[44px] ${
              sort === id
                ? 'bg-bg-elevated text-text-primary border border-border-medium'
                : 'text-text-tertiary hover:text-text-primary'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}

export type { Filter as CommunityFilter, Sort as CommunitySort }
