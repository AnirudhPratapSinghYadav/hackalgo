import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, X } from 'lucide-react'
import type { DisasterEvent } from '../../domain/platform'
import { ROUTES } from '../../config/routes'
import { Button } from '../ui'
import { getLoraApplicationUrl } from '../../services/humanitarianExplorer'
import { severityDisplayLabel, campaignStatusLabel } from '../../lib/severityLabels'
import { DEMO_CORE_FOCUS } from '../../config/demoFocus'

interface FloodForecast {
  available: boolean
  days: { date: string; probability: number }[]
  maxProbability: number
  message: string
}

export interface EventBrief {
  summary: string | null
  recommendedAction?: string | null
  criticality: 'critical' | 'high' | 'medium'
  headlines: { title: string; url: string; source: string }[]
  affectedArea?: string
  severityPlain?: string
  populationExposure?: string | null
  generatedAt: string
  error?: 'brief_unavailable'
}

interface Props {
  event: DisasterEvent | null
  onClose: () => void
  onCreateCampaign?: (event: DisasterEvent) => void
  createBusy?: boolean
  canCreateCampaign?: boolean
  wrongWallet?: boolean
}

async function fetchBriefSafe(event: DisasterEvent, signal: AbortSignal): Promise<EventBrief | null> {
  const params = new URLSearchParams({
    location: event.location,
    type: event.type,
    severity: event.severity,
  })
  if (event.evidenceUrl) params.set('evidenceUrl', event.evidenceUrl)

  try {
    const r = await fetch(`/api/event-brief?${params}`, { signal })
    const text = await r.text()
    let data: EventBrief
    try {
      data = JSON.parse(text) as EventBrief
    } catch {
      return null
    }
    if (!r.ok || data.error === 'brief_unavailable') return data.error ? data : null
    return data
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') throw e
    return null
  }
}

function BriefFallbackPanel({ event }: { event: DisasterEvent }) {
  const sev = severityDisplayLabel(event.severity)
  return (
    <div className="rounded-lg border border-border-medium bg-bg-elevated/60 overflow-hidden">
      <div className="px-4 py-3 border-b border-border-subtle bg-bg-surface">
        <p className="text-[10px] font-mono uppercase tracking-widest text-text-tertiary">Situation Brief</p>
      </div>
      <div className="px-4 py-4 space-y-3">
        <p className="text-sm text-text-primary leading-relaxed">
          <span className="font-medium">{event.location}</span> — {event.type} event, {sev}.
        </p>
        <p className="text-sm text-text-secondary leading-relaxed">
          Reported by live disaster feed. Field verification pending.
        </p>
        <p className="text-sm text-text-secondary">
          Live intelligence summary temporarily unavailable.
        </p>
      </div>
    </div>
  )
}

