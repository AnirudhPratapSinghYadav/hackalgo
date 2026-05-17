import type {
  ApprovalRecord,
  AuditEntry,
  BeneficiaryGroup,
  Campaign,
  CampaignMilestone,
  CommunityPost,
  DataProvenance,
  DisasterEvent,
  DonationRecord,
  OrganizationProfile,
  VerificationRecord,
  DisbursementBatch,
} from '../../domain/platform'
import type { ApprovalItem } from '../../types/disbursement'
import { mockCrises, mockDonations } from '../mock/crises'
import { mockApprovals, mockDisbursements, mockEvents } from '../mock/disbursements'

const SEED: DataProvenance = 'seed'

export const seedOrganizations: OrganizationProfile[] = [
  {
    id: 'org-goonj',
    name: 'Goonj',
    type: 'ngo',
    verified: true,
    jurisdiction: 'India — National',
  },
  {
    id: 'org-ndma',
    name: 'NDMA Field Coordination',
    type: 'government',
    verified: true,
    jurisdiction: 'India — Central',
  },
  {
    id: 'org-seeds',
    name: 'SEEDS India',
    type: 'ngo',
    verified: true,
    jurisdiction: 'India — Multi-state',
  },
]

function enrichEvents(): DisasterEvent[] {
  return mockEvents.map((e, i) => {
    const parts = e.location.split(',').map((s) => s.trim())
    const state = parts[0] ?? 'Unknown'
    const district = parts[1] ?? parts[0] ?? 'Unknown'
    const opsStatus =
      e.status === 'Pending Approval'
        ? 'approval_pending'
        : e.status === 'Approved'
          ? 'approved'
          : 'disbursed'
    return {
      ...e,
      district,
      state,
      detectedAt: `2025-01-${12 + i}T06:00:00Z`,
      opsStatus,
      linkedCampaignId: `CMP-${e.id.replace('EVT', '')}`,
      dataSource: SEED,
      sourceLabels: ['Copernicus EMS', 'IMD alert', 'GDACS — demo seed'],
    }
  })
}

export const seedEvents = enrichEvents()

export const seedVerificationRecords: VerificationRecord[] = seedEvents.map((e) => ({
  id: `VRF-${e.id}`,
  eventId: e.id,
  status: e.opsStatus === 'disbursed' ? 'verified' : e.opsStatus === 'approval_pending' ? 'pending' : 'verified',
  confidence: e.confidence,
  sources: ['Copernicus', 'IMD', 'Field assessment queue'],
  createdAt: e.detectedAt,
  updatedAt: e.detectedAt,
  dataSource: SEED,
}))

export const seedApprovalRecords: ApprovalRecord[] = [
  {
    id: 'APR-EVT-003',
    eventId: 'EVT-2025-003',
    approverRole: 'district_officer',
    approverId: 'OFFICER...A2B3',
    decision: 'approved',
    notes: 'Field assessment corroborates satellite flood extent.',
    timestamp: '2025-01-14T11:00:00Z',
    dataSource: SEED,
  },
  {
    id: 'APR-EVT-004',
    eventId: 'EVT-2025-004',
    approverRole: 'ngo_coordinator',
    approverId: 'NGO...K4L2',
    decision: 'approved',
    timestamp: '2025-01-13T09:30:00Z',
    dataSource: SEED,
  },
]

export const seedApprovals: ApprovalItem[] = mockApprovals

export const seedDisbursementBatches: DisbursementBatch[] = mockDisbursements.map((d, i) => ({
  id: `BATCH-${i + 1}`,
  eventId: d.eventId,
  crisisId: d.crisisId,
  amount: d.amount,
  beneficiaryCount: d.beneficiaryCount ?? 0,
  status: d.status === 'confirmed' ? 'confirmed' : d.status === 'pending' ? 'queued' : 'submitted',
  txnHash: d.txnHash,
  preparedAt: d.timestamp,
  executedAt: d.status !== 'pending' ? d.timestamp : undefined,
  approverId: d.approverId,
  dataSource: SEED,
}))

