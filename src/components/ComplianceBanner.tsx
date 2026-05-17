import { Link } from 'react-router-dom'
import { ROUTES } from '../config/routes'

export default function ComplianceBanner() {
  return (
    <div className="border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-xs text-text-secondary leading-relaxed">
      <strong className="text-amber-200 font-medium">Important:</strong> AlgoVault uses Algorand{' '}
      <span className="font-mono">testnet</span> for humanitarian workflows. Verify all disbursements with field
      partners. Not medical or legal endorsement. No PII on-chain.{' '}
      <Link to={ROUTES.disclaimers} className="text-accent-primary hover:text-accent-hover underline">
        Disclaimers
      </Link>
      {' · '}
      <Link to={ROUTES.terms} className="text-accent-primary hover:text-accent-hover underline">
        Terms
      </Link>
      {' · '}
      <Link to={ROUTES.privacy} className="text-accent-primary hover:text-accent-hover underline">
        Privacy
      </Link>
    </div>
  )
}
