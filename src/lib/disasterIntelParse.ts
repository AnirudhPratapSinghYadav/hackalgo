/** Shared GDACS JSON → normalized events (Vite middleware + Vercel API). */

import { confidenceFromGdacsTier, gdacsAlertTier, severityFromGdacsTier } from './gdacsAlertLevel'

export interface ParsedDisasterEvent {
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

export function parseGdacsJson(raw: { features?: unknown[] }): ParsedDisasterEvent[] {
  const features = raw.features ?? []
  return features.slice(0, 30).map((f: unknown, i: number) => {
    const feat = f as {
      properties?: Record<string, string>
      geometry?: { coordinates?: number[] }
    }
    const props = feat.properties ?? {}
    const coords = feat.geometry?.coordinates
    const eventId = String(props.eventid ?? props.eventname ?? `gdacs-${i}`)
    const alertTier = gdacsAlertTier(props)
    return {
      externalId: `GDACS-${eventId}`,
      type: String(props.eventtype ?? props.hazard ?? 'Disaster'),
      region: String(props.country ?? props.name ?? 'Unknown'),
      lat: coords?.[1],
      lon: coords?.[0],
      severity: severityFromGdacsTier(alertTier),
      confidence: confidenceFromGdacsTier(alertTier),
      evidenceUrl: String(props.url ?? 'https://www.gdacs.org/'),
      detectedAt: props.fromdate ? new Date(props.fromdate).toISOString() : new Date().toISOString(),
    }
  })
}
