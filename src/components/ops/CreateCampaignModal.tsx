import { useState } from 'react'
import type { DisasterEvent } from '../../domain/platform'
import type { CampaignKind, TriggerParameter } from '../../domain/campaignOpsMeta'
import { TRIGGER_LABELS } from '../../domain/campaignOpsMeta'
import { DEMO_CORE_FOCUS } from '../../config/demoFocus'
import { Button } from '../ui'

export interface CreateCampaignOptions {
  kind: CampaignKind
  triggerParameter?: TriggerParameter
  triggerThreshold?: number
}

interface Props {
  event: DisasterEvent
  open: boolean
  busy: boolean
  onClose: () => void
  onConfirm: (options: CreateCampaignOptions) => void
}

export default function CreateCampaignModal({ event, open, busy, onClose, onConfirm }: Props) {
  const [kind, setKind] = useState<CampaignKind>('reactive')
  const [triggerParameter, setTriggerParameter] = useState<TriggerParameter>('flood_depth')
  const [triggerThreshold, setTriggerThreshold] = useState('2')

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button type="button" className="absolute inset-0 bg-black/60" onClick={onClose} aria-label="Close" />
      <div className="relative w-full max-w-md bg-bg-surface border border-border-medium shadow-xl rounded-lg p-6">
        <h2 className="font-serif text-xl text-text-primary">Create relief campaign</h2>
        <p className="text-sm text-text-secondary mt-1">{event.location} · {event.type}</p>

        {DEMO_CORE_FOCUS ? (
          <p className="mt-6 text-sm text-text-secondary">
            Standard multi-approver relief campaign — funds release after two independent signatures on testnet.
          </p>
        ) : (
          <fieldset className="mt-6 space-y-3">
            <legend className="text-xs font-mono uppercase tracking-wider text-text-tertiary">Campaign type</legend>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="radio"
                name="kind"
                checked={kind === 'reactive'}
                onChange={() => setKind('reactive')}
                className="mt-1"
              />
              <span>
                <span className="text-sm text-text-primary font-medium">Reactive</span>
                <span className="block text-xs text-text-tertiary">Disaster is occurring — standard approval flow</span>
              </span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="radio"
                name="kind"
                checked={kind === 'anticipatory'}
                onChange={() => setKind('anticipatory')}
                className="mt-1"
              />
              <span>
                <span className="text-sm text-text-primary font-medium">Anticipatory</span>
                <span className="block text-xs text-text-tertiary">
                  Pre-position funds — auto-release when a live trigger threshold is crossed
                </span>
              </span>
            </label>
          </fieldset>
        )}

        {!DEMO_CORE_FOCUS && kind === 'anticipatory' ? (
          <div className="mt-4 space-y-3 p-3 border border-border-subtle rounded bg-bg-elevated/50">
            <label className="block text-xs text-text-tertiary">
              Trigger parameter
              <select
                value={triggerParameter}
                onChange={(e) => setTriggerParameter(e.target.value as TriggerParameter)}
                className="mt-1 w-full bg-bg-primary border border-border-medium px-2 py-2 text-sm text-text-primary"
              >
                {(Object.keys(TRIGGER_LABELS) as TriggerParameter[]).map((k) => (
                  <option key={k} value={k}>
                    {TRIGGER_LABELS[k]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs text-text-tertiary">
              Threshold (e.g. 2 for meters / m/s / mm)
              <input
                type="number"
                min={0}
                step={0.1}
                value={triggerThreshold}
                onChange={(e) => setTriggerThreshold(e.target.value)}
                className="mt-1 w-full bg-bg-primary border border-border-medium px-2 py-2 text-sm font-mono text-text-primary"
              />
            </label>
            <p className="text-[10px] text-text-tertiary">
              Status after create: Monitoring — will auto-disburse when live feed exceeds threshold.
            </p>
          </div>
        ) : null}

        <div className="mt-6 flex gap-3 justify-end">
          <Button variant="outline" type="button" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="primary"
            type="button"
            disabled={busy}
            onClick={() =>
              onConfirm({
                kind,
                triggerParameter: kind === 'anticipatory' ? triggerParameter : undefined,
                triggerThreshold:
                  kind === 'anticipatory' ? parseFloat(triggerThreshold) || undefined : undefined,
              })
            }
          >
            {busy ? 'Creating…' : 'Create on-chain'}
          </Button>
        </div>
      </div>
    </div>
  )
}
