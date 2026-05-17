import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  description?: string
  /** Segment after "Operations /" */
  breadcrumb?: string
  actions?: ReactNode
}

export default function PageHeader({ title, description, breadcrumb, actions }: PageHeaderProps) {
  return (
    <header className="mb-8 pb-6 border-b border-border-subtle">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-label text-text-tertiary mb-2">
            Operations / {breadcrumb ?? title}
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl text-text-primary leading-tight">{title}</h1>
          {description ? (
            <p className="mt-2 text-text-secondary max-w-3xl text-sm sm:text-base leading-relaxed">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2 shrink-0">{actions}</div> : null}
      </div>
    </header>
  )
}
