import { formatAlgo, formatUsdc, fundingPercent } from '../../lib/format'

interface FundingProgressProps {
  raised: number
  required: number
  showLabels?: boolean
  size?: 'sm' | 'md'
  unit?: 'USDC' | 'ALGO'
}

export default function FundingProgress({
  raised,
  required,
  showLabels = true,
  size = 'md',
  unit = 'USDC',
}: FundingProgressProps) {
  const pct = fundingPercent(raised, required)
  const barH = size === 'sm' ? 'h-1.5' : 'h-2.5'
  const fmt = unit === 'ALGO' ? formatAlgo : formatUsdc

  return (
    <div>
      {showLabels ? (
        <div className="flex justify-between items-baseline gap-2 mb-2">
          <span className="font-mono text-xs text-text-primary">{fmt(raised)}</span>
          <span className="font-mono text-[10px] text-text-tertiary">of {fmt(required)}</span>
          <span className="font-mono text-xs text-accent-primary tabular-nums ml-auto">{pct.toFixed(0)}%</span>
        </div>
      ) : null}
      <div className={`${barH} bg-bg-elevated overflow-hidden rounded-sm`}>
        <div
          className="h-full bg-accent-primary transition-all duration-500"
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  )
}
