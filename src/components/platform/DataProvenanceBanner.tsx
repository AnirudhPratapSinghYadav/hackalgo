import type { DataProvenance } from '../../domain/platform'

const LABELS: Record<DataProvenance, { title: string; detail: string }> = {
  live: {
    title: 'Live data',
    detail: 'Sourced from blockchain ledger sync and public disaster feeds.',
  },
  verified: {
    title: 'Verified data',
    detail: 'Cross-checked records from operations workflow.',
  },
  demo: {
    title: 'Demo mode',
    detail: 'Session actions are simulated; not public operational truth.',
  },
  seed: {
    title: 'Seeded demonstration data',
    detail: 'Structured like production records for review — not live field truth.',
  },
}

export default function DataProvenanceBanner({
  provenance,
  className = '',
}: {
  provenance: DataProvenance
  className?: string
}) {
  const { title, detail } = LABELS[provenance]
  const isDemo = provenance === 'demo' || provenance === 'seed'
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center gap-2 px-4 py-3 border text-sm ${className}`}
      style={{
        borderColor: provenance === 'live' ? 'rgba(74,222,128,0.35)' : 'rgba(255,255,255,0.08)',
        background: isDemo ? 'rgba(234,179,8,0.06)' : 'rgba(255,255,255,0.03)',
      }}
    >
      <span className="font-mono text-[10px] uppercase tracking-widest text-accent-primary shrink-0">
        {title}
      </span>
      <p className="text-text-secondary leading-snug">{detail}</p>
    </div>
  )
}
