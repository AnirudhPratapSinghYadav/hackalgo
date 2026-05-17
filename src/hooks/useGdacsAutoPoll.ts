import { useCallback, useEffect, useState } from 'react'
import { fetchGdacsEvents, gdacsDtoToDisasterEvent } from '../services/gdacsIntel'
import { usePlatformStore } from '../store/platformStore'
import { getGdacsLastFetch, markGdacsFetched, shouldSkipGdacsFetch } from '../lib/gdacsSyncState'

const POLL_MS = 900_000 // 15 minutes
const DISPLAY_TICK_MS = 60_000

function minutesAgo(ts: number): string {
  if (!ts) return 'never'
  const min = Math.floor((Date.now() - ts) / 60_000)
  if (min <= 0) return 'just now'
  if (min === 1) return '1 min ago'
  return `${min} min ago`
}

export function useGdacsAutoPoll() {
  const [busy, setBusy] = useState(false)
  const [lastSyncedAt, setLastSyncedAt] = useState(() => getGdacsLastFetch())
  const [displayTick, setDisplayTick] = useState(0)

  const refreshGdacs = useCallback(async (force = false) => {
    if (!force && shouldSkipGdacsFetch()) {
      const ts = getGdacsLastFetch()
      setLastSyncedAt((prev) => (prev === ts ? prev : ts))
      return
    }
    setBusy(true)
    try {
      const dtos = await fetchGdacsEvents()
      usePlatformStore.getState().replaceGdacsDisasterEvents(dtos.map((d) => gdacsDtoToDisasterEvent(d)))
      markGdacsFetched()
      setLastSyncedAt(Date.now())
    } finally {
      setBusy(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (cancelled) return
      await refreshGdacs(false)
    }
    void run()
    const pollId = window.setInterval(() => {
      if (!cancelled) void refreshGdacs(false)
    }, POLL_MS)
    const displayId = window.setInterval(() => setDisplayTick((t) => t + 1), DISPLAY_TICK_MS)
    return () => {
      cancelled = true
      window.clearInterval(pollId)
      window.clearInterval(displayId)
    }
  }, [refreshGdacs])

  const lastSyncedLabel = minutesAgo(lastSyncedAt)
  void displayTick

  return { busy, lastSyncedLabel, refreshGdacs: () => refreshGdacs(true) }
}