export const seedCampaigns: Campaign[] = [
  {
    id: 'CMP-2025-001',
    title: 'Assam Goalpara — Emergency shelter & dry rations',
    summary: 'Coordinated relief for 2,400 households after Brahmaputra embankment breach.',
    organizationId: 'org-ndma',
    eventId: 'EVT-2025-001',
    location: 'Goalpara, Assam',
    district: 'Goalpara',
    state: 'Assam',
    goalAmount: 250_000,
    raisedAmount: 142_800,
    releasedAmount: 95_000,
    status: 'active',
    fundingStatus: 'raising',
    verificationStatus: 'verified',
    tags: ['flood', 'shelter', 'rations'],
    createdAt: '2025-01-12T08:00:00Z',
    updatedAt: '2025-01-15T14:00:00Z',
    dataSource: SEED,
  },
  {
    id: 'CMP-2025-002',
    title: 'Bihar Darbhanga — Medical outreach camps',
    summary: 'Mobile health units for waterborne illness prevention in inundated blocks.',
    organizationId: 'org-seeds',
    eventId: 'EVT-2025-002',
    location: 'Darbhanga, Bihar',
    district: 'Darbhanga',
    state: 'Bihar',
    goalAmount: 180_000,
    raisedAmount: 67_400,
    releasedAmount: 22_000,
    status: 'active',
    fundingStatus: 'raising',
    verificationStatus: 'pending',
    tags: ['flood', 'health'],
    createdAt: '2025-01-13T10:00:00Z',
    updatedAt: '2025-01-15T09:00:00Z',
    dataSource: SEED,
  },
  {
    id: 'CMP-CRS-001',
    title: 'Dharavi fire — Family shelter fund',
    summary: 'Hyperlocal crisis campaign linked to verified household loss.',
    organizationId: 'org-goonj',
    crisisId: 'CRS-2025-001',
    location: 'Mumbai, Maharashtra',
    district: 'Mumbai City',
    state: 'Maharashtra',
    goalAmount: 25_000,
    raisedAmount: 8_400,
    releasedAmount: 250,
    status: 'active',
    fundingStatus: 'raising',
    verificationStatus: 'verified',
    tags: ['housing', 'urban'],
    createdAt: '2025-01-12T21:00:00Z',
    updatedAt: '2025-01-15T12:00:00Z',
    dataSource: SEED,
  },
  {
    id: 'CMP-2025-003',
    title: 'Kerala Alappuzha — Livelihood recovery kits',
    summary: 'Fishing gear and pump repair for 320 households post-inundation.',
    organizationId: 'org-seeds',
    eventId: 'EVT-2025-003',
    location: 'Alappuzha, Kerala',
    district: 'Alappuzha',
    state: 'Kerala',
    goalAmount: 120_000,
    raisedAmount: 118_500,
    releasedAmount: 82_000,
    status: 'active',
    fundingStatus: 'target_met',
    verificationStatus: 'verified',
    tags: ['flood', 'livelihood'],
    createdAt: '2025-01-11T07:00:00Z',
    updatedAt: '2025-01-14T18:00:00Z',
    dataSource: SEED,
  },
]

export const seedMilestones: CampaignMilestone[] = [
  { id: 'MS-1', campaignId: 'CMP-2025-001', label: '25% funded', targetAmount: 62_500, reachedAt: '2025-01-13T12:00:00Z', dataSource: SEED },
  { id: 'MS-2', campaignId: 'CMP-2025-001', label: '50% funded', targetAmount: 125_000, reachedAt: '2025-01-14T20:00:00Z', dataSource: SEED },
  { id: 'MS-3', campaignId: 'CMP-2025-003', label: 'Target met', targetAmount: 120_000, reachedAt: '2025-01-14T16:00:00Z', dataSource: SEED },
]

