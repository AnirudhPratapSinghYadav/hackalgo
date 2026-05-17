/** Approximate country centroids [lat, lon] for GDACS events missing geometry. */
const CENTROIDS: Record<string, [number, number]> = {
  indonesia: [-2.5, 118.0],
  australia: [-25.0, 133.0],
  türkiye: [39.0, 35.0],
  turkey: [39.0, 35.0],
  india: [22.0, 79.0],
  nepal: [28.4, 84.1],
  bangladesh: [23.7, 90.4],
  pakistan: [30.4, 69.3],
  'sri lanka': [7.9, 80.8],
  philippines: [12.9, 121.8],
  vietnam: [14.1, 108.3],
  thailand: [15.9, 100.9],
  myanmar: [19.8, 96.1],
  china: [35.0, 103.0],
  japan: [36.2, 138.3],
  'united states': [39.8, -98.5],
  usa: [39.8, -98.5],
  mexico: [23.6, -102.5],
  brazil: [-14.2, -51.9],
  peru: [-9.2, -75.0],
  chile: [-35.7, -71.5],
  argentina: [-38.4, -63.6],
  colombia: [4.6, -74.1],
  'south africa': [-30.6, 22.9],
  kenya: [-0.02, 37.9],
  ethiopia: [9.1, 40.5],
  nigeria: [9.1, 8.7],
  somalia: [5.2, 46.2],
  sudan: [15.5, 32.5],
  egypt: [26.8, 30.8],
  iran: [32.4, 53.7],
  iraq: [33.2, 43.7],
  afghanistan: [33.9, 67.7],
  greece: [39.1, 21.8],
  italy: [41.9, 12.6],
  spain: [40.5, -3.7],
  france: [46.2, 2.2],
  germany: [51.2, 10.5],
  'united kingdom': [55.4, -3.4],
  ukraine: [48.4, 31.2],
  russia: [61.5, 105.3],
  canada: [56.1, -106.3],
  'new zealand': [-40.9, 174.9],
  papua: [-6.3, 143.9],
  'papua new guinea': [-6.3, 143.9],
}

function normalizeCountryKey(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\(.*\)/g, '')
}

/** Match GDACS country / region strings to a centroid. */
export function countryCentroid(region: string): [number, number] | null {
  const key = normalizeCountryKey(region)
  if (CENTROIDS[key]) return CENTROIDS[key]
  for (const [name, pos] of Object.entries(CENTROIDS)) {
    if (key.includes(name) || name.includes(key)) return pos
  }
  return null
}
