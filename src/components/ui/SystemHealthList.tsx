import type { SystemHealthItem } from '../../store/opsStore'
import StatusBadge from './StatusBadge'

function statusToVariant(status: SystemHealthItem['status']): 'operational' | 'attention' | 'critical' {
  if (status === 'operational') return 'operational'
  if (status === 'critical') return 'critical'
  return 'attention'
}

function statusLabel(status: SystemHealthItem['status']): string {
  if (status === 'operational') return 'OPERATIONAL'
  if (status === 'critical') return 'CRITICAL'
  return 'ATTENTION'
}

interface SystemHealthListProps {
  items: SystemHealthItem[]
}

export default function SystemHealthList({ items }: SystemHealthListProps) {
  return (
    <ul className="divide-y divide-border-subtle">
      {items.map((item) => (
        <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0">
          <span className="text-sm text-text-secondary">{item.label}</span>
          <StatusBadge variant={statusToVariant(item.status)} dot>
            {statusLabel(item.status)}
          </StatusBadge>
          <span className="w-full text-xs font-mono text-text-tertiary">{item.detail}</span>
        </li>
      ))}
    </ul>
  )
}
