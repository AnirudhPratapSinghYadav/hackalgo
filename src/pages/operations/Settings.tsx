import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ExternalLink } from 'lucide-react'
import { useWallet } from '@txnlab/use-wallet-react'
import OpsLayout from '../../components/ops/OpsLayout'
import AppsExplainer from '../../components/ops/AppsExplainer'
import AlertChannelsPanel from '../../components/ops/AlertChannelsPanel'
import HumanitarianStandardsPanel from '../../components/ops/HumanitarianStandardsPanel'
import { OpsPanel, Button } from '../../components/ui'
import { ROUTES } from '../../config/routes'
import { getAppealsHubLoraUrls, getDisasterVaultLoraUrls } from '../../services/humanitarianExplorer'
import { getAdminAddress } from '../../services/communityDonation'
import { uniqueApprovers } from '../../services/disasterVault'
import { truncateAddress } from '../../lib/format'
import { useOpsStore } from '../../store/opsStore'

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="py-3 border-b border-border-subtle last:border-0">
      <p className="text-xs text-text-tertiary mb-1">{label}</p>
      <div className="flex flex-wrap items-center gap-2">
        <code className="font-mono text-xs text-text-primary break-all">{value}</code>
        <Button
          variant="outline"
          className="text-[10px] min-h-0 py-1 px-2"
          type="button"
          onClick={() => {
            void navigator.clipboard.writeText(value).then(() => {
              setCopied(true)
              setTimeout(() => setCopied(false), 2000)
            })
          }}
        >
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
    </div>
  )
}

export default function Settings() {
  const { activeAddress } = useWallet()
  const networkBlock = useOpsStore((s) => s.networkBlock)
  const disaster = getDisasterVaultLoraUrls()
  const appeals = getAppealsHubLoraUrls()
  const admin = getAdminAddress()
  const approvers = uniqueApprovers()

  return (
    <OpsLayout title="Settings" description="Wallet, contracts, funding addresses, and field alerts.">
      <div className="space-y-6 max-w-2xl">
        <OpsPanel title="Wallet & network">
          <dl className="text-sm space-y-4">
            <div>
              <dt className="text-xs text-text-tertiary">Network</dt>
              <dd className="text-text-primary mt-1">{import.meta.env.VITE_NETWORK || 'testnet'}</dd>
            </div>
            <div>
              <dt className="text-xs text-text-tertiary">Block height</dt>
              <dd className="font-mono text-text-primary mt-1">
                {networkBlock > 0 ? networkBlock.toLocaleString() : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-text-tertiary">Connected wallet (Pera)</dt>
              <dd className="font-mono text-xs text-text-primary mt-1">
                {activeAddress ? truncateAddress(activeAddress, 8, 8) : 'Not connected'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-text-tertiary">Campaign admin</dt>
              <dd className="font-mono text-xs text-text-primary mt-1">
                {admin ? truncateAddress(admin, 8, 8) : '—'}
              </dd>
            </div>
            {approvers.length > 0 ? (
              <div>
                <dt className="text-xs text-text-tertiary">Approvers</dt>
                <dd className="mt-1 space-y-1">
                  {approvers.map((a) => (
                    <p key={a} className="font-mono text-[10px] text-text-secondary">
                      {truncateAddress(a, 8, 6)}
                    </p>
                  ))}
                </dd>
              </div>
            ) : null}
          </dl>
          <p className="text-xs text-text-tertiary mt-4 border-t border-border-subtle pt-4">
            Every on-chain action requires signing in Pera. Verify results on the blockchain explorer.
          </p>
        </OpsPanel>

        <OpsPanel title="Verify on blockchain">
          <ul className="space-y-4">
            {disaster ? (
              <li className="flex flex-wrap items-center justify-between gap-3 py-2 border-b border-border-subtle">
                <div>
                  <p className="text-sm text-text-primary">DisasterVault</p>
                  <p className="font-mono text-xs text-text-tertiary">#{disaster.appId}</p>
                </div>
                <a href={disaster.appUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="text-xs min-h-0 py-2 gap-1">
                    Verify on blockchain <ExternalLink className="w-3 h-3" />
                  </Button>
                </a>
              </li>
            ) : null}
            {appeals ? (
              <li className="flex flex-wrap items-center justify-between gap-3 py-2">
                <div>
                  <p className="text-sm text-text-primary">Community appeals</p>
                  <p className="font-mono text-xs text-text-tertiary">#{appeals.appId}</p>
                </div>
                <a href={appeals.appUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="text-xs min-h-0 py-2 gap-1">
                    Verify on blockchain <ExternalLink className="w-3 h-3" />
                  </Button>
                </a>
              </li>
            ) : null}
          </ul>
          {!disaster && !appeals ? (
            <p className="text-xs text-text-tertiary">Configure VITE_DISASTER_APP_ID and VITE_APPEALS_APP_ID.</p>
          ) : null}
        </OpsPanel>

        <OpsPanel title="Fund app accounts (ALGO)">
          <p className="text-xs text-text-secondary mb-4">
            Operational fees only. Donors use in-app Fund; relief uses Disbursements.
          </p>
          {appeals ? <CopyRow label="Community appeals hub" value={appeals.appAddress} /> : null}
          {disaster ? <CopyRow label="DisasterVault" value={disaster.appAddress} /> : null}
        </OpsPanel>

        <OpsPanel title="Field alerts">
          <AlertChannelsPanel variant="ops" />
        </OpsPanel>

        <HumanitarianStandardsPanel />

        <AppsExplainer />

        <details className="border border-border-subtle bg-bg-surface p-4 rounded">
          <summary className="text-sm font-medium text-text-primary cursor-pointer">Legal & compliance</summary>
          <div className="mt-4 text-xs text-text-secondary space-y-3 leading-relaxed">
            <p>
              Informed by public WHO and UN OCHA frameworks — not an official partnership unless agreed in writing.
              Operators handle sanctions screening and beneficiary due diligence.
            </p>
            <p>
              <Link to={ROUTES.terms} className="text-accent-primary">
                Terms
              </Link>
              {' · '}
              <Link to={ROUTES.privacy} className="text-accent-primary">
                Privacy
              </Link>
              {' · '}
              <Link to={ROUTES.disclaimers} className="text-accent-primary">
                Disclaimers
              </Link>
            </p>
          </div>
        </details>
      </div>
    </OpsLayout>
  )
}
