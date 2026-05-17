/** Off-chain campaign metadata (anticipatory triggers — not in contract box). */

export type CampaignKind = 'reactive' | 'anticipatory'

export type TriggerParameter = 'flood_depth' | 'wind_speed' | 'rainfall'

export interface CampaignOpsMeta {
  eventId: string
  onChainCampaignId: number
  name: string
  region: string
  kind: CampaignKind
  triggerParameter?: TriggerParameter
  /** Threshold in meters (flood), m/s (wind), or mm (rainfall) */
  triggerThreshold?: number
  currentTriggerValue?: number
  autoTriggered?: boolean
  monitoringStatus?: string
  createdAt: string
}

export const TRIGGER_LABELS: Record<TriggerParameter, string> = {
  flood_depth: 'Flood depth',
  wind_speed: 'Wind speed',
  rainfall: 'Rainfall',
}
