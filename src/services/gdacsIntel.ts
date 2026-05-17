import type { DisasterEvent } from '../domain/platform'
import { confidenceFromGdacsTier, gdacsAlertTier, severityFromGdacsTier } from '../lib/gdacsAlertLevel'
import { normalizeCoordinates } from '../lib/geo'
import { lonLatFromGeometry } from '../lib/gdacsGeometry'

export interface GdacsEventDto {
  externalId: string
  type: string
  region: string
  lat?: number
  lon?: number
  severity: 'Critical' | 'High' | 'Medium' | 'Low'
  confidence: number
  evidenceUrl: string
  detectedAt: string
}

const GDACS_PROXY = '/gdacs-api/api/events/geteventlist/MAP'


/** Fetch normalized GDACS events (via Vite dev proxy or same-origin API route). */
export async function fetchGdacsEvents(): Promise<GdacsEventDto[]> {
  const res = await fetch(GDACS_PROXY)
  if (!res.ok) throw new Error(`GDACS fetch failed: ${res.status}`)
  const data = (await res.json()) as { features?: Array<Record<string, unknown>> }
  const features = data.features ?? []

  const seen = new Set<string>()
  const parsed: GdacsEventDto[] = []

  for (let i = 0; i < features.length && parsed.length < 25; i++) {
    const f = features[i]
    const props = (f.properties ?? {}) as Record<string, string>
    const geom = f.geometry as { type?: string; coordinates?: unknown } | undefined
    let lat: number | undefined
    let lon: number | undefined

    const propsLat = parseFloat(String(props.latitude ?? props.lat ?? ''))
    const propsLon = parseFloat(String(props.longitude ?? props.lon ?? ''))
    if (Number.isFinite(propsLat) && Number.isFinite(propsLon)) {
      lat = propsLat
      lon = propsLon
    }

    const fromGeom = lonLatFromGeometry(geom)
    if (fromGeom) {
      lon = fromGeom[0]
      lat = fromGeom[1]
    }

    const eventId = String(props.eventid ?? props.eventname ?? `gdacs-${i}`)
    const externalId = `GDACS-${eventId}`
    if (seen.has(externalId)) continue
    seen.add(externalId)

    const alertTier = gdacsAlertTier(props)
    const region =
      String(props.country ?? props.countryname ?? props.name ?? props.description ?? 'Unknown region').trim() ||
      'Unknown region'

    parsed.push({
      externalId,
      type: String(props.eventtype ?? props.hazard ?? 'Disaster'),
      region,
      lat,
      lon,
      severity: severityFromGdacsTier(alertTier),
      confidence: confidenceFromGdacsTier(alertTier),
      evidenceUrl: String(props.url ?? props.link ?? 'https://www.gdacs.org/'),
      detectedAt: props.fromdate
        ? new Date(props.fromdate).toISOString()
        : new Date().toISOString(),
    })
  }

  return parsed
}

function mapGdacsType(raw: string): DisasterEvent['type'] {
  const t = raw.toLowerCase()
  if (t.includes('cyclone') || t.includes('hurricane')) return 'Cyclone'
  if (t.includes('drought')) return 'Drought'
  if (t.includes('fire') || t.includes('wildfire')) return 'Fire'
  return 'Flood'
}

function mapGdacsSeverity(s: GdacsEventDto['severity']): DisasterEvent['severity'] {
  if (s === 'Low') return 'Medium'
  return s
}

export function gdacsDtoToDisasterEvent(dto: GdacsEventDto): DisasterEvent {
  const coords = normalizeCoordinates(dto.lat, dto.lon)
  const confidence = Number.isFinite(dto.confidence) ? dto.confidence : confidenceFromGdacsTier(1)
  return {
    id: `EVT-${dto.externalId.replace(/[^a-zA-Z0-9-]/g, '')}`,
    location: dto.region,
    type: mapGdacsType(dto.type),
    severity: mapGdacsSeverity(dto.severity),
    confidence,
    status: 'Pending Approval',
    opsStatus: 'detected',
    detectedAt: dto.detectedAt,
    externalId: dto.externalId,
    evidenceUrl: dto.evidenceUrl,
    dataSource: 'live',
    sourceLabels: ['GDACS'],
    district: undefined,
    state: undefined,
    latitude: coords?.[0],
    longitude: coords?.[1],
  }
}
