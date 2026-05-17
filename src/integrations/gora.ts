/**
 * Gora Oracle integration — live disaster signals for ops ingestion.
 *
 * TODO: Replace GDACS fallback with Gora API when `GORA_API_KEY` and `VITE_GORA_API_URL` are provisioned.
 */

export interface LiveDisasterSignal {
  type: string
  region: string
  severity: 'Critical' | 'High' | 'Medium' | 'Low'
  confidence: number
  source: string
  externalId?: string
  evidenceUrl?: string
}

const CACHE_MS = 15 * 60 * 1000
let cache: { at: number; data: LiveDisasterSignal[] } | null = null

function severityFromLevel(level: number): LiveDisasterSignal['severity'] {
  if (level >= 3) return 'Critical'
  if (level === 2) return 'High'
  if (level === 1) return 'Medium'
  return 'Low'
}

async function fetchGdacs(): Promise<LiveDisasterSignal[]> {
  const goraUrl = import.meta.env.VITE_GORA_API_URL as string | undefined
  const goraKey = import.meta.env.VITE_GORA_API_KEY as string | undefined

  if (goraUrl && goraKey) {
    const res = await fetch(goraUrl, {
      headers: { Authorization: `Bearer ${goraKey}`, Accept: 'application/json' },
    })
    if (!res.ok) throw new Error(`Gora API error: ${res.status}`)
    const data = (await res.json()) as { events?: LiveDisasterSignal[] }
    if (!data.events?.length) throw new Error('Gora API returned no events')
    return data.events.map((e) => ({ ...e, source: e.source || 'Gora Oracle' }))
  }

  const res = await fetch('/api/disaster-intel')
  if (!res.ok) throw new Error(`GDACS feed unavailable (${res.status})`)
  const body = (await res.json()) as { events?: Array<Record<string, unknown>> }
  const events = body.events ?? []
  if (events.length === 0) throw new Error('GDACS feed returned no events')

  return events.map((e, i) => ({
    type: String(e.type ?? 'Disaster'),
    region: String(e.region ?? 'Unknown'),
    severity: (e.severity as LiveDisasterSignal['severity']) ?? severityFromLevel(1),
    confidence: Number(e.confidence ?? 60),
    source: 'GDACS (Gora-ready)',
    externalId: String(e.externalId ?? `GDACS-${i}`),
    evidenceUrl: String(e.evidenceUrl ?? 'https://www.gdacs.org/'),
  }))
}

/** Fetch live disasters — throws on failure (no silent mock). */
export async function fetchLiveDisasters(): Promise<LiveDisasterSignal[]> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.data
  const data = await fetchGdacs()
  cache = { at: Date.now(), data }
  return data
}
