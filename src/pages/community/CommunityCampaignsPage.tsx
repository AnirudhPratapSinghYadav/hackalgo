import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { usePlatformStore } from '../../store/platformStore'
import { formatUsdc } from '../../lib/format'
import { ROUTES } from '../../config/routes'
import { readCampaignState, isDisasterVaultConfigured } from '../../services/disasterVault'
import type { DisasterEvent } from '../../domain/platform'

export default function CommunityCampaignsPage() {
  const events = usePlatformStore((s) => s.disasterEvents.filter((e) => e.onChainCampaignId))
  const [chain, setChain] = useState<Record<number, { raised: number; target: number }>>({})

  useEffect(() => {
    if (!isDisasterVaultConfigured()) return
    void (async () => {
      const next: Record<number, { raised: number; target: number }> = {}
      for (const e of events) {
        if (!e.onChainCampaignId) continue
        try {
          const s = await readCampaignState(e.onChainCampaignId)
          next[e.onChainCampaignId] = { raised: s.raised / 1_000_000, target: s.target / 1_000_000 }
        } catch {
          /* skip */
        }
      }
      setChain(next)
    })()
  }, [events])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 pb-16">
      <p className="text-sm text-text-secondary mb-6 max-w-2xl">
        Institutional DisasterVault campaigns — raised amounts read from chain when configured.
      </p>
      <div className="grid gap-5 md:grid-cols-2">
        {events.length === 0 ? (
          <p className="font-mono text-sm text-text-tertiary col-span-2">No on-chain campaigns yet.</p>
        ) : (
          events.map((e: DisasterEvent) => {
            const cid = e.onChainCampaignId!
            const c = chain[cid]
            const raised = c?.raised ?? 0
            const goal = c?.target ?? 10
            const pct = goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : 0
            return (
              <article key={e.id} className="border border-border-subtle bg-bg-surface p-6 flex flex-col">
                <span className="font-mono text-[10px] text-text-tertiary uppercase">
                  {e.dataSource} · campaign #{cid}
                </span>
                <h2 className="font-serif text-xl text-text-primary mt-2">{e.location}</h2>
                <p className="mt-2 text-sm text-text-secondary flex-1">{e.type}</p>
                <div className="mt-4 space-y-2">
                  <div className="h-1 bg-white/10 overflow-hidden">
                    <div className="h-full bg-accent-primary" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex justify-between text-xs font-mono text-text-secondary">
                    <span>{formatUsdc(raised)} ALGO raised</span>
                    <span>Goal {formatUsdc(goal)} ALGO</span>
                  </div>
                </div>
                <Link to={ROUTES.operationsEvents} className="mt-4 text-sm text-accent-primary">
                  Operations →
                </Link>
              </article>
            )
          })
        )}
      </div>
    </div>
  )
}
