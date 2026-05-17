/** Shared event-brief logic for Express, Vite dev middleware, and alert service. */

export interface EventBriefHeadline {
  title: string
  url: string
  source: string
}

export interface EventBriefResult {
  summary: string | null
  recommendedAction: string | null
  criticality: 'critical' | 'high' | 'medium'
  headlines: EventBriefHeadline[]
  affectedArea: string
  severityPlain: string
  populationExposure: string | null
  generatedAt: string
  error?: 'brief_unavailable'
}

export interface BuildBriefParams {
  location: string
  type: string
  severity: string
  alertScore?: string | number
  populationAffected?: string | number
  evidenceUrl?: string
}

const briefCache = new Map<string, { at: number; body: EventBriefResult }>()
const BRIEF_CACHE_MS = 30 * 60 * 1000

function cacheKey(p: BuildBriefParams): string {
  return `${p.location}|${p.type}|${p.severity}`
}

function severityPlain(severity: string): string {
  const s = severity.toLowerCase()
  if (s.includes('critical') || s.includes('red')) return 'Critical — immediate action'
  if (s.includes('high') || s.includes('orange')) return 'High risk — action required'
  if (s.includes('medium')) return 'Moderate risk — monitoring recommended'
  if (s.includes('green')) return 'Monitoring'
  return severity
}

function criticalityFromSeverity(severity: string): EventBriefResult['criticality'] {
  const s = severity.toLowerCase()
  if (s.includes('critical') || s.includes('red')) return 'critical'
  if (s.includes('high') || s.includes('orange')) return 'high'
  return 'medium'
}

function fallbackBrief(p: BuildBriefParams): EventBriefResult {
  const sev = severityPlain(p.severity)
  return {
    summary: null,
    recommendedAction: `Review field reports for ${p.location} and open a relief campaign if local partners confirm needs.`,
    criticality: criticalityFromSeverity(p.severity),
    headlines: [],
    affectedArea: p.location,
    severityPlain: sev,
    populationExposure: p.populationAffected != null ? String(p.populationAffected) : null,
    generatedAt: new Date().toISOString(),
    error: 'brief_unavailable',
  }
}

export async function buildEventBrief(params: BuildBriefParams): Promise<EventBriefResult> {
  const key = cacheKey(params)
  const hit = briefCache.get(key)
  if (hit && Date.now() - hit.at < BRIEF_CACHE_MS) {
    return hit.body
  }

  try {
    const { location, type, severity } = params
    const gnewsKey = process.env.GNEWS_API_KEY || process.env.VITE_GNEWS_API_KEY
    const geminiKey = process.env.GEMINI_API_KEY
    const year = new Date().getFullYear()
    const query = `${location} ${type} disaster ${year}`
    let headlines: EventBriefHeadline[] = []

    if (gnewsKey) {
      try {
        const gUrl = new URL('https://gnews.io/api/v4/search')
        gUrl.searchParams.set('q', query.slice(0, 120))
        gUrl.searchParams.set('lang', 'en')
        gUrl.searchParams.set('max', '3')
        gUrl.searchParams.set('apikey', gnewsKey)
        const gRes = await fetch(gUrl.toString())
        if (gRes.ok) {
          const gData = (await gRes.json()) as {
            articles?: { title?: string; url?: string; source?: { name?: string } }[]
          }
          headlines = (gData.articles ?? []).slice(0, 3).map((a) => ({
            title: a.title ?? 'Untitled',
            url: a.url ?? '#',
            source: a.source?.name ?? 'News',
          }))
        }
      } catch {
        /* skip news */
      }
    }

    const sevPlain = severityPlain(severity)
    const pop =
      params.populationAffected != null && String(params.populationAffected).trim()
        ? String(params.populationAffected)
        : null

    let summary: string | null = null
    let recommendedAction: string | null = `Confirm impact with field teams, then pre-position relief funds for ${location}.`

    if (geminiKey) {
      const newsCtx = headlines.map((h) => h.title).slice(0, 2).join('; ') || 'none'
      const prompt = `You are a humanitarian intelligence analyst. Write a 3-sentence situation brief for a disaster relief operations team. Plain English only. No markdown. No bullet points in the summary itself.

Disaster: ${type} in ${location}
GDACS severity: ${severity}${params.alertScore != null ? ` (score: ${params.alertScore})` : ''}
Population exposure: ${pop ?? 'unknown'}
News context: ${newsCtx}

Write: what happened, how severe, what relief action is recommended. Then on a new line starting with "ACTION:" write one sentence recommended action.`

      try {
        const gRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.3, maxOutputTokens: 512 },
            }),
          },
        )
        if (gRes.ok) {
          const gData = (await gRes.json()) as {
            candidates?: { content?: { parts?: { text?: string }[] } }[]
          }
          const text = gData.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
          if (text) {
            const actionMatch = text.match(/\nACTION:\s*(.+)/i)
            if (actionMatch) {
              recommendedAction = actionMatch[1].trim()
              summary = text.replace(/\nACTION:[\s\S]*/i, '').trim()
            } else {
              summary = text
            }
          }
        }
      } catch {
        /* fall through to fallback */
      }
    }

    if (!summary) {
      summary = `${type} activity is reported near ${location}. ${sevPlain}. Field verification is pending before authorizing relief fund release.`
    }

    const body: EventBriefResult = {
      summary,
      recommendedAction,
      criticality: criticalityFromSeverity(severity),
      headlines,
      affectedArea: location,
      severityPlain: sevPlain,
      populationExposure: pop,
      generatedAt: new Date().toISOString(),
    }
    briefCache.set(key, { at: Date.now(), body })
    return body
  } catch {
    const fb = fallbackBrief(params)
    briefCache.set(key, { at: Date.now(), body: fb })
    return fb
  }
}
