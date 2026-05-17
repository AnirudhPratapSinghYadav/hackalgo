import * as fs from 'node:fs'
import * as path from 'node:path'

export interface StoredCampaignMeta {
  eventId: string
  onChainCampaignId: number
  name: string
  region: string
  kind: 'reactive' | 'anticipatory'
  triggerParameter?: 'flood_depth' | 'wind_speed' | 'rainfall'
  triggerThreshold?: number
  currentTriggerValue?: number
  autoTriggered?: boolean
  monitoringStatus?: string
  createdAt: string
}

const META_PATH = path.join(process.cwd(), 'scripts', 'bot', 'data', 'campaign-meta.json')

export function loadAllCampaignMeta(): StoredCampaignMeta[] {
  try {
    const raw = fs.readFileSync(META_PATH, 'utf8')
    const data = JSON.parse(raw) as { campaigns?: StoredCampaignMeta[] }
    return data.campaigns ?? []
  } catch {
    return []
  }
}

export function saveCampaignMeta(entry: StoredCampaignMeta): StoredCampaignMeta[] {
  const all = loadAllCampaignMeta().filter((c) => c.onChainCampaignId !== entry.onChainCampaignId)
  all.push(entry)
  fs.mkdirSync(path.dirname(META_PATH), { recursive: true })
  fs.writeFileSync(META_PATH, JSON.stringify({ campaigns: all }, null, 2))
  return all
}

export function updateCampaignMeta(
  campaignId: number,
  patch: Partial<StoredCampaignMeta>,
): StoredCampaignMeta[] {
  const all = loadAllCampaignMeta()
  const idx = all.findIndex((c) => c.onChainCampaignId === campaignId)
  if (idx < 0) return all
  all[idx] = { ...all[idx], ...patch }
  fs.mkdirSync(path.dirname(META_PATH), { recursive: true })
  fs.writeFileSync(META_PATH, JSON.stringify({ campaigns: all }, null, 2))
  return all
}
