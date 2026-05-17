/**
 * AlgoVault / AlgoBharat ecosystem integration barrel.
 * Minimum 4 integrations for Round 3 — see docs/INTEGRATIONS.md for status matrix.
 */

export { fetchLiveDisasters } from './gora'
export type { LiveDisasterSignal } from './gora'

export { issueBeneficiaryCredential, verifyCredential } from './did'
export type { BeneficiaryCredentialMetadata, VerifiableCredentialStub } from './did'

export { signDisbursementManifest, verifyFalconSignature } from './falcon'
export type { FalconSignatureStub } from './falcon'

export {
  TINYMAN_STATUS,
  FOLKS_STATUS,
  WORMHOLE_STATUS,
  SABER_STATUS,
  XCHAIN_WALLET_STATUS,
  HAYSTACK_STATUS,
} from './ecosystemStubs'

/** Pera / use-wallet — implemented in src/services/algorand.ts */
export { getExplorerTransactionUrl, getExplorerApplicationUrl } from '../services/algorand'

/** DisasterVault on-chain client (ARC-56 / algosdk ATC) */
export {
  createCampaignOnChain,
  donateToCampaignOnChain,
  approveCampaignOnChain,
  disburseCampaignOnChain,
  expireCampaignOnChain,
  readCampaignOnChain,
  isRealContractEnabled,
  getDisasterVaultConfig,
} from './disasterVaultChain'
