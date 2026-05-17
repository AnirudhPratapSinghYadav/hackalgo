import { OpsPanel } from '../ui'

const SAVINGS = Number(import.meta.env.VITE_APP_ID) || 0
const DISASTER = Number(import.meta.env.VITE_DISASTER_APP_ID) || 0
const APPEALS = Number(import.meta.env.VITE_APPEALS_APP_ID) || 0

export default function AppsExplainer() {
  return (
    <OpsPanel title="Why three app IDs?">
      <p className="text-xs text-text-secondary mb-4 leading-relaxed">
        AlgoVault is one product with three on-chain programs. They cannot be a single app without a new unified
        contract (different assets and rules).
      </p>
      <ul className="space-y-3 text-sm">
        <li className="border-l-2 border-border-medium pl-3">
          <strong className="text-text-primary">Savings Guardian</strong>
          <span className="font-mono text-xs text-text-tertiary ml-2">#{SAVINGS || '—'}</span>
          <p className="text-xs text-text-tertiary mt-1">Personal / education vaults in ALGO. Dashboard & Guardian AI.</p>
        </li>
        <li className="border-l-2 border-accent-primary pl-3">
          <strong className="text-text-primary">DisasterVault</strong>
          <span className="font-mono text-xs text-text-tertiary ml-2">#{DISASTER || '—'}</span>
          <p className="text-xs text-text-tertiary mt-1">Institutional USDC campaigns · multi-approver · disburse.</p>
        </li>
        <li className="border-l-2 border-community-verified pl-3">
          <strong className="text-text-primary">Community appeals</strong>
          <span className="font-mono text-xs text-text-tertiary ml-2">#{APPEALS || '—'}</span>
          <p className="text-xs text-text-tertiary mt-1">Community ALGO appeals · admin approve · fund.</p>
        </li>
      </ul>
      <p className="text-[10px] font-mono text-text-tertiary mt-4">
        Operations use DisasterVault and Community appeals. Alerts are delivered via Telegram Guardian (configured in Settings).
      </p>
    </OpsPanel>
  )
}