export const seedPosts: CommunityPost[] = [
  {
    id: 'POST-002',
    type: 'campaign_launch',
    title: 'Emergency shelter campaign now open',
    body: 'Public donations accepted for dry rations, tarpaulin, and temporary shelter kits. All releases logged to audit trail.',
    location: 'Goalpara, Assam',
    district: 'Goalpara',
    state: 'Assam',
    authorName: 'NDMA Field Coordination',
    authorRole: 'ngo_coordinator',
    authorKind: 'official',
    organizationId: 'org-ndma',
    timestamp: '2025-01-12T08:30:00Z',
    tags: ['campaign'],
    verificationStatus: 'verified',
    fundingStatus: 'raising',
    campaignId: 'CMP-2025-001',
    eventId: 'EVT-2025-001',
    attachments: [],
    dataSource: SEED,
  },
  {
    id: 'POST-003',
    type: 'fundraising_update',
    title: '57% of shelter goal reached',
    body: '₹1.43 lakh raised of ₹2.5 lakh goal. Next tranche release pending district sign-off.',
    location: 'Goalpara, Assam',
    district: 'Goalpara',
    state: 'Assam',
    authorName: 'NDMA Field Coordination',
    authorRole: 'ngo_coordinator',
    authorKind: 'official',
    organizationId: 'org-ndma',
    timestamp: '2025-01-14T20:00:00Z',
    tags: ['fundraising'],
    verificationStatus: 'verified',
    fundingStatus: 'raising',
    campaignId: 'CMP-2025-001',
    attachments: [],
    dataSource: SEED,
  },
  {
    id: 'POST-007',
    type: 'impact_report',
    title: 'Kerala livelihood kits — 268 households served',
    body: 'Pump repair and fishing gear distributed. Impact statement verified by field partner.',
    location: 'Alappuzha, Kerala',
    district: 'Alappuzha',
    state: 'Kerala',
    authorName: 'SEEDS India',
    authorRole: 'ngo_coordinator',
    authorKind: 'official',
    organizationId: 'org-seeds',
    timestamp: '2025-01-14T18:30:00Z',
    tags: ['impact', 'livelihood'],
    verificationStatus: 'verified',
    fundingStatus: 'released',
    campaignId: 'CMP-2025-003',
    eventId: 'EVT-2025-003',
    attachments: [],
    dataSource: SEED,
  },
]

export const seedBeneficiaryGroups: BeneficiaryGroup[] = [
  {
    id: 'BEN-GRP-001',
    eventId: 'EVT-2025-001',
    label: 'Goalpara camps A–C',
    district: 'Goalpara',
    state: 'Assam',
    householdCount: 2400,
    impactSummary: 'Shelter and ration support — household IDs held internally',
    dataSource: SEED,
  },
  {
    id: 'BEN-GRP-002',
    eventId: 'EVT-2025-003',
    label: 'Alappuzha coastal blocks',
    district: 'Alappuzha',
    state: 'Kerala',
    householdCount: 320,
    impactSummary: 'Livelihood recovery kits distributed',
    dataSource: SEED,
  },
]

export const seedAuditEntries: AuditEntry[] = [
  {
    id: 'AUD-001',
    layer: 'operations',
    action: 'event_detected',
    entityType: 'DisasterEvent',
    entityId: 'EVT-2025-001',
    actorId: 'GUARDIAN-AI',
    actorRole: 'admin',
    timestamp: '2025-01-12T06:00:00Z',
    metadata: { source: 'Copernicus EMS' },
    dataSource: SEED,
  },
  {
    id: 'AUD-002',
    layer: 'operations',
    action: 'approval_recorded',
    entityType: 'ApprovalRecord',
    entityId: 'APR-EVT-003',
    actorId: 'OFFICER...A2B3',
    actorRole: 'district_officer',
    timestamp: '2025-01-14T11:00:00Z',
    dataSource: SEED,
  },
  {
    id: 'AUD-003',
    layer: 'ledger',
    action: 'disbursement_confirmed',
    entityType: 'DisbursementBatch',
    entityId: 'BATCH-1',
    actorId: 'OFFICER...A2B3',
    actorRole: 'district_officer',
    timestamp: '2025-01-15T14:32:00Z',
    txnHash: mockDisbursements[0]?.txnHash,
    dataSource: SEED,
  },
  {
    id: 'AUD-004',
    layer: 'community',
    action: 'post_published',
    entityType: 'CommunityPost',
    entityId: 'POST-004',
    actorId: 'org-seeds',
    actorRole: 'ngo_coordinator',
    timestamp: '2025-01-15T11:00:00Z',
    dataSource: SEED,
  },
]

export const seedDonations: DonationRecord[] = mockDonations.map((d, i) => ({
  ...d,
  id: `DON-${i + 1}`,
  campaignId: d.crisisId === 'CRS-2025-001' ? 'CMP-CRS-001' : undefined,
  status: 'confirmed' as const,
  dataSource: SEED,
}))

export const platformSeed = {
  crises: [...mockCrises],
  donations: seedDonations,
  disasterEvents: seedEvents,
  verificationRecords: seedVerificationRecords,
  approvalRecords: seedApprovalRecords,
  approvals: seedApprovals,
  disbursements: [...mockDisbursements],
  disbursementBatches: seedDisbursementBatches,
  campaigns: seedCampaigns,
  communityPosts: seedPosts,
  campaignMilestones: seedMilestones,
  beneficiaryGroups: seedBeneficiaryGroups,
  auditEntries: seedAuditEntries,
  organizations: seedOrganizations,
}
