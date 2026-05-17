import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'
import { persist } from 'zustand/middleware'
import type { Crisis, CrisisCategory, CrisisVerifier } from '../types/crisis'
import type { ApprovalItem, Disbursement } from '../types/disbursement'
import type {
  ApprovalRecord,
  AuditEntry,
  BeneficiaryGroup,
  Campaign,
  CampaignMilestone,
  CommunityPost,
  DataProvenance,
  DisasterEvent,
  DisbursementBatch,
  DonationRecord,
  OrganizationProfile,
  PlatformRole,
  SessionContext,
  SessionMode,
  VerificationRecord,
} from '../domain/platform'
import { emptyPlatformState } from '../data/emptyPlatformState'
import { loadDemoSeeds } from '../data/demoSeeds'
import type { BeneficiaryPayoutRow } from '../data/platformStateTypes'
import { getCrisisImages } from '../lib/crisisImages'

const IS_STRICT = import.meta.env.VITE_DEMO_STRICT === 'true'
const initialSlice = IS_STRICT ? emptyPlatformState : loadDemoSeeds()
import {
  prepareDisbursementBatch,
  publishCommunityPost,
  recordApproval,
  roleCapabilities,
  transitionEventToVerification,
} from '../services/platform/flowEngine'

export interface CommunityStats {
  verifiedCount: number
  totalRaised: number
  pendingCount: number
  avgVerificationScore: number
}

type VoteMap = Record<string, 'up' | 'down' | null>

export type { BeneficiaryPayoutRow } from '../data/platformStateTypes'

interface PlatformState {
  /** Global data honesty label for UI */
  platformDataMode: DataProvenance
  session: SessionContext
  crises: Crisis[]
  donations: DonationRecord[]
  votes: VoteMap
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
  ledgerFetchError?: string
  pendingBeneficiaryPayouts: BeneficiaryPayoutRow[]
  campaignOpsMeta: Record<number, import('../domain/campaignOpsMeta').CampaignOpsMeta>

  registerCampaignMeta: (meta: import('../domain/campaignOpsMeta').CampaignOpsMeta) => void
  getCampaignMeta: (onChainCampaignId: number) => import('../domain/campaignOpsMeta').CampaignOpsMeta | undefined
  simulateAnticipatoryTrigger: (onChainCampaignId: number) => void

  // Session
  setSessionMode: (mode: SessionMode) => void
  setSessionWallet: (address: string | null) => void
  setSessionRole: (role: PlatformRole) => void

  // Community (crisis layer)
  getCommunityStats: () => CommunityStats
  getDonationsForCrisis: (crisisId: string) => DonationRecord[]
  getDonationsForCampaign: (campaignId: string) => DonationRecord[]
  vote: (crisisId: string, direction: 'up' | 'down') => void
  addCrisis: (input: {
    title: string
    description: string
    category: CrisisCategory
    city: string
    state: string
    requiredAmount: number
    beneficiaryWallet: string
  }) => string
  recordDonation: (crisisId: string, amount: number, donor?: string, campaignId?: string) => void
  /** Record donation after confirmed on-chain txn */
  recordDonationFromChain: (
    crisisId: string,
    amountAlgo: number,
    txnHash: string,
    donor: string,
    appealId?: number,
  ) => void
  setPendingBeneficiaryPayouts: (rows: BeneficiaryPayoutRow[]) => void
  mergeLiveDisasterEvents: (events: DisasterEvent[]) => void
  replaceGdacsDisasterEvents: (events: DisasterEvent[]) => void
  linkEventOnChainCampaign: (eventId: string, campaignId: number, txId: string) => void
  syncEventCampaignFromChain: (eventId: string, campaignId: number) => Promise<void>
  approveAppealOnChain: (crisisId: string, appealId: number, txId: string) => void
  setCrisisOnChain: (
    crisisId: string,
    meta: { onChainAppealId?: number; chainStatus?: import('../types/crisis').ChainAppealStatus; txnHash?: string },
  ) => void
  submitVerification: (
    crisisId: string,
    verifier: Omit<CrisisVerifier, 'verifiedAt'> & { verifiedAt?: string },
  ) => void

