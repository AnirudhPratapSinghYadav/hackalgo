import type { DisasterEvent } from '../domain/platform'
import type { Crisis } from '../types/crisis'
import { countryCentroid } from './countryCentroids'

function hashSeed(seed: string): number {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0
  return Math.abs(h)
}

/** Small jitter so stacked markers remain clickable (degrees). */
export function offsetMapPosition(base: [number, number], seed: string): [number, number] {
  const h = hashSeed(seed)
  const angle = ((h % 360) * Math.PI) / 180
  const r = 0.08 + (h % 50) / 500
  return [base[0] + r * Math.cos(angle), base[1] + r * Math.sin(angle)]
}

function isValidCoord(lat: number, lon: number): boolean {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return false
  if (lat === 0 && lon === 0) return false
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return false
  return true
}

/** Normalize GDACS / GeoJSON coords; fix common lat/lon swap. */
export function normalizeCoordinates(
  lat: number | undefined,
  lon: number | undefined,
): [number, number] | null {
  if (lat == null || lon == null) return null
  let la = lat
  let lo = lon
  if (!isValidCoord(la, lo) && isValidCoord(lo, la)) {
    ;[la, lo] = [lo, la]
  }
  if (!isValidCoord(la, lo)) return null
  return [la, lo]
}

/** Deterministic point near a country when no GDACS geometry exists. */
export function fallbackPosition(seed: string, region?: string): [number, number] {
  const centroid = region ? countryCentroid(region) : null
  if (centroid) return offsetMapPosition(centroid, seed)
  const h = hashSeed(seed)
  const h2 = hashSeed(`${seed}-lon`)
  const lat = -60 + ((h % 10_000) / 10_000) * 75
  const lon = -170 + ((h2 % 10_000) / 10_000) * 340
  return [lat, lon]
}

export function eventMapPosition(event: DisasterEvent): [number, number] {
  const normalized = normalizeCoordinates(event.latitude, event.longitude)
  if (normalized) return offsetMapPosition(normalized, event.id)
  return fallbackPosition(`${event.id}-${event.location}`, event.location)
}

export function crisisMapPosition(crisis: Crisis): [number, number] {
  if (crisis.location.coordinates) {
    const [a, b] = crisis.location.coordinates
    // Seed data stores [lat, lng]; GeoJSON uses [lng, lat]
    const asGeoJson = normalizeCoordinates(b, a) ?? normalizeCoordinates(a, b)
    if (asGeoJson) {
      const [lat, lon] = asGeoJson
      return offsetMapPosition([lat, lon], crisis.id)
    }
  }
  const region = `${crisis.location.city} ${crisis.location.state}`.trim()
  return fallbackPosition(`${crisis.id}-${region}`, region)
}

export function isActiveDisruptiveEvent(event: DisasterEvent): boolean {
  return !['closed', 'disbursed'].includes(event.opsStatus)
}
