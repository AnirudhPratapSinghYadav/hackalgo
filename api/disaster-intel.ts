import type { VercelRequest, VercelResponse } from '@vercel/node'
import { parseGdacsJson } from '../src/lib/disasterIntelParse'

const GDACS_URL = 'https://www.gdacs.org/gdacsapi/api/events/geteventlist/MAP'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    const upstream = await fetch(GDACS_URL, {
      headers: { Accept: 'application/json' },
    })
    if (!upstream.ok) {
      res.status(502).json({ error: `GDACS upstream ${upstream.status}` })
      return
    }
    const raw = await upstream.json()
    const events = parseGdacsJson(raw as { features?: unknown[] })
    if (events.length === 0) {
      res.status(502).json({ error: 'GDACS feed returned no events' })
      return
    }

    res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=300')
    res.status(200).json({ events, source: 'gdacs', fetchedAt: new Date().toISOString() })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'GDACS fetch failed'
    res.status(500).json({ error: msg })
  }
}
