import { Link } from 'react-router-dom'
import PublicHeader from '../components/layout/PublicHeader'

export default function About() {
  return (
    <div className="min-h-screen bg-bg-primary">
      <PublicHeader subtitle="Mission" />
      <article className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="font-serif text-4xl text-text-primary">Institutional disaster disbursement infrastructure</h1>
        <p className="mt-6 text-text-secondary leading-relaxed">
          AlgoVault connects institutional donors, national disaster management authorities, and last-mile beneficiaries
          through verified release pipelines on Algorand. Guardian AI monitors multi-source intelligence; human officers
          issue cryptographic approvals; smart contracts execute transparent disbursements.
        </p>
        <p className="mt-4 text-text-secondary leading-relaxed">
          The community crisis layer extends the same verification model to hyperlocal individual emergencies—house fires,
          medical bills, crop loss—moderated by staked field verifiers instead of influencer reposts.
        </p>
        <div className="mt-10 flex flex-wrap gap-4">
          <Link to="/access" className="px-6 py-3 bg-accent-primary text-text-inverse font-medium">
            Access operations
          </Link>
          <Link to="/community" className="px-6 py-3 border border-border-medium text-text-secondary">
            Community feed
          </Link>
        </div>
      </article>
    </div>
  )
}
