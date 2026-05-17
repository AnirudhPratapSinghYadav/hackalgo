import PublicHeader from '../../components/layout/PublicHeader'
import ComplianceBanner from '../../components/ComplianceBanner'

export default function Disclaimers() {
  return (
    <div className="min-h-screen bg-bg-primary">
      <PublicHeader subtitle="Disclaimers" />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 pb-16 space-y-6">
        <ComplianceBanner />
        <h1 className="font-serif text-3xl text-text-primary">Disclaimers</h1>
        <ul className="list-disc pl-5 text-sm text-text-secondary space-y-3">
          <li>Testnet ALGO has no real-world value. Do not send mainnet assets to testnet addresses.</li>
          <li>Guardian AI and GDACS feeds are advisory; human operators must verify before disbursement.</li>
          <li>Upvotes and social proof do not enable donations — only on-chain active appeal status does.</li>
          <li>AlgoVault is not registered with FIU-IND or equivalent; pilot deployment requires licensed partners in India.</li>
          <li>Smart contracts are unaudited hackathon code; use at your own risk.</li>
        </ul>
      </div>
    </div>
  )
}
