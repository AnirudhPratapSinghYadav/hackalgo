import algosdk from 'algosdk'
import { getNetworkConfig } from './networkConfig'
import { readCampaignOnChain, statusLabel as campaignStatusLabel } from '../integrations/disasterVaultChain'
import { readAppealState } from './communityDonation'
import type { Campaign, DisasterEvent } from '../domain/platform'
import type { Crisis, ChainAppealStatus } from '../types/crisis'
import { getCrisisImages, inferCategoryFromText } from '../lib/crisisImages'

const DISASTER_APP = Number(import.meta.env.VITE_DISASTER_APP_ID) || 0
const APPEALS_APP = Number(import.meta.env.VITE_APPEALS_APP_ID) || 0

function getAlgod(): algosdk.Algodv2 {
  const { algod } = getNetworkConfig()
  return new algosdk.Algodv2(algod.token, algod.server, algod.port)
}

async function readGlobalUint(appId: number, key: string): Promise<number> {
  const info = await getAlgod().getApplicationByID(appId).do()
  const gs = info.params['global-state'] as { key: string; value: { uint: number } }[] | undefined
  if (!gs) return 0
  const encoded = Buffer.from(key).toString('base64')
  const entry = gs.find((e) => e.key === encoded)
  return entry?.value?.uint ?? 0
}

export async function fetchOnChainCampaigns(): Promise<{
  campaigns: Campaign[]
  events: DisasterEvent[]
}> {
  if (!DISASTER_APP) return { campaigns: [], events: [] }
  const count = await readGlobalUint(DISASTER_APP, 'campaign_count')
  const campaigns: Campaign[] = []
  const events: DisasterEvent[] = []

  for (let id = 1; id <= count; id++) {
    try {
      const s = await readCampaignOnChain(id)
      const statusCode = s.status
      const opsStatus =
        statusCode === 1
          ? 'approval_pending'
          : statusCode === 2
            ? 'approved'
            : statusCode === 3
              ? 'disbursed'
              : statusCode === 4
                ? 'closed'
                : 'detected'

      const cid = `CMP-ONCHAIN-${id}`
      campaigns.push({
        id: cid,
        title: `Campaign #${id}`,
        summary: `On-chain DisasterVault campaign (${campaignStatusLabel(statusCode)})`,
        organizationId: 'org-ndma',
        location: 'On-chain',
        state: 'On-chain',
        district: 'Live',
        tags: [`campaign-id:${id}`],
        goalAmount: s.target / 1_000_000,
        raisedAmount: s.raised / 1_000_000,
        releasedAmount: statusCode === 3 ? s.raised / 1_000_000 : 0,
        fundingStatus: s.raised >= s.target ? 'target_met' : 'raising',
        verificationStatus: 'verified',
        status: statusCode === 3 ? 'completed' : 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        dataSource: 'live',
      })

      const lat = 20 + (id % 8)
      const lon = 72 + (id % 10)
      events.push({
        id: `EVT-ONCHAIN-${id}`,
        location: `Campaign ${id}`,
        type: 'Flood',
        severity: 'High',
        confidence: 85,
        status: statusCode >= 2 ? 'Approved' : 'Pending Approval',
        opsStatus,
        detectedAt: new Date().toISOString(),
        onChainCampaignId: id,
        linkedCampaignId: cid,
        dataSource: 'live',
        sourceLabels: ['DisasterVault', 'on-chain'],
        latitude: lat,
        longitude: lon,
      })
    } catch {
      /* skip missing box */
    }
  }
  return { campaigns, events }
}

function mapAppealStatus(code: number): ChainAppealStatus {
  if (code === 0) return 'pending'
  if (code === 1) return 'active'
  if (code === 2) return 'closed'
  return 'none'
}

export async function fetchOnChainAppeals(): Promise<Crisis[]> {
  if (!APPEALS_APP) return []
  const count = await readGlobalUint(APPEALS_APP, 'appeal_count')
  const crises: Crisis[] = []

  for (let id = 1; id <= count; id++) {
    try {
      const s = await readAppealState(id)
      const chainStatus = mapAppealStatus(s.status)
      const title = `On-chain appeal #${id}`
      const description = 'Community appeal on Algorand — verify box state on Lora.'
      const category = inferCategoryFromText(title, description)
      crises.push({
        id: `CRS-ONCHAIN-${String(id).padStart(3, '0')}`,
        onChainAppealId: id,
        chainStatus,
        title,
        description,
        category,
        location: { city: 'On-chain', state: 'Live', coordinates: [20 + (id % 5), 78 + (id % 4)] as [number, number] },
        requiredAmount: s.target / 1_000_000,
        raisedAmount: s.raised / 1_000_000,
        beneficiaryWallet: '',
        images: getCrisisImages(category),
        status: chainStatus === 'active' ? 'verified' : chainStatus === 'pending' ? 'pending' : 'funded',
        verificationScore: chainStatus === 'active' ? 100 : 0,
        upvotes: 0,
        downvotes: 0,
        verifiers: [],
        submittedBy: 'CHAIN',
        submittedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
      })
    } catch {
      /* skip */
    }
  }
  return crises
}
