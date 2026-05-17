import PublicHeader from '../../components/layout/PublicHeader'
import ComplianceBanner from '../../components/ComplianceBanner'

export default function Privacy() {
  return (
    <div className="min-h-screen bg-bg-primary">
      <PublicHeader subtitle="Privacy" />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 pb-16 space-y-6">
        <ComplianceBanner />
        <h1 className="font-serif text-3xl text-text-primary">Privacy</h1>
        <p className="text-sm text-text-secondary leading-relaxed">
          We do not store government IDs or health records on-chain. Wallet addresses, transaction amounts, and appeal
          metadata URIs you submit may be public on Algorand testnet. Browser local storage may cache UI state for your
          session. GDACS and blockchain ledger data are fetched from third-party endpoints.
        </p>
        <p className="text-sm text-text-secondary leading-relaxed">
          For production, a licensed operator would publish a full privacy policy and data retention schedule aligned with
          applicable law.
        </p>
      </div>
    </div>
  )
}
