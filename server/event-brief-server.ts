/**
 * Standalone event-brief API for demo (port 3001).
 * Usage: npm run start:server
 */
import express from 'express'
import * as dotenv from 'dotenv'
import { buildEventBrief } from './eventBriefHandler'

dotenv.config()

const PORT = Number(process.env.BRIEF_PORT || 3001)
const app = express()

const ALLOWED_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173']

app.use((req, res, next) => {
  const origin = req.headers.origin
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') {
    res.sendStatus(204)
    return
  }
  next()
})

app.get('/api/event-brief', async (req, res) => {
  try {
    const location = String(req.query.location ?? '')
    const type = String(req.query.type ?? 'disaster')
    const severity = String(req.query.severity ?? 'medium')
    if (!location) {
      res.status(400).json({ error: 'location is required' })
      return
    }
    const body = await buildEventBrief({ location, type, severity })
    res.json(body)
  } catch {
    res.status(200).json({
      summary: null,
      headlines: [],
      error: 'brief_unavailable',
      generatedAt: new Date().toISOString(),
    })
  }
})

app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

app.listen(PORT, () => {
  console.log(`Event brief API listening on http://localhost:${PORT}`)
})
