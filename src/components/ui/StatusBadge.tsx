import type { ReactNode } from 'react'

export type StatusBadgeVariant =
  | 'operational'
  | 'attention'
  | 'critical'
  | 'pending'
  | 'verified'
  | 'neutral'
  | 'info'

const VARIANT_STYLES: Record<StatusBadgeVariant, string> = {
  operational: 'bg-alert-success/15 text-alert-success border-alert-success/30',
  verified: 'bg-alert-success/15 text-alert-success border-alert-success/30',
  attention: 'bg-alert-warning/15 text-alert-warning border-alert-warning/30',
  pending: 'bg-alert-warning/15 text-alert-warning border-alert-warning/30',
  critical: 'bg-alert-critical/15 text-alert-critical border-alert-critical/30',
  info: 'bg-alert-info/15 text-text-secondary border-alert-info/30',
  neutral: 'bg-bg-elevated text-text-secondary border-border-medium',
}

interface StatusBadgeProps {
  children: ReactNode
  variant?: StatusBadgeVariant
  className?: string
  dot?: boolean
}

export default function StatusBadge({ children, variant = 'neutral', className = '', dot }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono uppercase tracking-wide border ${VARIANT_STYLES[variant]} ${className}`}
    >
      {dot ? (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
            variant === 'operational' || variant === 'verified'
              ? 'bg-alert-success'
              : variant === 'critical'
                ? 'bg-alert-critical'
                : variant === 'attention' || variant === 'pending'
                  ? 'bg-alert-warning'
                  : 'bg-text-tertiary'
          }`}
          aria-hidden
        />
      ) : null}
      {children}
    </span>
  )
}
