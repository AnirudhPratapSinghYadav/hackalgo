/**
 * AlgoVault routing matrix — Phase 1 skeleton
 * @see master architecture prompt
 */

export const ROUTES = {
  // Public narrative
  home: '/',
  access: '/access',
  about: '/about',
  protocol: '/protocol',
  terms: '/legal/terms',
  privacy: '/legal/privacy',
  disclaimers: '/legal/disclaimers',

  // Community participation layer
  community: '/community',
  communityFeed: '/community/feed',
  communityCampaigns: '/community/campaigns',
  communityCrises: '/community/crises',
  communityActivity: '/community/activity',
  communityDonations: '/community/donations',
  communityDetail: (id: string) => `/community/crises/${id}` as const,
  submitCrisis: '/submit-crisis',
  verifyCrisis: (id: string) => `/verify-crisis/${id}` as const,
  crisisDonate: (id: string) => `/crisis/${id}/donate` as const,
  appealWithdraw: (id: string) => `/appeal/${id}/withdraw` as const,

  // Institutional operations
  operations: '/operations',
  operationsEvents: '/operations/events',
  operationsVerification: '/operations/verification',
  operationsCommunityQueue: '/operations/community-queue',
  operationsDisbursements: '/operations/disbursements',
  operationsBeneficiaries: '/operations/beneficiaries',
  operationsAudit: '/operations/audit',
  operationsMap: '/operations/map',
  operationsSettings: '/operations/settings',

  // Sandbox (hidden from pitch — was /lab)
  sandboxSavings: '/sandbox/savings',
  internalExplorer: '/internal/explorer',
  /** @deprecated use sandboxSavings */
  labSavings: '/sandbox/savings',
} as const

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES] | string

export const PUBLIC_ROUTES = [
  ROUTES.home,
  ROUTES.access,
  ROUTES.about,
  ROUTES.protocol,
  ROUTES.community,
  ROUTES.communityFeed,
  ROUTES.communityCampaigns,
  ROUTES.communityActivity,
  ROUTES.communityDonations,
  ROUTES.submitCrisis,
] as const

/** Narrative pages that must render immediately (no chain bootstrap gate). */
export function isPublicNarrativeRoute(pathname: string): boolean {
  return (
    pathname === ROUTES.home ||
    pathname === ROUTES.access ||
    pathname === ROUTES.about ||
    pathname === ROUTES.protocol ||
    pathname.startsWith('/legal/')
  )
}

export const OPS_ROUTES = [
  ROUTES.operations,
  ROUTES.operationsEvents,
  ROUTES.operationsVerification,
  ROUTES.operationsCommunityQueue,
  ROUTES.operationsDisbursements,
  ROUTES.operationsBeneficiaries,
  ROUTES.operationsAudit,
  ROUTES.operationsMap,
  ROUTES.operationsSettings,
] as const
