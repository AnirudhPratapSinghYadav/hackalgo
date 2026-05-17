import type { PlatformStateSlice } from './platformStateTypes'

/** Production initial state — no seed/mock data. */
export const emptyPlatformState: PlatformStateSlice = {
  platformDataMode: 'live',
  crises: [],
  donations: [],
  votes: {},
  disasterEvents: [],
  verificationRecords: [],
  approvalRecords: [],
  approvals: [],
  disbursements: [],
  disbursementBatches: [],
  campaigns: [],
  communityPosts: [],
  campaignMilestones: [],
  beneficiaryGroups: [],
  auditEntries: [],
  organizations: [],
  pendingBeneficiaryPayouts: [],
}
