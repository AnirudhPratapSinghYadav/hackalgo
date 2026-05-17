import { ExternalLink } from 'lucide-react'
import { getAppealsHubLoraUrls, getDisasterVaultLoraUrls } from '../../services/humanitarianExplorer'
import { Button } from '../ui'
import { EXPLORER_APP_LINK } from '../../lib/explorerCopy'

/** Contract verification links — on-chain state, not in-app JSON. */
export default function LoraVerifyPanel() {
  const disaster = getDisasterVaultLoraUrls()
  const appeals = getAppealsHubLoraUrls()

  if (!disaster && !appeals) {
    return <p className="text-sm text-text-tertiary">Set VITE_DISASTER_APP_ID and VITE_APPEALS_APP_ID in .env</p>
  }

  return (
    <ul className="space-y-3">
      {disaster ? (
        <li className="flex flex-wrap items-center justify-between gap-3 py-3 border-b border-border-subtle">
          <div>
            <p className="text-sm text-text-primary">DisasterVault</p>
            <p className="font-mono text-xs text-text-tertiary mt-0.5">#{disaster.appId}</p>
          </div>
          <a href={disaster.appUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" className="text-xs min-h-0 py-2 gap-1">
              {EXPLORER_APP_LINK} <ExternalLink className="w-3 h-3" />
            </Button>
          </a>
        </li>
      ) : null}
      {appeals ? (
        <li className="flex flex-wrap items-center justify-between gap-3 py-3">
          <div>
            <p className="text-sm text-text-primary">Community appeals</p>
            <p className="font-mono text-xs text-text-tertiary mt-0.5">#{appeals.appId}</p>
          </div>
          <a href={appeals.appUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" className="text-xs min-h-0 py-2 gap-1">
              {EXPLORER_APP_LINK} <ExternalLink className="w-3 h-3" />
            </Button>
          </a>
        </li>
      ) : null}
    </ul>
  )
}
