interface CountBadgeProps {
  count: number | string
  variant?: 'warning' | 'critical' | 'neutral'
}

export default function CountBadge({ count, variant = 'warning' }: CountBadgeProps) {
  const styles =
    variant === 'critical'
      ? 'bg-alert-critical/20 text-alert-critical border-alert-critical/40'
      : variant === 'neutral'
        ? 'bg-bg-elevated text-text-secondary border-border-medium'
        : 'bg-alert-warning/20 text-text-primary border-alert-warning/40'

  return (
    <span className={`inline-flex items-center justify-center min-w-[1.75rem] px-2 py-0.5 text-xs font-mono border ${styles}`}>
      {count}
    </span>
  )
}
