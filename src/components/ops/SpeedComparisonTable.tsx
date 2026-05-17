const ROWS = [
  { traditional: 'Disaster declaration', traditionalVal: '3–10 days', algovault: 'Live feed detection', algovaultVal: '0 days' },
  { traditional: 'Fund verification', traditionalVal: '4–8 weeks', algovault: 'Multi-signature', algovaultVal: '< 2 hours' },
  { traditional: 'Beneficiary onboarding', traditionalVal: '2–6 weeks', algovault: 'Pre-verified wallets', algovaultVal: '0 days' },
  { traditional: 'Funds reach recipients', traditionalVal: '14–26 months', algovault: 'On-chain release', algovaultVal: '< 4 hours' },
  { traditional: 'Audit trail', traditionalVal: 'Manual, weeks', algovault: 'Blockchain proof', algovaultVal: 'Instant' },
] as const

export default function SpeedComparisonTable() {
  return (
    <div className="overflow-hidden rounded-lg border border-border-subtle bg-bg-surface">
      <div className="border-b border-border-subtle px-5 py-4">
        <h2 className="font-sans text-sm font-semibold text-text-primary">Speed comparison</h2>
        <p className="mt-1 text-xs text-text-tertiary">Traditional aid vs AlgoVault on testnet</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border-subtle bg-bg-elevated/60">
              <th className="px-5 py-2.5 text-left font-mono text-[10px] uppercase tracking-label text-alert-critical">
                Traditional aid
              </th>
              <th className="px-5 py-2.5 text-left font-mono text-[10px] uppercase tracking-label text-accent-primary">
                AlgoVault
              </th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.traditional} className="border-b border-border-subtle last:border-b-0">
                <td className="px-5 py-3 text-text-secondary align-top">
                  <span className="block text-xs text-text-tertiary">{row.traditional}</span>
                  <strong className="text-text-primary">{row.traditionalVal}</strong>
                </td>
                <td className="px-5 py-3 text-text-secondary align-top bg-accent-primary/[0.04]">
                  <span className="block text-xs text-text-tertiary">{row.algovault}</span>
                  <strong className="text-accent-primary">{row.algovaultVal}</strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="border-t border-border-subtle px-5 py-2 font-mono text-[10px] text-text-tertiary">
        Sources: FEMA, UN OCHA, World Bank studies 2018–2024
      </p>
    </div>
  )
}
