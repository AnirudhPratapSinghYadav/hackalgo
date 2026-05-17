import type { ReactNode } from 'react'

export type TerminalLogLevel = 'info' | 'success' | 'warn' | 'error' | 'system'

export interface TerminalLogEntry {
  id?: string
  timestamp: string
  level?: TerminalLogLevel
  message: string
  meta?: string
}

const LEVEL_STYLES: Record<TerminalLogLevel, string> = {
  info: 'text-text-secondary',
  success: 'text-alert-success',
  warn: 'text-alert-warning',
  error: 'text-alert-critical',
  system: 'text-accent-primary',
}

interface TerminalLogProps {
  entries: TerminalLogEntry[]
  title?: string
  maxHeight?: string
  className?: string
  footer?: ReactNode
}

export default function TerminalLog({
  entries,
  title = 'System log',
  maxHeight = 'max-h-64',
  className = '',
  footer,
}: TerminalLogProps) {
  return (
    <div className={`terminal-log ${className}`}>
      <div className="flex items-center justify-between px-4 py-2 border-b border-border-subtle bg-bg-primary/50">
        <p className="font-mono text-[10px] uppercase tracking-label text-text-tertiary">{title}</p>
        <span className="font-mono text-[10px] text-text-tertiary">{entries.length} entries</span>
      </div>
      <ul className={`overflow-y-auto ${maxHeight} p-2 space-y-0.5`} role="log">
        {entries.map((entry, i) => (
          <li
            key={entry.id ?? `${entry.timestamp}-${i}`}
            className="font-mono text-[11px] leading-relaxed px-2 py-1 hover:bg-bg-elevated/50 flex flex-wrap gap-x-3 gap-y-0.5"
          >
            <span className="text-text-tertiary shrink-0">{entry.timestamp}</span>
            {entry.level ? (
              <span className={`uppercase shrink-0 w-14 ${LEVEL_STYLES[entry.level]}`}>{entry.level}</span>
            ) : null}
            <span className="text-text-primary flex-1 min-w-[12rem]">{entry.message}</span>
            {entry.meta ? <span className="text-text-tertiary">{entry.meta}</span> : null}
          </li>
        ))}
      </ul>
      {footer ? <div className="px-4 py-2 border-t border-border-subtle">{footer}</div> : null}
    </div>
  )
}