  // Operations lifecycle
  ingestDetectedEvent: (
    event: Omit<DisasterEvent, 'opsStatus' | 'dataSource' | 'detectedAt'> & { sourceLabels?: string[] },
  ) => void
  startVerification: (eventId: string) => void
  submitEventApproval: (
    eventId: string,
    approverId: string,
    approverRole: PlatformRole,
    decision: ApprovalRecord['decision'],
    notes?: string,
  ) => void
  queueDisbursement: (input: {
    eventId?: string
    campaignId?: string
    crisisId?: string
    amount: number
    beneficiaryCount: number
    approverId: string
  }) => void
  confirmDisbursement: (batchId: string, txnHash: string) => void
  confirmDisbursementFromChain: (batchId: string, txnHash: string, payouts: BeneficiaryPayoutRow[]) => void

  // Community posts
  addCommunityPost: (
    post: Omit<CommunityPost, 'id' | 'timestamp' | 'dataSource' | 'authorName' | 'authorRole'> & {
      authorName?: string
      authorKind?: CommunityPost['authorKind']
    },
  ) => void

  // Queries
  getCampaign: (id: string) => Campaign | undefined
  getOrganization: (id: string) => OrganizationProfile | undefined
  getPostsForCampaign: (campaignId: string) => CommunityPost[]
  getAuditForEntity: (entityId: string) => AuditEntry[]
  mergeLedgerAuditHints: (entries: AuditEntry[]) => void
  setLedgerFetchError: (error?: string) => void

  /** On-chain DisasterVault (when VITE_USE_REAL_CONTRACT=true) */
  createCampaignOnChain: (
    sender: string,
    signTransactions: import('../services/algorand').SignTransactionsFn,
    params: import('../integrations/disasterVaultChain').CreateCampaignParams & { eventId?: string },
  ) => Promise<{ txId: string; campaignId: number }>
  donateToCampaignOnChain: (
    sender: string,
    signTransactions: import('../services/algorand').SignTransactionsFn,
    campaignId: number,
    amountMicroUsdc: number,
  ) => Promise<string>
  approveCampaignOnChain: (
    approver: string,
    signTransactions: import('../services/algorand').SignTransactionsFn,
    campaignId: number,
  ) => Promise<string>
  disburseCampaignOnChain: (
    sender: string,
    signTransactions: import('../services/algorand').SignTransactionsFn,
    campaignId: number,
    beneficiaries: string[],
    amountsMicroUsdc: number[],
    batchOpts?: { batchId?: string; eventId?: string },
  ) => Promise<string>
  hydrateFromChain: (partial: {
    campaigns?: Campaign[]
    disasterEvents?: DisasterEvent[]
    crises?: Crisis[]
  }) => void
  refreshAppealFromChain: (crisisId: string, appealId: number) => Promise<void>
  refreshCampaignFromChain: (campaignId: number) => Promise<void>
}

function liveEventsSignature(events: DisasterEvent[]): string {
  return events
    .filter((e) => e.dataSource === 'live')
    .map((e) => `${e.externalId ?? e.id}|${e.severity}|${e.location}|${e.confidence}`)
    .join(';')
}

function computeStats(crises: Crisis[]): CommunityStats {
  const verified = crises.filter((c) => c.status === 'verified' || c.status === 'funded')
  const pending = crises.filter((c) => c.status === 'pending' || c.status === 'under_review')
  const scored = crises.filter((c) => c.verificationScore > 0)
  const avgVerificationScore =
    scored.length > 0 ? Math.round(scored.reduce((s, c) => s + c.verificationScore, 0) / scored.length) : 0
  return {
    verifiedCount: verified.length,
    totalRaised: crises.reduce((s, c) => s + c.raisedAmount, 0),
    pendingCount: pending.length,
    avgVerificationScore,
  }
}

const defaultSession: SessionContext = {
  mode: 'wallet',
  role: 'public_viewer',
  organizationId: null,
  walletAddress: null,
  capabilities: roleCapabilities('public_viewer'),
}

