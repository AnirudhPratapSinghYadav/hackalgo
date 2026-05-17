/** Demo data — only loaded when VITE_DEMO_STRICT is not true. */
import { platformSeed } from './seed/platformSeed'
import type { PlatformStateSlice } from './platformStateTypes'

export function loadDemoSeeds(): PlatformStateSlice {
  return {
    platformDataMode: 'seed',
    crises: platformSeed.crises,
    donations: platformSeed.donations,
    votes: {},
    disasterEvents: platformSeed.disasterEvents,
    verificationRecords: platformSeed.verificationRecords,
    approvalRecords: platformSeed.approvalRecords,
    approvals: platformSeed.approvals,
    disbursements: platformSeed.disbursements,
    disbursementBatches: platformSeed.disbursementBatches,
    campaigns: platformSeed.campaigns,
    communityPosts: platformSeed.communityPosts,
    campaignMilestones: platformSeed.campaignMilestones,
    beneficiaryGroups: platformSeed.beneficiaryGroups,
    auditEntries: platformSeed.auditEntries,
    organizations: platformSeed.organizations,
    pendingBeneficiaryPayouts: [],
  }
}
