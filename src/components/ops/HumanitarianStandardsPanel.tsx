import { OpsPanel } from '../ui'

const PRINCIPLES = [
  {
    abbr: 'WHO',
    title: 'Humanitarian principles',
    body: 'Humanity, neutrality, impartiality, independence — public WHO emergency response guidance.',
  },
  {
    abbr: 'OCHA',
    title: 'Coordination',
    body: 'Cluster-style information sharing and accountability to affected populations (UN OCHA public frameworks).',
  },
] as const

/** Informational alignment panel — not an official partnership claim. */
export default function HumanitarianStandardsPanel() {
  return (
    <OpsPanel title="Humanitarian standards" accent="left">
      <p className="text-xs text-text-secondary mb-4 leading-relaxed">
        AlgoVault ops workflows are informed by public frameworks. Your organisation remains responsible for
        sanctions screening, beneficiary due diligence, and local licensing.
      </p>
      <ul className="space-y-3">
        {PRINCIPLES.map((p) => (
          <li
            key={p.abbr}
            className="flex gap-3 p-3 rounded-lg border border-border-subtle bg-bg-elevated/40"
          >
            <span className="flex-shrink-0 w-10 h-10 rounded-lg bg-accent-primary/15 text-accent-primary font-bold text-xs flex items-center justify-center">
              {p.abbr}
            </span>
            <div>
              <p className="text-sm font-medium text-text-primary">{p.title}</p>
              <p className="text-xs text-text-tertiary mt-1 leading-relaxed">{p.body}</p>
            </div>
          </li>
        ))}
      </ul>
    </OpsPanel>
  )
}
