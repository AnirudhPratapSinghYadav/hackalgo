/**
 * AlgoBharat ecosystem integrations — documented stubs (not required for disaster MVP).
 */

/** Tinyman — AMM swaps. Not needed: relief rail uses direct ASA donate/disburse, no swapping. */
export const TINYMAN_STATUS = 'not_needed' as const
// export async function quoteSwap(...) { /* Tinyman SDK */ }

/** Folks Finance — lending/borrowing. Not needed: no leverage on humanitarian vault. */
export const FOLKS_STATUS = 'not_needed' as const

/** Wormhole — cross-chain. Not needed: single-chain Algorand disbursement for Round 3 scope. */
export const WORMHOLE_STATUS = 'not_needed' as const

/** Saber — Solana-side AMM (legacy). Not needed on Algorand-only MVP. */
export const SABER_STATUS = 'not_needed' as const

/** X-Chain Wallet — multi-chain wallet. Not needed: Pera/use-wallet covers Algorand testnet. */
export const XCHAIN_WALLET_STATUS = 'not_needed' as const

/** Haystack — discovery/social. Optional Phase 2 for campaign discovery; not blocking disbursement. */
export const HAYSTACK_STATUS = 'stubbed' as const
// export function haystackCampaignUrl(campaignId: string) {
//   return `https://hay.app/campaign/${campaignId}` // placeholder
// }
