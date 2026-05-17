/** Community crisis verification — master data model */

export type CrisisCategory = 'medical' | 'housing' | 'disaster' | 'education' | 'other'

export type CrisisStatus = 'pending' | 'under_review' | 'verified' | 'rejected' | 'funded'

export interface CrisisVerifier {
  address: string
  name: string
  stake: number
  verifiedAt: string
  proof: string
}

export type ChainAppealStatus = 'none' | 'pending' | 'active' | 'closed'

export interface Crisis {
  id: string
  /** On-chain appeal id from CommunityDonationHub */
  onChainAppealId?: number
  chainStatus?: ChainAppealStatus
  title: string
  description: string
  category: CrisisCategory
  location: {
    city: string
    state: string
    coordinates?: [number, number]
  }
  /** Required USDC */
  requiredAmount: number
  /** Raised USDC */
  raisedAmount: number
  beneficiaryWallet: string
  images: string[]
  videos?: string[]
  documents?: string[]
  status: CrisisStatus
  /** Guardian AI score 0–100 */
  verificationScore: number
  upvotes: number
  downvotes: number
  verifiers: CrisisVerifier[]
  guardianAIScore?: number
  guardianAISources?: string[]
  vaultAddress?: string
  txnHash?: string
  submittedBy: string
  submittedAt: string
  lastUpdated: string
}

export interface CrisisDonation {
  crisisId: string
  donor: string
  amount: number
  txnHash: string
  timestamp: string
  message?: string
}