export const usePlatformStore = create<PlatformState>()(
  persist(
    (set, get) => ({
      platformDataMode: initialSlice.platformDataMode,
      session: defaultSession,
      crises: initialSlice.crises,
      donations: initialSlice.donations,
      votes: initialSlice.votes,
      disasterEvents: initialSlice.disasterEvents,
      verificationRecords: initialSlice.verificationRecords,
      approvalRecords: initialSlice.approvalRecords,
      approvals: initialSlice.approvals,
      disbursements: initialSlice.disbursements,
      disbursementBatches: initialSlice.disbursementBatches,
      campaigns: initialSlice.campaigns,
      communityPosts: initialSlice.communityPosts,
      campaignMilestones: initialSlice.campaignMilestones,
      beneficiaryGroups: initialSlice.beneficiaryGroups,
      auditEntries: initialSlice.auditEntries,
      organizations: initialSlice.organizations,
      pendingBeneficiaryPayouts: initialSlice.pendingBeneficiaryPayouts,
      campaignOpsMeta: {},

      registerCampaignMeta: (meta) => {
        set((s) => ({
          campaignOpsMeta: { ...s.campaignOpsMeta, [meta.onChainCampaignId]: meta },
        }))
        void fetch('/api/campaign-meta', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(meta),
        }).catch(() => undefined)
      },

      getCampaignMeta: (onChainCampaignId) => get().campaignOpsMeta[onChainCampaignId],

      simulateAnticipatoryTrigger: (onChainCampaignId) =>
        set((s) => {
          const m = s.campaignOpsMeta[onChainCampaignId]
          if (!m || m.kind !== 'anticipatory') return s
          return {
            campaignOpsMeta: {
              ...s.campaignOpsMeta,
              [onChainCampaignId]: {
                ...m,
                autoTriggered: true,
                currentTriggerValue: (m.triggerThreshold ?? 0) + 0.5,
                monitoringStatus: 'Trigger crossed — auto-disbursement alert sent (demo)',
              },
            },
          }
        }),

      setSessionMode: (mode) =>
        set((s) => {
          if (s.session.mode === mode) return s
          const role: PlatformRole = mode === 'demo' ? 'ngo_coordinator' : s.session.role
          return {
            session: {
              ...s.session,
              mode,
              role,
              organizationId: mode === 'demo' ? 'org-ndma' : s.session.organizationId,
              capabilities: roleCapabilities(role),
            },
            platformDataMode: mode === 'demo' ? 'demo' : s.platformDataMode,
          }
        }),

      setSessionWallet: (address) =>
        set((s) => {
          if (s.session.walletAddress === address) return s
          const role: PlatformRole = address ? 'district_officer' : 'public_viewer'
          return {
            session: {
              ...s.session,
              walletAddress: address,
              role,
              capabilities: roleCapabilities(role),
            },
          }
        }),

      setSessionRole: (role) =>
        set((s) => ({
          session: { ...s.session, role, capabilities: roleCapabilities(role) },
        })),

      getCommunityStats: () => computeStats(get().crises),

      getDonationsForCrisis: (crisisId) => get().donations.filter((d) => d.crisisId === crisisId),

      getDonationsForCampaign: (campaignId) => get().donations.filter((d) => d.campaignId === campaignId),

      vote: (crisisId, direction) => {
        const prev = get().votes[crisisId]
        set((state) => {
          const crises = state.crises.map((c) => {
            if (c.id !== crisisId) return c
            let up = c.upvotes
            let down = c.downvotes
            if (prev === 'up') up -= 1
            if (prev === 'down') down -= 1
            if (prev !== direction) {
              if (direction === 'up') up += 1
              else down += 1
            }
            return { ...c, upvotes: up, downvotes: down }
          })
          const votes = { ...state.votes, [crisisId]: prev === direction ? null : direction }
          return { crises, votes }
        })
      },

      addCrisis: (input) => {
        const id = `CRS-2025-${String(get().crises.length + 1).padStart(3, '0')}`
        const crisis: Crisis = {
          id,
          title: input.title,
          description: input.description,
          category: input.category,
          location: { city: input.city, state: input.state },
          requiredAmount: input.requiredAmount,
          raisedAmount: 0,
          beneficiaryWallet: input.beneficiaryWallet,
          images: getCrisisImages(input.category),
          status: 'pending',
          chainStatus: 'pending',
          verificationScore: 0,
          upvotes: 0,
          downvotes: 0,
          verifiers: [],
          submittedBy: 'USER...NEW',
          submittedAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
        }
        set((s) => ({ crises: [crisis, ...s.crises] }))
        return id
      },

      recordDonation: (crisisId, amount, donor = 'DONOR...YOU', campaignId) => {
        const strict = import.meta.env.VITE_DEMO_STRICT === 'true'
        if (strict) {
          throw new Error('Simulated donations disabled. Connect wallet and donate on-chain.')
        }
        const donation: DonationRecord = {
          id: `DON-${Date.now()}`,
          crisisId,
          campaignId,
          donor,
          amount,
          txnHash: `SIMULATED-${Date.now()}`,
          timestamp: new Date().toISOString(),
          status: 'confirmed',
          dataSource: 'demo',
        }
        set((state) => ({
          donations: [donation, ...state.donations],
        }))
      },

      recordDonationFromChain: (crisisId, amountAlgo, txnHash, donor, appealId) => {
        const amountUsdc = amountAlgo / 1_000_000
        const donation: DonationRecord = {
          id: `DON-${Date.now()}`,
          crisisId,
          campaignId: appealId ? `CMP-CRS-${crisisId.split('-').pop()}` : undefined,
          donor,
          amount: amountUsdc,
          txnHash,
          timestamp: new Date().toISOString(),
          status: 'confirmed',
          dataSource: 'live',
        }
        set((state) => ({
          crises: state.crises.map((c) =>
            c.id === crisisId
              ? {
                  ...c,
                  raisedAmount: Math.min(c.raisedAmount + amountUsdc, c.requiredAmount),
                  lastUpdated: new Date().toISOString(),
                }
              : c,
          ),
          donations: [donation, ...state.donations],
          platformDataMode: 'live',
          communityPosts: [
            {
              id: `POST-DON-${Date.now()}`,
              type: 'fundraising_update',
              title: `Donation received — ${amountUsdc.toFixed(4)} ALGO`,
              body: `On-chain donation confirmed. Explorer: ${txnHash.slice(0, 16)}…`,
              location: '',
              district: '',
              state: '',
              authorName: 'AlgoVault System',
              authorRole: 'admin',
              authorKind: 'system',
              timestamp: new Date().toISOString(),
              tags: ['donation', 'on-chain'],
              verificationStatus: 'verified',
              crisisId,
              attachments: [],
              dataSource: 'live',
            },
            ...state.communityPosts,
          ],
        }))
      },

      setPendingBeneficiaryPayouts: (rows) => set({ pendingBeneficiaryPayouts: rows }),

      replaceGdacsDisasterEvents: (events) =>
        set((s) => {
          const nonLive = s.disasterEvents.filter((e) => e.dataSource !== 'live')
          const next = [...events, ...nonLive]
          if (liveEventsSignature(s.disasterEvents) === liveEventsSignature(next) && s.platformDataMode === 'live') {
            return s
          }
          return {
            disasterEvents: next,
            platformDataMode: 'live',
          }
        }),

      mergeLiveDisasterEvents: (events) =>
        set((s) => {
          const byExternal = new Map(
            s.disasterEvents.filter((e) => e.externalId).map((e) => [e.externalId!, e] as const),
          )
          let changed = false
          for (const incoming of events) {
            if (!incoming.externalId) continue
            const prev = byExternal.get(incoming.externalId)
            if (prev) {
              byExternal.set(incoming.externalId, {
                ...prev,
                location: incoming.location,
                type: incoming.type,
                severity: incoming.severity,
                confidence: incoming.confidence,
                latitude: incoming.latitude ?? prev.latitude,
                longitude: incoming.longitude ?? prev.longitude,
                evidenceUrl: incoming.evidenceUrl ?? prev.evidenceUrl,
                detectedAt: incoming.detectedAt,
              })
              changed = true
            } else {
              byExternal.set(incoming.externalId, incoming)
              changed = true
            }
          }
          if (!changed) return s
          const merged = [...byExternal.values()].sort(
            (a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime(),
          )
          return {
            disasterEvents: merged,
            platformDataMode: 'live',
          }
        }),

      linkEventOnChainCampaign: (eventId, campaignId, txId) =>
        set((s) => ({
          disasterEvents: s.disasterEvents.map((e) =>
            e.id === eventId
              ? {
                  ...e,
                  onChainCampaignId: campaignId,
                  linkedCampaignId: `CMP-${String(campaignId).padStart(3, '0')}`,
                  opsStatus: 'approval_pending',
                  status: 'Pending Approval',
                }
              : e,
          ),
          auditEntries: [
            {
              id: `AUD-CMP-${Date.now()}`,
              layer: 'ledger',
              action: 'campaign_created',
              entityType: 'DisasterVault',
              entityId: String(campaignId),
              actorId: 'OPS',
              actorRole: 'district_officer',
              timestamp: new Date().toISOString(),
              txnHash: txId,
              dataSource: 'live',
            },
            ...s.auditEntries,
          ],
        })),

      syncEventCampaignFromChain: async (eventId, campaignId) => {
        const { readCampaignOnChain } = await import('../integrations/disasterVaultChain')
        const s = await readCampaignOnChain(campaignId)
        const opsStatus =
          s.status === 3
            ? 'disbursed'
            : s.status === 2
              ? 'approved'
              : s.status === 4
                ? 'closed'
                : 'approval_pending'
        const statusLabel =
          s.status === 3
            ? 'Disbursed'
            : s.status === 2
              ? 'Approved'
              : s.status === 4
                ? 'Closed'
                : 'Pending Approval'
        set((state) => ({
          disasterEvents: state.disasterEvents.map((e) =>
            e.id === eventId
              ? {
                  ...e,
                  onChainCampaignId: campaignId,
                  onChainStatus: s.status,
                  opsStatus,
                  status: statusLabel as DisasterEvent['status'],
                }
              : e,
          ),
        }))
      },

      setCrisisOnChain: (crisisId, meta) =>
        set((s) => ({
          crises: s.crises.map((c) =>
            c.id === crisisId
              ? {
                  ...c,
                  onChainAppealId: meta.onChainAppealId ?? c.onChainAppealId,
                  chainStatus: meta.chainStatus ?? c.chainStatus,
                  txnHash: meta.txnHash ?? c.txnHash,
                  lastUpdated: new Date().toISOString(),
                }
              : c,
          ),
        })),

      approveAppealOnChain: (crisisId, appealId, txId) =>
        set((s) => ({
          crises: s.crises.map((c) =>
            c.id === crisisId
              ? {
                  ...c,
                  onChainAppealId: appealId,
                  chainStatus: 'active',
                  status: 'verified',
                  lastUpdated: new Date().toISOString(),
                }
              : c,
          ),
          communityPosts: [
            {
              id: `POST-APR-${Date.now()}`,
              type: 'fundraising_update',
              title: 'Appeal approved for donations',
              body: 'Admin approved this appeal on-chain. Donations are now enabled.',
              location: '',
              district: '',
              state: '',
              authorName: 'Operations',
              authorRole: 'ngo_coordinator',
              authorKind: 'official',
              timestamp: new Date().toISOString(),
              tags: ['approved'],
              verificationStatus: 'verified',
              crisisId,
              attachments: [],
              dataSource: 'live',
            },
            ...s.communityPosts,
          ],
          auditEntries: [
            {
              id: `AUD-APR-${Date.now()}`,
              layer: 'ledger',
              action: 'appeal_approved',
              entityType: 'CommunityAppeal',
              entityId: String(appealId),
              actorId: 'ADMIN',
              actorRole: 'ngo_coordinator',
              timestamp: new Date().toISOString(),
              txnHash: txId,
              dataSource: 'live',
            },
            ...s.auditEntries,
          ],
        })),

      submitVerification: (crisisId, verifier) => {
        set((state) => ({
          crises: state.crises.map((c) => {
            if (c.id !== crisisId) return c
            const entry: CrisisVerifier = {
              ...verifier,
              verifiedAt: verifier.verifiedAt ?? new Date().toISOString(),
            }
            const verifiers = [...c.verifiers, entry]
            const verificationScore = Math.min(100, c.verificationScore + 15)
            return {
              ...c,
              verifiers,
              verificationScore,
              status: verificationScore >= 70 ? 'verified' : 'under_review',
              lastUpdated: new Date().toISOString(),
            }
          }),
        }))
      },

      ingestDetectedEvent: (partial) => {
        const event: DisasterEvent = {
          ...partial,
          opsStatus: 'detected',
          detectedAt: new Date().toISOString(),
          dataSource: import.meta.env.VITE_DEMO_STRICT === 'true' ? 'live' : 'demo',
          sourceLabels: partial.sourceLabels ?? ['Manual ingest'],
        }
        set((s) => ({
          disasterEvents: [event, ...s.disasterEvents],
          auditEntries: [
            {
              id: `AUD-${Date.now()}`,
              layer: 'operations',
              action: 'event_detected',
              entityType: 'DisasterEvent',
              entityId: event.id,
              actorId: 'GUARDIAN-AI',
              actorRole: 'admin',
              timestamp: new Date().toISOString(),
              dataSource: 'demo',
            },
            ...s.auditEntries,
          ],
        }))
      },

      startVerification: (eventId) => {
        const event = get().disasterEvents.find((e) => e.id === eventId)
        if (!event) return
        const { event: updated, verification, audit } = transitionEventToVerification(event)
        set((s) => ({
          disasterEvents: s.disasterEvents.map((e) => (e.id === eventId ? updated : e)),
          verificationRecords: [verification, ...s.verificationRecords],
          auditEntries: [audit, ...s.auditEntries],
        }))
      },

      submitEventApproval: (eventId, approverId, approverRole, decision, notes) => {
        const event = get().disasterEvents.find((e) => e.id === eventId)
        if (!event) return
        const { event: updated, approval, audit } = recordApproval(event, approverId, approverRole, decision, notes)
        set((s) => ({
          disasterEvents: s.disasterEvents.map((e) => (e.id === eventId ? updated : e)),
          approvalRecords: [approval, ...s.approvalRecords],
          auditEntries: [audit, ...s.auditEntries],
        }))
      },

      queueDisbursement: (input) => {
        const { batch, audit } = prepareDisbursementBatch({
          ...input,
          beneficiaryCount: input.beneficiaryCount,
          approverId: input.approverId,
          amount: input.amount,
        })
        set((s) => ({
          disbursementBatches: [batch, ...s.disbursementBatches],
          auditEntries: [audit, ...s.auditEntries],
        }))
      },

      confirmDisbursement: (batchId, txnHash) => {
        get().confirmDisbursementFromChain(batchId, txnHash, get().pendingBeneficiaryPayouts)
      },

      confirmDisbursementFromChain: (batchId, txnHash, payouts) => {
        const batch = get().disbursementBatches.find((b) => b.id === batchId)
        if (!batch) return
        const totalMicro = payouts.reduce((s, p) => s + p.amountMicroUsdc, 0)
        const disbursement: Disbursement = {
          txnHash,
          timestamp: new Date().toISOString(),
          amount: totalMicro / 1_000_000,
          destination: `${payouts.length} beneficiaries`,
          approverId: batch.approverId,
          eventId: batch.eventId,
          beneficiaryCount: payouts.length,
          status: 'confirmed',
        }
        set((s) => ({
          disbursementBatches: s.disbursementBatches.map((b) =>
            b.id === batchId ? { ...b, status: 'confirmed', txnHash, executedAt: new Date().toISOString() } : b,
          ),
          disbursements: [disbursement, ...s.disbursements],
          auditEntries: [
            {
              id: `AUD-DIS-${Date.now()}`,
              layer: 'ledger',
              action: 'disbursement_confirmed',
              entityType: 'DisbursementBatch',
              entityId: batchId,
              actorId: batch.approverId,
              actorRole: 'district_officer',
              timestamp: new Date().toISOString(),
              txnHash,
              dataSource: 'live',
            },
            ...s.auditEntries,
          ],
          disasterEvents: s.disasterEvents.map((e) =>
            e.id === batch.eventId ? { ...e, opsStatus: 'disbursed', status: 'Disbursed' } : e,
          ),
          platformDataMode: 'live',
          pendingBeneficiaryPayouts: [],
        }))
      },

      addCommunityPost: (partial) => {
        const session = get().session
        const { post, audit } = publishCommunityPost(
          {
            ...partial,
            authorName: partial.authorName ?? 'Field operator',
            authorRole: session.role,
            authorKind: partial.authorKind ?? 'official',
            verificationStatus: partial.verificationStatus ?? 'pending',
            attachments: partial.attachments ?? [],
          },
          session,
        )
        set((s) => ({
          communityPosts: [post, ...s.communityPosts],
          auditEntries: [audit, ...s.auditEntries],
        }))
      },

      getCampaign: (id) => get().campaigns.find((c) => c.id === id),

      getOrganization: (id) => get().organizations.find((o) => o.id === id),

      getPostsForCampaign: (campaignId) =>
        get().communityPosts.filter((p) => p.campaignId === campaignId),

      getAuditForEntity: (entityId) => get().auditEntries.filter((a) => a.entityId === entityId),

      mergeLedgerAuditHints: (entries) =>
        set((s) => {
          const ids = new Set(s.auditEntries.map((a) => a.id))
          const fresh = entries.filter((e) => !ids.has(e.id))
          return { auditEntries: [...fresh, ...s.auditEntries], platformDataMode: 'live' }
        }),

      setLedgerFetchError: (error) => set({ ledgerFetchError: error }),

      hydrateFromChain: (partial) =>
        set((s) => {
          let crises = s.crises
          let crisesChanged = false
          if (partial.crises?.length) {
            for (const incoming of partial.crises) {
              const idx = crises.findIndex(
                (c) =>
                  (incoming.onChainAppealId != null && c.onChainAppealId === incoming.onChainAppealId) ||
                  c.id === incoming.id,
              )
              if (idx >= 0) {
                crises = crises.map((c, i) => (i === idx ? { ...c, ...incoming } : c))
                crisesChanged = true
              } else {
                crises = [incoming, ...crises]
                crisesChanged = true
              }
            }
          }
          const campaigns = partial.campaigns?.length
            ? [...partial.campaigns, ...s.campaigns.filter((c) => !partial.campaigns!.some((n) => n.id === c.id))]
            : s.campaigns
          const disasterEvents = partial.disasterEvents?.length
            ? [
                ...partial.disasterEvents,
                ...s.disasterEvents.filter((e) => !partial.disasterEvents!.some((n) => n.id === e.id)),
              ]
            : s.disasterEvents
          if (
            !crisesChanged &&
            campaigns === s.campaigns &&
            disasterEvents === s.disasterEvents &&
            s.platformDataMode === 'live'
          ) {
            return s
          }
          return {
            platformDataMode: 'live',
            campaigns,
            disasterEvents,
            crises,
          }
        }),

      refreshAppealFromChain: async (crisisId, appealId) => {
        const { readAppealState } = await import('../services/communityDonation')
        const s = await readAppealState(appealId)
        set((state) => ({
          crises: state.crises.map((c) =>
            c.id === crisisId
              ? {
                  ...c,
                  raisedAmount: s.raised / 1_000_000,
                  requiredAmount: s.target / 1_000_000,
                  chainStatus: s.status === 0 ? 'pending' : s.status === 1 ? 'active' : 'closed',
                  lastUpdated: new Date().toISOString(),
                }
              : c,
          ),
          platformDataMode: 'live',
        }))
      },

      refreshCampaignFromChain: async (campaignId) => {
        const { readCampaignOnChain } = await import('../integrations/disasterVaultChain')
        const s = await readCampaignOnChain(campaignId)
        set((state) => ({
          campaigns: state.campaigns.map((c) =>
            c.tags?.includes(`campaign-id:${campaignId}`)
              ? {
                  ...c,
                  raisedAmount: s.raised / 1_000_000,
                  goalAmount: s.target / 1_000_000,
                  updatedAt: new Date().toISOString(),
                }
              : c,
          ),
          platformDataMode: 'live',
        }))
      },

      createCampaignOnChain: async (sender, signTransactions, params) => {
        const {
          createCampaignOnChain: chainCreate,
          isRealContractEnabled,
        } = await import('../integrations/disasterVaultChain')
        if (!isRealContractEnabled()) {
          throw new Error('Set VITE_USE_REAL_CONTRACT=true and VITE_DISASTER_APP_ID')
        }
        const { eventId, ...chainParams } = params
        const { txId, campaignId } = await chainCreate(sender, signTransactions, chainParams)
        if (eventId) get().linkEventOnChainCampaign(eventId, campaignId, txId)
        return { txId, campaignId }
      },

      donateToCampaignOnChain: async (sender, signTransactions, campaignId, amountMicroUsdc) => {
        const { donateToCampaignOnChain: chainDonate, isRealContractEnabled } = await import(
          '../integrations/disasterVaultChain'
        )
        if (!isRealContractEnabled()) throw new Error('Real contract not enabled')
        const txId = await chainDonate(sender, signTransactions, campaignId, amountMicroUsdc)
        set((s) => ({
          platformDataMode: 'live',
          auditEntries: [
            {
              id: `AUD-DON-CMP-${Date.now()}`,
              layer: 'ledger',
              action: 'campaign_donation',
              entityType: 'DisasterVault',
              entityId: String(campaignId),
              actorId: sender,
              actorRole: 'donor',
              timestamp: new Date().toISOString(),
              txnHash: txId,
              dataSource: 'live',
            },
            ...s.auditEntries,
          ],
        }))
        return txId
      },

      approveCampaignOnChain: async (approver, signTransactions, campaignId) => {
        const { approveCampaignOnChain: chainApprove, isRealContractEnabled } = await import(
          '../integrations/disasterVaultChain'
        )
        if (!isRealContractEnabled()) throw new Error('Real contract not enabled')
        const txId = await chainApprove(approver, signTransactions, campaignId)
        set((s) => ({
          platformDataMode: 'live',
          auditEntries: [
            {
              id: `AUD-APR-CMP-${Date.now()}`,
              layer: 'ledger',
              action: 'campaign_approval',
              entityType: 'DisasterVault',
              entityId: String(campaignId),
              actorId: approver,
              actorRole: 'district_officer',
              timestamp: new Date().toISOString(),
              txnHash: txId,
              dataSource: 'live',
            },
            ...s.auditEntries,
          ],
        }))
        return txId
      },

      disburseCampaignOnChain: async (
        sender,
        signTransactions,
        campaignId,
        beneficiaries,
        amountsMicroUsdc,
        batchOpts,
      ) => {
        const { disburseCampaignOnChain: chainDisburse, isRealContractEnabled } = await import(
          '../integrations/disasterVaultChain'
        )
        if (!isRealContractEnabled()) throw new Error('Real contract not enabled')
        const payouts = beneficiaries.map((address, i) => ({
          name: address.slice(0, 8),
          address,
          deliveryType: 'wallet' as const,
          identifier: address,
          amountMicroUsdc: amountsMicroUsdc[i],
        }))
        if (batchOpts?.eventId) {
          get().queueDisbursement({
            eventId: batchOpts.eventId,
            amount: payouts.reduce((s, p) => s + p.amountMicroUsdc, 0) / 1_000_000,
            beneficiaryCount: payouts.length,
            approverId: sender,
          })
        }
        const txId = await chainDisburse(sender, signTransactions, campaignId, beneficiaries, amountsMicroUsdc)
        const { signDisbursementManifest } = await import('../integrations/falcon')
        const falconSig = signDisbursementManifest(campaignId, beneficiaries, amountsMicroUsdc)
        const batchId = get().disbursementBatches[0]?.id
        if (batchId) get().confirmDisbursementFromChain(batchId, txId, payouts)
        set((s) => ({
          auditEntries: [
            {
              id: `AUD-FALCON-${Date.now()}`,
              layer: 'ledger',
              action: 'falcon_manifest_signed',
              entityType: 'DisasterVault',
              entityId: String(campaignId),
              actorId: sender,
              actorRole: 'district_officer',
              timestamp: new Date().toISOString(),
              txnHash: txId,
              dataSource: 'live',
              metadata: { manifestHash: falconSig.manifestHash, signature: falconSig.signature },
            },
            ...s.auditEntries,
          ],
        }))
        return txId
      },
    }),
    {
      name: 'algovault-platform-v1',
      version: 3,
      migrate: (persisted, version) => {
        let state = persisted as Partial<PlatformState> | undefined
        if (!state) return persisted

        if (version < 2) {
          state = {
            ...state,
            disasterEvents: (state.disasterEvents ?? []).filter((e) => e.dataSource !== 'live'),
          }
        }

        if (version < 3) {
          state = {
            ...state,
            disasterEvents: (state.disasterEvents ?? []).map((e) => {
              const confidence = Number(e.confidence)
              return Number.isFinite(confidence) ? e : { ...e, confidence: 67 }
            }),
          }
        }

        return state
      },
      partialize: (s) => ({
        crises: s.crises,
        donations: s.donations,
        votes: s.votes,
        disasterEvents: s.disasterEvents,
        verificationRecords: s.verificationRecords,
        approvalRecords: s.approvalRecords,
        disbursementBatches: s.disbursementBatches,
        campaigns: s.campaigns,
        communityPosts: s.communityPosts,
        session: s.session,
        campaignOpsMeta: s.campaignOpsMeta,
      }),
    },
  ),
)

export interface CommunityStoreSlice {
  crises: Crisis[]
  donations: DonationRecord[]
  votes: VoteMap
  getStats: () => CommunityStats
  getDonationsForCrisis: (id: string) => DonationRecord[]
  vote: PlatformState['vote']
  addCrisis: PlatformState['addCrisis']
  recordDonation: PlatformState['recordDonation']
  submitVerification: PlatformState['submitVerification']
}

function selectCommunitySlice(s: PlatformState): CommunityStoreSlice {
  return {
    crises: s.crises,
    donations: s.donations,
    votes: s.votes,
    getStats: s.getCommunityStats,
    getDonationsForCrisis: s.getDonationsForCrisis,
    vote: s.vote,
    addCrisis: s.addCrisis,
    recordDonation: s.recordDonation,
    submitVerification: s.submitVerification,
  }
}

/** Backward-compatible community store API */
export function useCommunityStore<T>(selector: (s: CommunityStoreSlice) => T): T {
  return usePlatformStore(
    useShallow((s) => selector(selectCommunitySlice(s))),
  )
}
