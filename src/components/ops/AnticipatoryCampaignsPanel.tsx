import { useState } from 'react'
import { Zap } from 'lucide-react'
import { OpsPanel, Button } from '../ui'
import { usePlatformStore } from '../../store/platformStore'
import { TRIGGER_LABELS } from '../../domain/campaignOpsMeta'
import type { CampaignOpsMeta } from '../../domain/campaignOpsMeta'

function progressPct(meta: CampaignOpsMeta): number {
  const threshold = meta.triggerThreshold ?? 1
  const current = meta.currentTriggerValue ?? 0
  return Math.min(100, Math.round((current / threshold) * 100))
}

export default function AnticipatoryCampaignsPanel() {
  const metaMap = usePlatformStore((s) => s.campaignOpsMeta)
  const simulate = usePlatformStore((s) => s.simulateAnticipatoryTrigger)
  const [toast, setToast] = useState<string | null>(null)

  const campaigns = Object.values(metaMap).filter((m) => m.kind === 'anticipatory')
  if (campaigns.length === 0) return null

  const showToast = (msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast(null), 5000)
  }

  return (
    <OpsPanel title="Anticipatory relief" accent="left" className="mb-8">
      <p className="text-xs text-text-secondary mb-4">
        Parametric triggers — funds release automatically when live sensor thresholds are crossed (demo simulation
        available).
      </p>
      {toast ? (
        <p className="mb-3 text-xs text-accent-primary border border-accent-primary/30 bg-accent-primary/5 px-3 py-2">
          {toast}
        </p>
      ) : null}
      <ul className="space-y-4">
        {campaigns.map((meta) => {
          const pct = progressPct(meta)
          const paramLabel = meta.triggerParameter ? TRIGGER_LABELS[meta.triggerParameter] : 'Trigger'
          return (
            <li key={meta.onChainCampaignId} className="border border-border-subtle p-4 bg-bg-elevated/40">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-text-primary flex items-center gap-2">
                    <Zap className="w-4 h-4 text-alert-warning" aria-hidden />
                    {meta.name}
                    <span className="font-mono text-[10px] text-text-tertiary">#{meta.onChainCampaignId}</span>
                  </p>
                  <p className="text-xs text-text-tertiary mt-1">{meta.region}</p>
                  <p className="text-xs text-text-secondary mt-2">
                    {meta.monitoringStatus ??
                      `Monitoring — will auto-disburse if ${paramLabel.toLowerCase()} exceeds ${meta.triggerThreshold}`}
                  </p>
                </div>
                <Button
                  variant="outline"
                  type="button"
                  className="text-[10px] shrink-0"
                  onClick={() => {
                    simulate(meta.onChainCampaignId)
                    showToast('Demo: auto-disbursement would happen now')
                  }}
                >
                  Simulate trigger
                </Button>
              </div>
              <div className="mt-3">
                <div className="flex justify-between text-[10px] font-mono text-text-tertiary mb-1">
                  <span>
                    {paramLabel}: {(meta.currentTriggerValue ?? 0).toFixed(1)} / {meta.triggerThreshold}
                  </span>
                  <span>{pct}%</span>
                </div>
                <div className="h-2 bg-bg-primary border border-border-subtle overflow-hidden">
                  <div className="h-full bg-accent-primary transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </OpsPanel>
  )
}
