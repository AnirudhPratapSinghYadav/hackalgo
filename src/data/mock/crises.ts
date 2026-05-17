import type { Crisis, CrisisDonation } from '../../types/crisis'

const D = '/images/disaster'

export const mockCrises: Crisis[] = [
  {
    id: 'CRS-2025-001',
    title: 'House Fire Destroyed Family Home — Need Shelter',
    description:
      'Our home in Dharavi, Mumbai was destroyed by electrical fire on Jan 12. Lost everything. Family of 5 including 2 children under 6. Need funds for temporary shelter and basic necessities.',
    category: 'housing',
    location: { city: 'Mumbai', state: 'Maharashtra', coordinates: [19.0176, 72.8562] },
    requiredAmount: 25000,
    raisedAmount: 8400,
    beneficiaryWallet: 'FIRE...XY9Q',
    images: ['/images/relief-workers-flood.jpg', '/images/flood-family-india.jpg'],
    status: 'verified',
    verificationScore: 94,
    upvotes: 127,
    downvotes: 3,
    verifiers: [
      {
        address: 'NGO...K4L2',
        name: 'Goonj Mumbai Coordinator',
        stake: 500,
        verifiedAt: '2025-01-13T14:30:00Z',
        proof: 'QmXj7...photo1',
      },
      {
        address: 'VOL...M8N3',
        name: 'Local Fire Officer',
        stake: 300,
        verifiedAt: '2025-01-13T16:45:00Z',
        proof: 'QmYk8...photo2',
      },
    ],
    guardianAIScore: 87,
    guardianAISources: ['Mumbai Fire Department Report', 'Local News Coverage'],
    vaultAddress: 'VAULT...ABC1',
    submittedBy: 'USER...P7Q8',
    submittedAt: '2025-01-12T21:00:00Z',
    lastUpdated: '2025-01-13T16:45:00Z',
  },
  {
    id: 'CRS-2025-002',
    title: 'Urgent Medical: Child Needs Heart Surgery',
    description:
      '4-year-old daughter diagnosed with congenital heart defect. Surgery costs ₹4.5L ($5,400 USDC). Government hospital waitlist is 8 months. Private hospital can operate in 2 weeks if we can pay.',
    category: 'medical',
    location: { city: 'Kolkata', state: 'West Bengal', coordinates: [22.5726, 88.3639] },
    requiredAmount: 5400,
    raisedAmount: 2100,
    beneficiaryWallet: 'MED...ZW3R',
    images: [`${D}/woman-aid-form.jpg`],
    documents: ['/documents/hospital-estimate.pdf'],
    status: 'under_review',
    verificationScore: 78,
    upvotes: 89,
    downvotes: 12,
    verifiers: [
      {
        address: 'DOC...L5M2',
        name: 'Verified Doctor — Apollo Hospitals',
        stake: 1000,
        verifiedAt: '2025-01-14T10:20:00Z',
        proof: 'QmZn9...report',
      },
    ],
    guardianAIScore: 72,
    guardianAISources: ['Hospital record verification pending'],
    submittedBy: 'USER...R4T5',
    submittedAt: '2025-01-13T08:00:00Z',
    lastUpdated: '2025-01-14T10:20:00Z',
  },
  {
    id: 'CRS-2025-003',
    title: 'Flood Destroyed Crops — Farmer Lost Entire Harvest',
    description:
      'Flood in Assam submerged 3 acres of paddy field ready for harvest. Lost entire season income. Need seeds for next planting and food for family until then.',
    category: 'disaster',
    location: { city: 'Goalpara', state: 'Assam', coordinates: [26.1733, 90.6167] },
    requiredAmount: 1800,
    raisedAmount: 450,
    beneficiaryWallet: 'FARM...UV8W',
    images: [`${D}/hero-aerial-flood.jpg`, `${D}/river-overflow.jpg`],
    status: 'verified',
    verificationScore: 96,
    upvotes: 213,
    downvotes: 1,
    verifiers: [
      {
        address: 'NDMA...A2B3',
        name: 'NDMA Field Officer — Assam',
        stake: 800,
        verifiedAt: '2025-01-11T09:00:00Z',
        proof: 'QmAb3...geo1',
      },
      {
        address: 'NGO...C4D5',
        name: 'SEEDS India Coordinator',
        stake: 600,
        verifiedAt: '2025-01-11T11:30:00Z',
        proof: 'QmCd5...geo2',
      },
    ],
    guardianAIScore: 98,
    guardianAISources: [
      'Copernicus Satellite: Flood Zone Confirmed',
      'IMD Alert: Brahmaputra Overflow',
      'GDACS: Red Alert — Assam Floods',
    ],
    vaultAddress: 'VAULT...DEF2',
    submittedBy: 'USER...S6T7',
    submittedAt: '2025-01-10T15:00:00Z',
    lastUpdated: '2025-01-11T11:30:00Z',
  },
  {
    id: 'CRS-2025-004',
    title: 'Cyclone Damage — Roof Collapsed in Odisha Village',
    description:
      'Cyclone Remal damaged 40 homes in our village. Our roof collapsed. Need materials and labour to rebuild before monsoon.',
    category: 'disaster',
    location: { city: 'Puri', state: 'Odisha', coordinates: [19.8135, 85.8312] },
    requiredAmount: 3200,
    raisedAmount: 890,
    beneficiaryWallet: 'CYCL...P2R1',
    images: [`${D}/field-assessment.jpg`],
    status: 'pending',
    verificationScore: 45,
    upvotes: 34,
    downvotes: 8,
    verifiers: [],
    guardianAIScore: 61,
    guardianAISources: ['GDACS cyclone track — pending field proof'],
    submittedBy: 'USER...V9W2',
    submittedAt: '2025-01-15T06:00:00Z',
    lastUpdated: '2025-01-15T06:00:00Z',
  },
]

export const mockDonations: CrisisDonation[] = [
  {
    crisisId: 'CRS-2025-001',
    donor: 'DONOR...A1',
    amount: 250,
    txnHash: 'TXN...001',
    timestamp: '2025-01-13T18:00:00Z',
    message: 'Stay strong',
  },
  {
    crisisId: 'CRS-2025-003',
    donor: 'DONOR...B2',
    amount: 100,
    txnHash: 'TXN...002',
    timestamp: '2025-01-11T14:00:00Z',
  },
]

export function getCrisisById(id: string): Crisis | undefined {
  return mockCrises.find((c) => c.id === id)
}
