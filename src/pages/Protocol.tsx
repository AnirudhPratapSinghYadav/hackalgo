import PublicHeader from '../components/layout/PublicHeader'

const STEPS = [
  {
    title: 'Detect',
    body: 'Guardian AI monitors satellite imagery, flood sensors, IMD alerts, and GDACS events. Outputs confidence 0–100.',
  },
  {
    title: 'Approve',
    body: 'NDMA or UN staff review evidence and issue a cryptographic approval signature.',
  },
  {
    title: 'Trigger',
    body: 'Multi-sig authorization verified. Loss & Damage Vault releases USDC to verified beneficiary wallets.',
  },
  {
    title: 'Receive',
    body: 'Pera Wallet, MoneyGram cash pickup, or SMS/USSD for feature phones.',
  },
  {
    title: 'Verify',
    body: 'Every release recorded on Algorand. Public audit from donor to recipient.',
  },
]

export default function Protocol() {
  return (
    <div className="min-h-screen bg-bg-primary">
      <PublicHeader subtitle="Verification protocol" />
      <div className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="font-serif text-4xl text-text-primary">How verification and release work</h1>
        <p className="mt-4 text-text-secondary">
          Institutional disasters and community crises share the same integrity model: evidence, human authority, on-chain release.
        </p>
        <ol className="mt-12 space-y-6">
          {STEPS.map((s, i) => (
            <li key={s.title} className="p-6 bg-bg-surface border border-border-subtle border-l-[3px] border-l-accent-primary">
              <p className="font-mono text-[10px] uppercase text-text-tertiary">Step {i + 1}</p>
              <h2 className="font-sans font-semibold text-text-primary mt-1">{s.title}</h2>
              <p className="text-sm text-text-secondary mt-2">{s.body}</p>
            </li>
          ))}
        </ol>
        <p className="mt-10 text-xs text-text-tertiary">
          Community submissions add VerifyChain staked field proof and crowd credibility scoring before vault activation.
        </p>
      </div>
    </div>
  )
}
