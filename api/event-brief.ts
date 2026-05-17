import type { VercelRequest, VercelResponse } from '@vercel/node'

export interface EventBriefHeadline {
  title: string
  url: string
  source: string
}

export interface EventBriefResponse {
  summary: string
  criticality: 'critical' | 'high' | 'medium'
  headlines: EventBriefHeadline[]
  generatedAt: string
}

function gnewsKey(): string | undefined {
  return process.env.GNEWS_API_KEY || process.env.VITE_GNEWS_API_KEY
}

function geminiKey(): string | undefined {
  return process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY
}

async function fetchHeadlines(query: string): Promise<EventBriefHeadline[]> {
  const key = gnewsKey()
  if (!key) return []
  const url = new URL('https://gnews.io/api/v4/search')
  url.searchParams.set('q', query.slice(0, 120))
  url.searchParams.set('lang', 'en')
  url.searchParams.set('max', '3')
  url.searchParams.set('apikey', key)
  const res = await fetch(url.toString())
  if (!res.ok) return []
  const data = (await res.json()) as {
    articles?: { title?: string; url?: string; source?: { name?: string } }[]
  }
  return (data.articles ?? []).slice(0, 3).map((a) => ({
    title: a.title ?? 'Untitled',
    url: a.url ?? '#',
    source: a.source?.name ?? 'News',
  }))
}

async function geminiSummary(input: {
  location: string
  type: string
  severity: string
  headlines: EventBriefHeadline[]
  evidenceUrl?: string
}): Promise<{ summary: string; criticality: 'critical' | 'high' | 'medium' }> {
  const key = geminiKey()
  const sev = input.severity.toLowerCase()
  const criticality: 'critical' | 'high' | 'medium' =
    sev.includes('critical') || sev.includes('red') ? 'critical' : sev.includes('high') || sev.includes('orange') ? 'high' : 'medium'

  if (!key) {
    const headlineText =
      input.headlines.length > 0
        ? ` Recent coverage: ${input.headlines.map((h) => h.title).join('; ')}.`
        : ''
    return {
      criticality,
      summary: `A ${input.type.toLowerCase()} event is reported near ${input.location}. Severity is rated ${input.severity}. Operators should confirm impact with field teams and open a relief campaign if local partners request funds.${headlineText}`,
    }
  }

  const prompt = `You are a humanitarian operations analyst. Write 2-4 short paragraphs in plain English for NGO admins.
Rules: no blockchain jargon, no "pilot" or "testnet" language, no hype.
Event: ${input.type} in ${input.location}, severity ${input.severity}.
${input.evidenceUrl ? `Evidence link: ${input.evidenceUrl}` : ''}
Headlines: ${input.headlines.map((h) => h.title).join(' | ') || 'none'}
Cover: what is happening, how critical, suggested operator action (verify locally, prepare campaign, coordinate with partners).`

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 512 },
      }),
    },
  )
  if (!res.ok) {
    return {
      criticality,
      summary: `Humanitarian event (${input.type}) in ${input.location}. Severity: ${input.severity}. Review headlines and coordinate with local partners before releasing funds.`,
    }
  }
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[]
  }
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
  return {
    criticality,
    summary: text || `Event in ${input.location} requires operator review.`,
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const location = String(req.query.location ?? '')
  const type = String(req.query.type ?? 'disaster')
  const severity = String(req.query.severity ?? 'medium')
  const evidenceUrl = req.query.evidenceUrl ? String(req.query.evidenceUrl) : undefined

  if (!location) {
    res.status(400).json({ error: 'location is required' })
    return
  }

  try {
    const query = `${type} ${location} disaster humanitarian`
    const headlines = await fetchHeadlines(query)
    const { summary, criticality } = await geminiSummary({ location, type, severity, headlines, evidenceUrl })
    const body: EventBriefResponse = {
      summary,
      criticality,
      headlines,
      generatedAt: new Date().toISOString(),
    }
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=120')
    res.status(200).json(body)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Brief generation failed'
    res.status(500).json({ error: msg })
  }
}
