interface ConfidenceBarProps {
  value: number
  max?: number
  showLabel?: boolean
  className?: string
}

export default function ConfidenceBar({ value, max = 100, showLabel = true, className = '' }: ConfidenceBarProps) {
  const safe = Number.isFinite(value) ? Math.max(0, value) : 0
  const pct = max > 0 ? Math.min(Math.max((safe / max) * 100, 0), 100) : 0
  const tone = pct >= 85 ? 'bg-accent-primary' : pct >= 60 ? 'bg-alert-warning' : 'bg-alert-critical'

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex-1 h-1.5 bg-bg-elevated overflow-hidden min-w-[4rem]">
        <div className={`h-full ${tone} transition-all duration-300`} style={{ width: `${pct}%` }} />
      </div>
      {showLabel ? (
        <span className="font-mono text-xs text-text-tertiary tabular-nums w-10 text-right">{Math.round(pct)}%</span>
      ) : null}
    </div>
  )
}