function BriefLivePanel({ brief, event }: { brief: EventBrief; event: DisasterEvent }) {
  const sev = brief.severityPlain ?? severityDisplayLabel(event.severity)
  return (
    <div className="rounded-lg border border-border-medium bg-bg-elevated/60 overflow-hidden">
      <div className="px-4 py-3 border-b border-border-subtle bg-bg-surface flex items-center justify-between gap-2">
        <p className="text-[10px] font-mono uppercase tracking-widest text-text-tertiary">Situation Brief</p>
        <span className="text-[10px] font-mono text-accent-primary/90">Live disaster feed · Live</span>
      </div>
      <div className="px-4 py-4 space-y-5">
        {brief.summary ? (
          <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">{brief.summary}</p>
        ) : null}

        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-text-tertiary mb-2">Key signals</p>
          <ul className="space-y-1.5 text-sm text-text-secondary">
            <li>
              <span className="text-text-tertiary">Affected area:</span>{' '}
              <span className="text-text-primary">{brief.affectedArea ?? event.location}</span>
            </li>
            <li>
              <span className="text-text-tertiary">Severity:</span>{' '}
              <span className="text-text-primary">{sev}</span>
            </li>
            {brief.populationExposure ? (
              <li>
                <span className="text-text-tertiary">Population exposure:</span>{' '}
                <span className="text-text-primary">{brief.populationExposure}</span>
              </li>
            ) : null}
            <li>
              <span className="text-text-tertiary">Last updated:</span>{' '}
              <span className="text-text-primary">
                {new Date(brief.generatedAt).toLocaleString(undefined, {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </span>
            </li>
          </ul>
        </div>

        {brief.recommendedAction ? (
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-text-tertiary mb-1.5">
              Recommended action
            </p>
            <p className="text-sm text-text-primary leading-relaxed">{brief.recommendedAction}</p>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default function EventDetailDrawer({
  event,
  onClose,
  onCreateCampaign,
  createBusy,
  canCreateCampaign = true,
  wrongWallet = false,
}: Props) {
  const [brief, setBrief] = useState<EventBrief | null>(null)
  const [loading, setLoading] = useState(false)
  const [flood, setFlood] = useState<FloodForecast | null>(null)

  useEffect(() => {
    if (!event) {
      setBrief(null)
      return
    }

    const cached = event.situationBrief
    if (cached && event.situationBriefAt) {
      const age = Date.now() - new Date(event.situationBriefAt).getTime()
      if (age < 30 * 60 * 1000) {
        setBrief(cached as EventBrief)
        return
      }
    }

    const ac = new AbortController()
    setLoading(true)
    void fetchBriefSafe(event, ac.signal)
      .then((b) => setBrief(b))
      .catch(() => setBrief(null))
      .finally(() => setLoading(false))
    return () => ac.abort()
  }, [event?.id, event?.situationBriefAt])

  useEffect(() => {
    if (!event) {
      setFlood(null)
      return
    }
    const params = new URLSearchParams()
    if (event.latitude != null) params.set('lat', String(event.latitude))
    if (event.longitude != null) params.set('lon', String(event.longitude))
    params.set('severity', event.severity)
    if (event.alertScore != null) params.set('alertScore', String(event.alertScore))
    void fetch(`/api/flood-forecast?${params}`)
      .then((r) => r.json() as Promise<FloodForecast>)
      .then(setFlood)
      .catch(() => setFlood(null))
  }, [event?.id, event?.latitude, event?.longitude, event?.severity, event?.alertScore])

  if (!event) return null

  const severityIcon =
    event.severity === 'Critical' || event.severity === 'High' ? (
      <AlertTriangle className="w-5 h-5 text-alert-critical" aria-hidden />
    ) : (
      <AlertTriangle className="w-5 h-5 text-text-tertiary" aria-hidden />
    )

  const disasterAppId = Number(import.meta.env.VITE_DISASTER_APP_ID)
  const mapUrl = `${ROUTES.operationsMap}?focus=${encodeURIComponent(event.id)}`
  const verificationUrl = ROUTES.operationsVerification
  const hasLiveBrief = brief && brief.summary && brief.error !== 'brief_unavailable'

  const createDisabled = createBusy || !canCreateCampaign
  const createTitle = wrongWallet
    ? 'Switch to operations wallet to create a campaign'
    : !canCreateCampaign
      ? 'Connect the operations wallet to create a campaign'
      : undefined

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
      <button type="button" className="absolute inset-0 bg-black/50" onClick={onClose} aria-label="Close" />
      <aside className="relative w-full max-w-lg bg-bg-surface border-l border-border-medium shadow-xl overflow-y-auto">
        <header className="sticky top-0 bg-bg-surface border-b border-border-subtle px-6 py-4 flex items-start justify-between gap-4">
          <div className="flex gap-3">
            {severityIcon}
            <div>
              <h2 className="font-serif text-xl text-text-primary">{event.location}</h2>
              <p className="text-sm text-text-secondary mt-1">
                {event.type} ·{' '}
                <span className="text-text-primary">{severityDisplayLabel(event.severity)}</span>
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 text-text-tertiary hover:text-text-primary" aria-label="Close panel">
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="px-6 py-5 space-y-6">
          <section>
            {loading ? (
              <p className="text-sm text-text-tertiary">Preparing situation brief…</p>
            ) : hasLiveBrief && brief ? (
              <BriefLivePanel brief={brief} event={event} />
            ) : (
              <BriefFallbackPanel event={event} />
            )}
          </section>

          {!DEMO_CORE_FOCUS ? (
          <section>
            <h3 className="text-xs font-mono uppercase tracking-wider text-text-tertiary mb-2">
              7-day flood forecast
            </h3>
            {!flood ? (
              <p className="text-sm text-text-tertiary">Loading forecast…</p>
            ) : !flood.available ? (
              <p className="text-sm text-text-secondary">{flood.message}</p>
            ) : (
              <div className="rounded-lg border border-border-subtle p-3 space-y-2">
                <p
                  className={`text-sm font-medium ${
                    flood.maxProbability > 80
                      ? 'text-alert-critical'
                      : flood.maxProbability > 60
                        ? 'text-alert-warning'
                        : 'text-text-primary'
                  }`}
                >
                  {flood.message}
                </p>
                <ul className="grid grid-cols-7 gap-1 text-[10px] font-mono">
                  {flood.days.map((d) => (
                    <li key={d.date} className="text-center">
                      <div
                        className={`rounded py-1 ${
                          d.probability > 80
                            ? 'bg-alert-critical/30 text-alert-critical'
                            : d.probability > 60
                              ? 'bg-alert-warning/20 text-alert-warning'
                              : 'bg-bg-elevated text-text-tertiary'
                        }`}
                      >
                        {d.probability}%
                      </div>
                      <span className="text-text-tertiary block mt-0.5">{d.date.slice(5)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
          ) : null}

          {brief && brief.headlines.length > 0 ? (
            <section>
              <h3 className="text-xs font-mono uppercase tracking-wider text-text-tertiary mb-2">Related news</h3>
              <ul className="space-y-2">
                {brief.headlines.map((h) => (
                  <li key={h.url}>
                    <a href={h.url} target="_blank" rel="noopener noreferrer" className="text-sm text-accent-primary hover:underline">
                      {h.title}
                    </a>
                    <span className="text-xs text-text-tertiary ml-2">{h.source}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="flex flex-wrap gap-3">
            <Link to={mapUrl}>
              <Button variant="outline">View on map</Button>
            </Link>
            {!event.onChainCampaignId && onCreateCampaign ? (
              <Button
                variant="primary"
                disabled={createDisabled}
                title={createTitle}
                onClick={() => onCreateCampaign(event)}
              >
                {createBusy ? 'Creating…' : 'Create campaign'}
              </Button>
            ) : null}
            {event.onChainCampaignId && event.opsStatus === 'approval_pending' ? (
              <Link to={verificationUrl}>
                <Button variant="primary">Open approvals</Button>
              </Link>
            ) : null}
            {disasterAppId ? (
              <a
                href={getLoraApplicationUrl(disasterAppId)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center min-h-[44px] px-4 text-sm text-accent-primary whitespace-nowrap"
              >
                Verify on blockchain
              </a>
            ) : null}
          </section>

          {event.onChainCampaignId ? (
            <p className="text-xs text-text-tertiary">
              Campaign #{event.onChainCampaignId}
              {event.onChainStatus != null ? ` · ${campaignStatusLabel(event.onChainStatus)}` : ''}
            </p>
          ) : null}
        </div>
      </aside>
    </div>
  )
}
