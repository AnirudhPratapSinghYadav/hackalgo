import { useEffect, useRef, useState } from 'react'
import { usePlatformStore } from '../store/platformStore'
import { fetchLiveDisasters } from '../integrations/gora'
import { fetchGdacsEvents, gdacsDtoToDisasterEvent } from '../services/gdacsIntel'
import { fetchOnChainAppeals, fetchOnChainCampaigns } from '../services/chainRead'
import { markGdacsFetched } from '../lib/gdacsSyncState'

const STRICT = import.meta.env.VITE_DEMO_STRICT === 'true'

/** Bootstrap chain + GDACS once per app session (avoids effect dependency loops). */
export function useChainBootstrap() {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true

    void (async () => {
      const { mergeLiveDisasterEvents, hydrateFromChain } = usePlatformStore.getState()
      try {
        const tasks: Promise<void>[] = []

        if (import.meta.env.VITE_DISASTER_APP_ID) {
          tasks.push(
            fetchOnChainCampaigns().then(({ campaigns, events }) => {
              hydrateFromChain({ campaigns, disasterEvents: events })
            }),
          )
        }

        if (import.meta.env.VITE_APPEALS_APP_ID) {
          tasks.push(
            fetchOnChainAppeals().then((crises) => {
              hydrateFromChain({ crises })
            }),
          )
        }

        tasks.push(
          fetchGdacsEvents()
            .then((dtos) => {
              mergeLiveDisasterEvents(dtos.map((d) => gdacsDtoToDisasterEvent(d)))
              markGdacsFetched()
            })
            .catch(() =>
              fetchLiveDisasters()
                .then((signals) =>
                  mergeLiveDisasterEvents(
                    signals.map((s, i) =>
                      gdacsDtoToDisasterEvent({
                        externalId: s.externalId ?? `GDACS-${i}`,
                        type: s.type,
                        region: s.region,
                        severity: s.severity,
                        confidence: s.confidence,
                        evidenceUrl: s.evidenceUrl ?? 'https://www.gdacs.org/',
                        detectedAt: new Date().toISOString(),
                      }),
                    ),
                  ),
                )
                .catch((e) => {
                  if (STRICT) throw e
                }),
            ),
        )

        await Promise.all(tasks)
        setError(null)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Bootstrap failed')
      } finally {
        setReady(true)
      }
    })()
  }, [])

  return { ready, error, isStrict: STRICT }
}
