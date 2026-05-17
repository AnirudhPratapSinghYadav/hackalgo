import type { ReactNode } from 'react'

interface MetricCardProps {
  label: string
  value: string | number
  sublabel?: string
  action?: ReactNode
  variant?: 'default' | 'accent' | 'warning' | 'critical'
  className?: string
}

const VALUE_VARIANTS = {
  default: 'text-text-primary',
  accent: 'text-accent-primary',
  warning: 'text-alert-warning',
  critical: 'text-alert-critical',
} as const

export default function MetricCard({
  label,
  value,
  sublabel,
  action,
  variant = 'default',
  className = '',
}: MetricCardProps) {
  return (
    <div className={`bg-bg-surface border border-border-subtle p-5 ${className}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="font-mono text-[10px] uppercase tracking-label text-text-tertiary">{label}</p>
        {action}
      </div>
      <p className={`font-serif text-3xl sm:text-4xl mt-2 leading-none ${VALUE_VARIANTS[variant]}`}>{value}</p>
      {sublabel ? <p className="mt-2 text-xs text-text-secondary">{sublabel}</p> : null}
    </div>
  )
}
