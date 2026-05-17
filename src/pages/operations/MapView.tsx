import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { MapContainer, TileLayer, Popup, CircleMarker, useMap } from 'react-leaflet'
import OpsLayout from '../../components/ops/OpsLayout'
import { OpsPanel, StatusBadge, Button } from '../../components/ui'
import { useCommunityStore } from '../../store/communityStore'
import { usePlatformStore } from '../../store/platformStore'
import { crisisMapPosition, eventMapPosition, isActiveDisruptiveEvent } from '../../lib/geo'
import { getLoraApplicationUrl } from '../../services/humanitarianExplorer'
import { severityDisplayLabel } from '../../lib/severityLabels'
import { fetchGdacsEvents, gdacsDtoToDisasterEvent } from '../../services/gdacsIntel'
import { markGdacsFetched } from '../../lib/gdacsSyncState'

const worldCenter: [number, number] = [20, 0]
const DISASTER_APP = Number(import.meta.env.VITE_DISASTER_APP_ID) || 0

function FlyTo({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap()
  map.flyTo(center, zoom)
  return null
}

export default function MapView() {
  const [searchParams] = useSearchParams()
  const focusId = searchParams.get('focus')
  const crises = useCommunityStore((s) => s.crises)
  const disasterEvents = usePlatformStore((s) => s.disasterEvents)
  const pendingBeneficiaries = usePlatformStore((s) => s.pendingBeneficiaryPayouts)
  const [layers, setLayers] = useState({ disasters: true, community: true, beneficiaries: true })
  const [fly, setFly] = useState<{ center: [number, number]; zoom: number } | null>(null)
  const flyKeyRef = useRef<string>('')
  const [gdacsBusy, setGdacsBusy] = useState(false)

  const refreshGdacs = useCallback(async () => {
    setGdacsBusy(true)
    try {
      const dtos = await fetchGdacsEvents()
      usePlatformStore.getState().replaceGdacsDisasterEvents(dtos.map((d) => gdacsDtoToDisasterEvent(d)))
      markGdacsFetched()
    } finally {
      setGdacsBusy(false)
    }
  }, [])

  const activeEvents = useMemo(
    () => disasterEvents.filter(isActiveDisruptiveEvent),
    [disasterEvents],
  )

  useEffect(() => {
    if (!focusId) return
    const event = disasterEvents.find((e) => e.id === focusId)
    if (!event) return
    const pos = eventMapPosition(event)
    const key = `focus:${focusId}:${pos[0].toFixed(2)},${pos[1].toFixed(2)}`
    if (flyKeyRef.current === key) return
    flyKeyRef.current = key
    setFly({ center: pos, zoom: 6 })
  }, [focusId, disasterEvents])

  useEffect(() => {
    if (focusId || activeEvents.length === 0) return
    const first = eventMapPosition(activeEvents[0])
    const key = `default:${activeEvents[0].id}:${first[0].toFixed(2)},${first[1].toFixed(2)}`
    if (flyKeyRef.current === key) return
    flyKeyRef.current = key
    setFly({ center: first, zoom: 4 })
  }, [activeEvents, focusId])

  const disasterMarkers = useMemo(
    () => activeEvents.map((event) => ({ event, pos: eventMapPosition(event) })),
    [activeEvents],
  )

  const communityMarkers = useMemo(
    () =>
      crises
        .filter((c) => c.status !== 'rejected')
        .map((c) => ({
          id: c.id,
          pos: crisisMapPosition(c),
          title: c.title,
          status: c.status,
          raised: c.raisedAmount,
          appealId: c.onChainAppealId,
        })),
    [crises],
  )

  return (
    <OpsLayout
      title="Geographic view"
      description="Pins use GDACS coordinates when available, otherwise the country centroid. Colors distinguish disasters, appeals, and payout queue."
    >
      <div className="flex flex-col lg:flex-row gap-6">
        <aside className="lg:w-80 flex-shrink-0 bg-bg-surface border border-accent-primary/20 p-5 max-h-[520px] overflow-y-auto">
          <h2 className="font-serif text-lg text-text-primary">Active disruptions</h2>
          <p className="text-xs text-text-tertiary mt-2">
            {activeEvents.length} events · {communityMarkers.length} appeals · {pendingBeneficiaries.length} payouts
            queued
          </p>
          <ul className="mt-4 space-y-3">
            {activeEvents.length === 0 ? (
              <li className="text-xs text-text-tertiary font-mono">
                No active events — refresh GDACS pins below or open Active Events.
              </li>
            ) : (
              activeEvents.map((e) => {
                const pos = eventMapPosition(e)
                return (
                  <li key={e.id} className="text-sm border-b border-border-subtle pb-2">
                    <StatusBadge variant={e.severity === 'Critical' ? 'critical' : 'attention'}>
                      {severityDisplayLabel(e.severity)}
                    </StatusBadge>
                    <p className="text-text-primary mt-1">{e.location}</p>
                    <p className="font-mono text-[10px] text-text-tertiary">{e.type} · {e.opsStatus}</p>
                    <button
                      type="button"
                      className="mt-2 text-xs text-accent-primary"
                      onClick={() => setFly({ center: pos, zoom: 8 })}
                    >
                      Zoom →
                    </button>
                  </li>
                )
              })
            )}
          </ul>
          <Button
            variant="outline"
            className="mt-4 w-full text-xs"
            type="button"
            disabled={gdacsBusy}
            onClick={() => void refreshGdacs()}
          >
            {gdacsBusy ? 'Refreshing…' : 'Refresh event pins'}
          </Button>
        </aside>

        <div className="flex-1 min-h-[520px] border border-border-medium relative">
          <div className="absolute top-3 right-3 z-[1000] bg-bg-surface/95 border border-accent-primary/40 p-4 text-xs space-y-2">
            <p className="font-mono uppercase text-accent-primary">Layers</p>
            {(
              [
                ['disasters', 'Active disasters'],
                ['community', 'Community appeals'],
                ['beneficiaries', 'Payout queue'],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-text-secondary cursor-pointer">
                <input
                  type="checkbox"
                  checked={layers[key]}
                  onChange={() => setLayers((l) => ({ ...l, [key]: !l[key] }))}
                />
                {label}
              </label>
            ))}
            {DISASTER_APP ? (
              <a
                href={getLoraApplicationUrl(DISASTER_APP)}
                target="_blank"
                rel="noopener noreferrer"
                className="block pt-2 text-accent-primary hover:underline"
              >
                Verify on blockchain →
              </a>
            ) : null}
          </div>

          <MapContainer center={worldCenter} zoom={3} className="h-[520px] w-full" scrollWheelZoom>
            <TileLayer
              attribution="OSM · CARTO"
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            {fly ? <FlyTo center={fly.center} zoom={fly.zoom} /> : null}

            {layers.disasters
              ? disasterMarkers.map(({ event, pos }) => (
                  <CircleMarker
                    key={event.id}
                    center={pos}
                    radius={9}
                    pathOptions={{ color: '#5ba8c9', fillColor: '#5ba8c9', fillOpacity: 0.85, weight: 2 }}
                  >
                    <Popup>
                      <strong>{event.location}</strong>
                      <br />
                      {event.type} · {severityDisplayLabel(event.severity)}
                      <br />
                      <span className="text-xs font-mono text-text-tertiary">
                        {event.latitude != null && event.longitude != null
                          ? `${event.latitude.toFixed(2)}°, ${event.longitude.toFixed(2)}°`
                          : 'Country centroid (no GDACS geometry)'}
                      </span>
                      <br />
                      <span className="text-xs">{event.opsStatus}</span>
                      {event.onChainCampaignId ? (
                        <>
                          <br />
                          Campaign #{event.onChainCampaignId}
                        </>
                      ) : null}
                    </Popup>
                  </CircleMarker>
                ))
              : null}

            {layers.community
              ? communityMarkers.map((m) => (
                  <CircleMarker
                    key={m.id}
                    center={m.pos}
                    radius={8}
                    pathOptions={{ color: '#82c995', fillColor: '#82c995', fillOpacity: 0.85, weight: 2 }}
                  >
                    <Popup>
                      <strong>{m.title}</strong>
                      <br />
                      {m.status} · {m.raised} ALGO raised
                      {m.appealId ? (
                        <>
                          <br />
                          Appeal #{m.appealId}
                        </>
                      ) : null}
                    </Popup>
                  </CircleMarker>
                ))
              : null}

            {layers.beneficiaries && pendingBeneficiaries.length > 0
              ? disasterMarkers
                  .filter((d) => d.event.onChainCampaignId)
                  .slice(0, 1)
                  .map(({ pos }) => (
                    <CircleMarker
                      key="beneficiary-ring"
                      center={pos}
                      radius={14}
                      pathOptions={{ color: '#e4b84a', fillColor: '#e4b84a', fillOpacity: 0.25, weight: 2 }}
                    >
                      <Popup>{pendingBeneficiaries.length} beneficiaries in disbursement queue</Popup>
                    </CircleMarker>
                  ))
              : null}
          </MapContainer>
        </div>
      </div>

      {pendingBeneficiaries.length > 0 ? (
        <OpsPanel title="Beneficiary payout queue" className="mt-6">
          <ul className="font-mono text-xs text-text-secondary grid sm:grid-cols-2 gap-2">
            {pendingBeneficiaries.map((b) => (
              <li key={b.address}>
                {b.name}: {(b.amountMicroUsdc / 1_000_000).toFixed(2)} USDC → {b.address.slice(0, 12)}…
              </li>
            ))}
          </ul>
        </OpsPanel>
      ) : null}
    </OpsLayout>
  )
}
