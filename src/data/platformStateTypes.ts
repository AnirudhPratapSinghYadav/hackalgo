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
} from '../domain/platform'
import type { ApprovalItem, Disbursement } from '../types/disbursement'
import type { Crisis } from '../types/crisis'
export type BeneficiaryDeliveryType = 'wallet' | 'phone' | 'moneygram'

export interface BeneficiaryPayoutRow {
  name: string
  /** Algorand address when deliveryType is wallet */
  address: string
  deliveryType: BeneficiaryDeliveryType
  /** Wallet address, phone (+91…), or MoneyGram reference */
  identifier: string
  /** Micro-USDC (6 decimals) for DisasterVault disburse */
  amountMicroUsdc: number
}

export interface PlatformStateSlice {
  platformDataMode: DataProvenance
  crises: Crisis[]
  donations: DonationRecord[]
  votes: Record<string, 'up' | 'down' | null>
  disasterEvents: DisasterEvent[]
  verificationRecords: VerificationRecord[]
  approvalRecords: ApprovalRecord[]
  approvals: ApprovalItem[]
  disbursements: Disbursement[]
  disbursementBatches: DisbursementBatch[]
  campaigns: Campaign[]
  communityPosts: CommunityPost[]
  campaignMilestones: CampaignMilestone[]
  beneficiaryGroups: BeneficiaryGroup[]
  auditEntries: AuditEntry[]
  organizations: OrganizationProfile[]
  pendingBeneficiaryPayouts: BeneficiaryPayoutRow[]
}
