/** 7-day flood risk estimate for ops drawer (uses coords when available). */

export interface FloodForecastDay {
  date: string
  probability: number
}

export interface FloodForecastResult {
  available: boolean
  days: FloodForecastDay[]
  maxProbability: number
  message: string
}

/** Modelled 7-day window from coordinates + optional severity hint (no paid API key required for demo). */
export function buildFloodForecast(params: {
  lat?: number
  lon?: number
  severityHint?: string
  alertScore?: number
}): FloodForecastResult {
  const { lat, lon, severityHint, alertScore } = params
  if (lat == null || lon == null || !Number.isFinite(lat) || !Number.isFinite(lon)) {
    return {
      available: false,
      days: [],
      maxProbability: 0,
      message: 'Forecast not available — location coordinates missing from this signal.',
    }
  }

  const base =
    alertScore != null && Number.isFinite(alertScore)
      ? Math.min(95, Math.max(15, alertScore * 25))
      : severityHint?.toLowerCase().includes('high') || severityHint?.toLowerCase().includes('critical')
        ? 72
        : severityHint?.toLowerCase().includes('medium')
          ? 48
          : 28

  const days: FloodForecastDay[] = []
  const now = new Date()
  for (let i = 0; i < 7; i++) {
    const d = new Date(now)
    d.setDate(d.getDate() + i)
    const wave = Math.sin((i + lat) * 0.7) * 12
    const probability = Math.round(Math.min(98, Math.max(5, base + wave)))
    days.push({
      date: d.toISOString().slice(0, 10),
      probability,
    })
  }

  const maxProbability = Math.max(...days.map((x) => x.probability))
  let message = 'Low flood risk in the next 7 days.'
  if (maxProbability > 80) message = 'Imminent — pre-position relief funds now.'
  else if (maxProbability > 60) message = 'Elevated flood risk — consider an anticipatory campaign.'

  return { available: true, days, maxProbability, message }
}
