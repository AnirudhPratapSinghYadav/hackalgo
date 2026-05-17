import type {
  ApprovalRecord,
  AuditEntry,
  CommunityPost,
  DisasterEvent,
  DisbursementBatch,
  PlatformRole,
  SessionContext,
  VerificationRecord,
} from '../../domain/platform'
import type { Disbursement } from '../../types/disbursement'

export function createAuditEntry(
  partial: Omit<AuditEntry, 'id' | 'timestamp' | 'dataSource'> & { dataSource?: AuditEntry['dataSource'] },
): AuditEntry {
  return {
    id: `AUD-${Date.now().toString(36).toUpperCase()}`,
    timestamp: new Date().toISOString(),
    dataSource: partial.dataSource ?? 'demo',
    ...partial,
  }
}

export function transitionEventToVerification(event: DisasterEvent): {
  event: DisasterEvent
  verification: VerificationRecord
  audit: AuditEntry
} {
  const verification: VerificationRecord = {
    id: `VRF-${event.id}-${Date.now()}`,
    eventId: event.id,
    status: 'pending',
    confidence: event.confidence,
    sources: event.sourceLabels,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    dataSource: 'demo',
  }
  const updatedEvent: DisasterEvent = {
    ...event,
    opsStatus: 'verification_pending',
  }
  const audit = createAuditEntry({
    layer: 'operations',
    action: 'verification_created',
    entityType: 'VerificationRecord',
    entityId: verification.id,
    actorId: 'SYSTEM',
    actorRole: 'admin',
    metadata: { eventId: event.id },
  })
  return { event: updatedEvent, verification, audit }
}

export function recordApproval(
  event: DisasterEvent,
  approverId: string,
  approverRole: PlatformRole,
  decision: ApprovalRecord['decision'],
  notes?: string,
): { event: DisasterEvent; approval: ApprovalRecord; audit: AuditEntry } {
  const approval: ApprovalRecord = {
    id: `APR-${event.id}-${Date.now()}`,
    eventId: event.id,
    approverRole,
    approverId,
    decision,
    notes,
    timestamp: new Date().toISOString(),
    dataSource: 'demo',
  }
  const legacyStatus = decision === 'approved' ? 'Approved' : event.status
  const updatedEvent: DisasterEvent = {
    ...event,
    opsStatus: decision === 'approved' ? 'approved' : event.opsStatus,
    status: legacyStatus as DisasterEvent['status'],
  }
  const audit = createAuditEntry({
    layer: 'operations',
    action: 'approval_recorded',
    entityType: 'ApprovalRecord',
    entityId: approval.id,
    actorId: approverId,
    actorRole: approverRole,
    metadata: { decision },
  })
  return { event: updatedEvent, approval, audit }
}

export function prepareDisbursementBatch(
  input: Omit<DisbursementBatch, 'id' | 'preparedAt' | 'status' | 'dataSource'>,
): { batch: DisbursementBatch; audit: AuditEntry } {
  const batch: DisbursementBatch = {
    ...input,
    id: `BATCH-${Date.now().toString(36).toUpperCase()}`,
    preparedAt: new Date().toISOString(),
    status: 'queued',
    dataSource: 'demo',
  }
  const audit = createAuditEntry({
    layer: 'operations',
    action: 'disbursement_prepared',
    entityType: 'DisbursementBatch',
    entityId: batch.id,
    actorId: input.approverId,
    actorRole: 'district_officer',
    metadata: { amount: String(input.amount) },
  })
  return { batch, audit }
}

export function executeDisbursement(
  batch: DisbursementBatch,
  txnHash: string,
): { batch: DisbursementBatch; disbursement: Disbursement; audit: AuditEntry } {
  const executed: DisbursementBatch = {
    ...batch,
    status: 'confirmed',
    txnHash,
    executedAt: new Date().toISOString(),
  }
  const disbursement: Disbursement = {
    txnHash,
    timestamp: executed.executedAt!,
    amount: batch.amount,
    destination: 'RECIPIENT...POOL',
    approverId: batch.approverId,
    eventId: batch.eventId,
    crisisId: batch.crisisId,
    beneficiaryCount: batch.beneficiaryCount,
    status: 'confirmed',
  }
  const audit = createAuditEntry({
    layer: 'ledger',
    action: 'disbursement_confirmed',
    entityType: 'DisbursementBatch',
    entityId: batch.id,
    actorId: batch.approverId,
    actorRole: 'district_officer',
    txnHash,
  })
  return { batch: executed, disbursement, audit }
}

export function publishCommunityPost(
  post: Omit<CommunityPost, 'id' | 'timestamp' | 'dataSource'>,
  session: SessionContext,
): { post: CommunityPost; audit: AuditEntry } {
  const full: CommunityPost = {
    ...post,
    id: `POST-${Date.now().toString(36).toUpperCase()}`,
    timestamp: new Date().toISOString(),
    dataSource: session.mode === 'demo' ? 'demo' : 'verified',
  }
  const audit = createAuditEntry({
    layer: 'community',
    action: 'post_published',
    entityType: 'CommunityPost',
    entityId: full.id,
    actorId: session.walletAddress ?? session.organizationId ?? 'anonymous',
    actorRole: session.role,
  })
  return { post: full, audit }
}

export function roleCapabilities(role: PlatformRole): string[] {
  const base = ['view_public']
  switch (role) {
    case 'admin':
      return [...base, 'ops_all', 'approve', 'disburse', 'audit', 'publish_official']
    case 'ngo_coordinator':
      return [...base, 'ops_events', 'publish_official', 'manage_campaigns', 'verify_field']
    case 'district_officer':
      return [...base, 'ops_events', 'approve', 'disburse', 'publish_official']
    case 'verifier':
      return [...base, 'verify_crisis', 'publish_field']
    case 'auditor':
      return [...base, 'audit_read', 'ops_read']
    case 'donor':
      return [...base, 'donate', 'comment']
    case 'beneficiary_operator':
      return [...base, 'beneficiary_ops']
    default:
      return base
  }
}

export function resolveRole(session: SessionContext, isDemo: boolean): PlatformRole {
  if (isDemo) return 'ngo_coordinator'
  if (session.role !== 'public_viewer') return session.role
  if (session.walletAddress) return 'district_officer'
  return 'public_viewer'
}
