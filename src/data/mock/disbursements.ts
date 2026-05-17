import type { ApprovalItem, DisasterEvent, Disbursement } from '../../types/disbursement'

export const mockDisbursements: Disbursement[] = [
  {
    txnHash: 'TXN7K2M9N4P8Q1R3S5T6U8V0W2X4Y6Z8A1B3C5D7E9F0',
    timestamp: '2025-01-15T14:32:00Z',
    amount: 12500,
    destination: 'NDMA...K7YQ',
    approverId: 'OFFICER...A2B3',
    eventId: 'EVT-2025-001',
    beneficiaryCount: 50,
    status: 'confirmed',
  },
  {
    txnHash: 'TXN2H4J6L8N0P2R4T6V8X0Z2B4D6F8H0J2L4N6P8R0T2V4',
    timestamp: '2025-01-14T09:15:00Z',
    amount: 8200,
    destination: 'VAULT...DEF2',
    approverId: 'UNDP...C4D5',
    eventId: 'EVT-2025-003',
    beneficiaryCount: 32,
    status: 'confirmed',
  },
  {
    txnHash: 'TXN9A1C3E5G7I9K1M3O5Q7S9U1W3Y5A7C9E1G3I5K7M9O1Q3',
    timestamp: '2025-01-13T18:00:00Z',
    amount: 250,
    destination: 'FIRE...XY9Q',
    approverId: 'NGO...K4L2',
    crisisId: 'CRS-2025-001',
    status: 'released',
  },
  {
    txnHash: 'TXN4B6D8F0H2J4L6N8P0R2T4V6X8Z0B2D4F6H8J0L2N4P6',
    timestamp: '2025-01-12T11:20:00Z',
    amount: 4500,
    destination: 'FARM...UV8W',
    approverId: 'NDMA...A2B3',
    crisisId: 'CRS-2025-003',
    status: 'pending',
  },
]

export const mockEvents: DisasterEvent[] = [
  {
    id: 'EVT-2025-001',
    location: 'Assam, Goalpara District',
    type: 'Flood',
    severity: 'Critical',
    confidence: 94,
    status: 'Pending Approval',
  },
  {
    id: 'EVT-2025-002',
    location: 'Bihar, Darbhanga District',
    type: 'Flood',
    severity: 'Critical',
    confidence: 91,
    status: 'Pending Approval',
  },
  {
    id: 'EVT-2025-003',
    location: 'Kerala, Alappuzha',
    type: 'Flood',
    severity: 'High',
    confidence: 88,
    status: 'Approved',
  },
  {
    id: 'EVT-2025-004',
    location: 'Odisha, Puri District',
    type: 'Cyclone',
    severity: 'High',
    confidence: 86,
    status: 'Disbursed',
  },
]

export const mockApprovals: ApprovalItem[] = [
  {
    id: 'EVT-2025-001',
    summary: 'Flood — Assam, Goalpara District',
    confidence: 94,
    sources: ['Copernicus', 'IMD Alert', 'GDACS'],
    satelliteEvidenceUrl: '/images/disaster/hero-aerial-flood.jpg',
  },
  {
    id: 'EVT-2025-002',
    summary: 'Flood — Bihar, Darbhanga District',
    confidence: 91,
    sources: ['Copernicus', 'IMD Alert', 'GDELT'],
    satelliteEvidenceUrl: '/images/disaster/river-overflow.jpg',
  },
  {
    id: 'EVT-2025-003',
    summary: 'Flood — Kerala, Alappuzha',
    confidence: 88,
    sources: ['Copernicus', 'IMD', 'Field assessment'],
    satelliteEvidenceUrl: '/images/disaster/field-assessment.jpg',
  },
]

export function getDisbursementByHash(hash: string): Disbursement | undefined {
  return mockDisbursements.find((d) => d.txnHash === hash || d.txnHash.startsWith(hash))
}
