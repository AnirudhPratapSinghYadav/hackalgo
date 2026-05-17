/** AlgoVault platform domain — operations, community, ledger layers */

import type { Crisis, CrisisDonation, CrisisStatus } from '../types/crisis'
import type { ApprovalItem, DisasterEvent as LegacyDisasterEvent, Disbursement } from '../types/disbursement'

export type { Crisis, CrisisDonation, CrisisStatus }
export type { ApprovalItem, Disbursement }

export type DataProvenance = 'live' | 'verified' | 'demo' | 'seed'

export type PlatformRole =
  | 'admin'
  | 'ngo_coordinator'
  | 'district_officer'
  | 'verifier'
  | 'donor'
  | 'public_viewer'
  | 'auditor'
  | 'beneficiary_operator'

export type SessionMode = 'wallet' | 'demo' | 'otp_mock'

export interface SessionContext {
  mode: SessionMode
  role: PlatformRole
  organizationId: string | null
  walletAddress: string | null
  capabilities: string[]
}

export type CommunityPostType = 'campaign_launch' | 'fundraising_update' | 'impact_report'

export type PostAuthorKind = 'official' | 'community' | 'field_verified' | 'system'

export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected'

export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed' | 'closed'

export type EventOpsStatus =
  | 'detected'
  | 'in_operations'
  | 'verification_pending'
  | 'approval_pending'
  | 'approved'
  | 'disbursement_queued'
  | 'disbursed'
  | 'closed'

export type FundingStatus = 'not_started' | 'raising' | 'target_met' | 'released' | 'closed'

export interface MediaAttachment {
  id: string
  url: string
  mimeType: string
  label: string
  provenance: DataProvenance
}

export interface OrganizationProfile {
  id: string
  name: string
  type: 'ngo' | 'government' | 'multilateral' | 'field_partner'
  verified: boolean
  logoUrl?: string
  jurisdiction: string
}

export interface SituationBriefCache {
  summary: string | null
  recommendedAction?: string | null
  criticality?: 'critical' | 'high' | 'medium'
  headlines?: { title: string; url: string; source: string }[]
  affectedArea?: string
  severityPlain?: string
  populationExposure?: string | null
  generatedAt: string
  error?: 'brief_unavailable'
}

export interface DisasterEvent extends LegacyDisasterEvent {
  district?: string
  state?: string
  detectedAt: string
  opsStatus: EventOpsStatus
  linkedCampaignId?: string
  /** On-chain DisasterVault campaign id */
  onChainCampaignId?: number
  /** On-chain campaign status code (1–4) */
  onChainStatus?: number
  externalId?: string
  evidenceUrl?: string
  dataSource: DataProvenance
  sourceLabels: string[]
  latitude?: number
  longitude?: number
  populationAffected?: number
  alertScore?: number
  situationBrief?: SituationBriefCache
  situationBriefAt?: string
}

export interface VerificationRecord {
  id: string
  eventId: string
  status: VerificationStatus
  confidence: number
  sources: string[]
  fieldOfficerId?: string
  createdAt: string
  updatedAt: string
  dataSource: DataProvenance
}

export interface ApprovalRecord {
  id: string
  eventId: string
  approverRole: PlatformRole
  approverId: string
  decision: 'approved' | 'rejected' | 'deferred'
  notes?: string
  timestamp: string
  dataSource: DataProvenance
}

export interface DisbursementBatch {
  id: string
  eventId?: string
  campaignId?: string
  crisisId?: string
  amount: number
  beneficiaryCount: number
  status: 'draft' | 'queued' | 'submitted' | 'confirmed' | 'failed'
  txnHash?: string
  preparedAt: string
  executedAt?: string
  approverId: string
  dataSource: DataProvenance
}

export interface AuditEntry {
  id: string
  layer: 'operations' | 'community' | 'ledger'
  action: string
  entityType: string
  entityId: string
  actorId: string
  actorRole: PlatformRole
  timestamp: string
  metadata?: Record<string, string>
  txnHash?: string
  dataSource: DataProvenance
}

export interface BeneficiaryGroup {
  id: string
  eventId: string
  label: string
  district: string
  state: string
  householdCount: number
  /** Public-safe summary only */
  impactSummary: string
  dataSource: DataProvenance
}

export interface OperationalNote {
  id: string
  eventId: string
  authorId: string
  authorRole: PlatformRole
  body: string
  createdAt: string
  internal: boolean
}

export interface Campaign {
  id: string
  title: string
  summary: string
  organizationId: string
  eventId?: string
  crisisId?: string
  location: string
  district: string
  state: string
  goalAmount: number
  raisedAmount: number
  releasedAmount: number
  status: CampaignStatus
  fundingStatus: FundingStatus
  verificationStatus: VerificationStatus
  tags: string[]
  createdAt: string
  updatedAt: string
  dataSource: DataProvenance
}

export interface CampaignMilestone {
  id: string
  campaignId: string
  label: string
  targetAmount?: number
  reachedAt?: string
  dataSource: DataProvenance
}

export interface CommunityPost {
  id: string
  type: CommunityPostType
  title: string
  body: string
  location: string
  district: string
  state: string
  authorName: string
  authorRole: PlatformRole
  authorKind: PostAuthorKind
  organizationId?: string
  timestamp: string
  tags: string[]
  verificationStatus: VerificationStatus
  fundingStatus?: FundingStatus
  campaignId?: string
  eventId?: string
  crisisId?: string
  attachments: MediaAttachment[]
  dataSource: DataProvenance
}

export interface DonationRecord extends CrisisDonation {
  id: string
  campaignId?: string
  status: 'pending' | 'confirmed' | 'released'
  dataSource: DataProvenance
}

/** Lean community feed — three post types for appeals rail */
export const FEED_ALLOWED_POST_TYPES: CommunityPostType[] = [
  'campaign_launch',
  'fundraising_update',
  'impact_report',
]

export const POST_TYPE_LABELS: Record<CommunityPostType, string> = {
  campaign_launch: 'Campaign launch',
  fundraising_update: 'Fundraising update',
  impact_report: 'Impact report',
}
