/** Institutional release — on-chain disbursement record */

export interface Disbursement {
  txnHash: string
  timestamp: string
  amount: number
  destination: string
  approverId: string
  eventId?: string
  crisisId?: string
  beneficiaryCount?: number
  status: 'pending' | 'released' | 'confirmed'
}

export interface DisasterEvent {
  id: string
  location: string
  type: 'Flood' | 'Cyclone' | 'Drought' | 'Fire'
  severity: 'Critical' | 'High' | 'Medium'
  confidence: number
  status: 'Pending Approval' | 'Approved' | 'Disbursed'
}

export interface ApprovalItem {
  id: string
  summary: string
  confidence: number
  sources: string[]
  satelliteEvidenceUrl?: string
}
