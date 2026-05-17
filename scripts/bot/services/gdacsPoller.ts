import { config } from '../config.js'
import { isGdacsProcessed, markGdacsProcessed } from '../stores/processedEventsStore.js'
import { fetchGdacsEvents } from './gdacsFeed.js'
import { broadcastDisasterAlert } from './notificationService.js'

export function startGdacsPoller(): void {
  const tick = async () => {
    try {
      const events = await fetchGdacsEvents()
      for (const e of events.slice(0, 10)) {
        if (isGdacsProcessed(e.externalId)) continue
        markGdacsProcessed(e.externalId)
        const msg = [
          `🚨 *${e.type}* — ${e.region}`,
          `Severity: ${e.severity} · Confidence: ${e.confidence}%`,
          `Source: GDACS (Gora-ready)`,
          e.evidenceUrl,
          ``,
          `Subscribe: /subscribe ${e.type.toLowerCase()}`,
          `Campaigns: /list`,
        ].join('\n')
        const n = await broadcastDisasterAlert(e.type, e.region, msg)
        console.log(`[gdacs] alerted ${n} subscribers for ${e.externalId}`)
      }
    } catch (e) {
      console.error('[gdacs]', e instanceof Error ? e.message : e)
    }
  }
  void tick()
  setInterval(tick, config.gdacsPollMs)
  console.log(`[gdacs] poller every ${config.gdacsPollMs / 60000} min`)
}
