import PublicHeader from '../../components/layout/PublicHeader'
import ComplianceBanner from '../../components/ComplianceBanner'

export default function Terms() {
  return (
    <div className="min-h-screen bg-bg-primary">
      <PublicHeader subtitle="Terms of use" />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 pb-16 space-y-6">
        <ComplianceBanner />
        <h1 className="font-serif text-3xl text-text-primary">Terms of use</h1>
        <p className="text-sm text-text-secondary leading-relaxed">
          AlgoVault is a testnet pilot for humanitarian disbursement and community appeals. By using this site you
          agree that funds are experimental ALGO on Algorand testnet with no monetary value. Operators may pause or
          reset campaigns. You are responsible for wallet security and accurate beneficiary addresses.
        </p>
        <p className="text-sm text-text-secondary leading-relaxed">
          Admin approval of an appeal does not constitute medical, legal, or charitable endorsement. Dispute resolution
          is limited to on-chain audit trails and operator review.
        </p>
      </div>
    </div>
  )
}
