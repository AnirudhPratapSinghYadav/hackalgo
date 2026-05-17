/** Extract representative lon/lat from GDACS GeoJSON geometries. */

function collectPoints(raw: unknown, out: [number, number][]): void {
  if (!Array.isArray(raw)) return
  if (raw.length >= 2 && typeof raw[0] === 'number' && typeof raw[1] === 'number') {
    out.push([raw[0] as number, raw[1] as number])
    return
  }
  for (const child of raw) collectPoints(child, out)
}

/** GeoJSON uses [longitude, latitude]. Returns [lon, lat] or null. */
export function lonLatFromGeometry(geometry: { coordinates?: unknown } | undefined): [number, number] | null {
  if (!geometry?.coordinates) return null
  const points: [number, number][] = []
  collectPoints(geometry.coordinates, points)
  if (points.length === 0) return null
  const lon = points.reduce((s, p) => s + p[0], 0) / points.length
  const lat = points.reduce((s, p) => s + p[1], 0) / points.length
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null
  return [lon, lat]
}
