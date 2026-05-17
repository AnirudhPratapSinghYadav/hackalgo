/**
 * Live stack smoke test (GDACS + chain reads + brief API).
 */
import { fetchGdacsEvents } from './bot/services/gdacsFeed.js'
import { listActiveCampaignIds, readCampaign } from './bot/chain/disasterVault.js'
import { fetchAppTransactions } from './bot/chain/indexer.js'
import { config } from './bot/config.js'

async function main() {
  const gdacs = await fetchGdacsEvents()
  console.log('[gdacs]', gdacs.length, 'events')
  if (gdacs[0]) {
    console.log('  sample:', gdacs[0].region, gdacs[0].type, gdacs[0].severity)
  }

  if (config.disasterAppId) {
    const ids = await listActiveCampaignIds(5)
    console.log('[campaigns]', ids.length ? ids.join(', ') : 'none active')
    if (ids[0]) {
      const c = await readCampaign(ids[0])
      console.log(
        `  #${ids[0]}: status=${c.status} approvals=${c.approvalCount}/${c.threshold} raised=${(c.raised / 1e6).toFixed(2)} USDC`,
      )
    }
    const txns = await fetchAppTransactions(config.disasterAppId, 3)
    console.log('[indexer]', txns.length, 'recent DisasterVault txs')
  }

  const briefPort = process.env.BRIEF_PORT || '3001'
  try {
    const r = await fetch(`http://localhost:${briefPort}/health`, { signal: AbortSignal.timeout(5000) })
    console.log('[brief-api]', r.ok ? 'OK' : `HTTP ${r.status}`)
  } catch {
    console.log('[brief-api] not reachable on port', briefPort)
  }

  console.log('[env] DEMO_CORE_FOCUS=', process.env.VITE_DEMO_CORE_FOCUS ?? '(unset → core pitch mode)')
  console.log('[env] disaster app', config.disasterAppId, 'appeals', config.appealsAppId)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
