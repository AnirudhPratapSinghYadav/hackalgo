/**
 * Quick smoke check for dev:stack — web, brief API, Guardian bot.
 */
const WEB = process.env.PUBLIC_APP_URL ?? 'http://localhost:5173'
const API = process.env.BRIEF_API_URL ?? 'http://localhost:3001'
const BOT = process.env.BOT_HEALTH_URL ?? 'http://localhost:3002/bot/health'

async function probe(url: string): Promise<boolean> {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(8000) })
    return r.ok
  } catch {
    return false
  }
}

async function probeBot(): Promise<{ ok: boolean; polling?: boolean }> {
  try {
    const r = await fetch(BOT, { signal: AbortSignal.timeout(8000) })
    if (!r.ok) return { ok: false }
    const body = (await r.json()) as { polling?: boolean; telegram?: boolean }
    return { ok: Boolean(body.telegram), polling: body.polling }
  } catch {
    return { ok: false }
  }
}

async function main() {
  const [web, api, bot] = await Promise.all([
    probe(WEB),
    probe(`${API}/health`).catch(() => probe(API)),
    probeBot(),
  ])
  console.log('Stack health:', { web, api, bot: bot.ok, polling: bot.polling })
  if (!web || !bot.ok) process.exit(1)
}

main()
