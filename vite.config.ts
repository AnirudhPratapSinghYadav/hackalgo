import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { parseGdacsJson } from './src/lib/disasterIntelParse'
import { buildEventBrief } from './server/eventBriefHandler'
import { saveCampaignMeta, loadAllCampaignMeta } from './server/campaignMetaStore'
import { buildFloodForecast } from './server/floodHubHandler'

const GDACS_URL = 'https://www.gdacs.org/gdacsapi/api/events/geteventlist/MAP'
let disasterCache: { at: number; body: unknown } | null = null
const CACHE_MS = 15 * 60 * 1000

function disasterIntelPlugin(): Plugin {
  return {
    name: 'disaster-intel-api',
    configureServer(server) {
      server.middlewares.use('/api/event-brief', async (req, res) => {
        res.setHeader('Content-Type', 'application/json')
        try {
          const url = new URL(req.url ?? '', 'http://localhost')
          const location = url.searchParams.get('location') ?? ''
          const type = url.searchParams.get('type') ?? 'disaster'
          const severity = url.searchParams.get('severity') ?? 'medium'
          if (!location) {
            res.statusCode = 400
            res.end(JSON.stringify({ error: 'brief_unavailable', summary: null, headlines: [] }))
            return
          }
          const body = await buildEventBrief({ location, type, severity })
          res.end(JSON.stringify(body))
        } catch {
          res.statusCode = 200
          res.end(
            JSON.stringify({
              summary: null,
              headlines: [],
              error: 'brief_unavailable',
              generatedAt: new Date().toISOString(),
            }),
          )
        }
      })

      server.middlewares.use('/api/campaign-meta', async (req, res) => {
        res.setHeader('Content-Type', 'application/json')
        if (req.method === 'GET') {
          res.end(JSON.stringify({ campaigns: loadAllCampaignMeta() }))
          return
        }
        if (req.method === 'POST') {
          const chunks: Buffer[] = []
          req.on('data', (c) => chunks.push(c))
          req.on('end', () => {
            try {
              const body = JSON.parse(Buffer.concat(chunks).toString('utf8'))
              const saved = saveCampaignMeta(body)
              res.end(JSON.stringify({ campaigns: saved }))
            } catch {
              res.statusCode = 400
              res.end(JSON.stringify({ error: 'invalid body' }))
            }
          })
          return
        }
        res.statusCode = 405
        res.end(JSON.stringify({ error: 'method not allowed' }))
      })

      server.middlewares.use('/api/flood-forecast', async (req, res) => {
        res.setHeader('Content-Type', 'application/json')
        try {
          const url = new URL(req.url ?? '', 'http://localhost')
          const lat = parseFloat(url.searchParams.get('lat') ?? '')
          const lon = parseFloat(url.searchParams.get('lon') ?? '')
          const severity = url.searchParams.get('severity') ?? ''
          const score = parseFloat(url.searchParams.get('alertScore') ?? '')
          const body = buildFloodForecast({
            lat: Number.isFinite(lat) ? lat : undefined,
            lon: Number.isFinite(lon) ? lon : undefined,
            severityHint: severity,
            alertScore: Number.isFinite(score) ? score : undefined,
          })
          res.end(JSON.stringify(body))
        } catch {
          res.statusCode = 200
          res.end(JSON.stringify({ available: false, days: [], maxProbability: 0, message: 'Unavailable' }))
        }
      })

      server.middlewares.use('/api/disaster-intel', async (_req, res) => {
        try {
          if (disasterCache && Date.now() - disasterCache.at < CACHE_MS) {
            res.setHeader('Content-Type', 'application/json')
            res.setHeader('Cache-Control', 'public, max-age=900')
            res.end(JSON.stringify(disasterCache.body))
            return
          }
          const upstream = await fetch(GDACS_URL, { headers: { Accept: 'application/json' } })
          if (!upstream.ok) {
            res.statusCode = 502
            res.end(JSON.stringify({ error: `GDACS upstream ${upstream.status}` }))
            return
          }
          const raw = await upstream.json()
          const events = parseGdacsJson(raw as { features?: unknown[] })
          const body = { events, source: 'gdacs', fetchedAt: new Date().toISOString() }
          disasterCache = { at: Date.now(), body }
          res.setHeader('Content-Type', 'application/json')
          res.setHeader('Cache-Control', 'public, max-age=900')
          res.end(JSON.stringify(body))
        } catch (e) {
          res.statusCode = 500
          res.end(JSON.stringify({ error: e instanceof Error ? e.message : 'GDACS fetch failed' }))
        }
      })
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), disasterIntelPlugin()],
  server: {
    proxy: {
      '/gdacs-api': {
        target: 'https://www.gdacs.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/gdacs-api/, '/gdacsapi'),
      },
    },
  },
  optimizeDeps: {
    include: [
      '@perawallet/connect',
      '@blockshake/defly-connect',
      '@walletconnect/modal',
      '@walletconnect/sign-client',
      '@walletconnect/types',
    ],
  },
})
