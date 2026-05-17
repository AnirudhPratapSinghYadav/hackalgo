import type { ReactNode } from 'react'

interface OpsPanelProps {
  title: string
  children: ReactNode
  action?: ReactNode
  className?: string
  accent?: 'left' | 'none'
  noPadding?: boolean
}

export default function OpsPanel({
  title,
  children,
  action,
  className = '',
  accent = 'none',
  noPadding = false,
}: OpsPanelProps) {
  return (
    <section
      className={`bg-bg-surface border border-border-subtle ${
        accent === 'left' ? 'border-l-[3px] border-l-accent-primary' : ''
      } ${className}`}
    >
      <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-border-subtle">
        <h2 className="font-sans text-sm font-semibold text-text-primary tracking-tight">{title}</h2>
        {action}
      </div>
      <div className={noPadding ? '' : 'p-6'}>{children}</div>
    </section>
  )
}
