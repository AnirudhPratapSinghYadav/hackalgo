import { parseGdacsJson, type ParsedDisasterEvent } from '../../../src/lib/disasterIntelParse.js'

const GDACS_URL = 'https://www.gdacs.org/gdacsapi/api/events/geteventlist/MAP'

export async function fetchGdacsEvents(): Promise<ParsedDisasterEvent[]> {
  const res = await fetch(GDACS_URL, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`GDACS feed unavailable (${res.status})`)
  const raw = (await res.json()) as { features?: unknown[] }
  const events = parseGdacsJson(raw)
  if (events.length === 0) throw new Error('GDACS returned no events')
  return events
}
