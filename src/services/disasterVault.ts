/**
 * DisasterVault client facade — delegates to integrations/disasterVaultChain (USDC / ARC-56).
 */
import algosdk from 'algosdk'
export {
  createCampaignOnChain as createCampaign,
  donateToCampaignOnChain as donateToCampaign,
  approveCampaignOnChain as submitCampaignApproval,
  disburseCampaignOnChain as disburseCampaign,
  readCampaignOnChain as readCampaignState,
  readVaultAdmin,
  uniqueApprovers,
  getDisasterVaultConfig,
  getExplorerTransactionUrl,
  statusLabel,
} from '../integrations/disasterVaultChain'
import { getDisasterVaultConfig } from '../integrations/disasterVaultChain'
import { getLoraApplicationUrl } from './humanitarianExplorer'

export function getDisasterAppId(): number {
  const id = getDisasterVaultConfig().appId
  if (!id) throw new Error('VITE_DISASTER_APP_ID is not set')
  return id
}

export function getDisasterAppAddress(): string {
  return algosdk.getApplicationAddress(getDisasterAppId()).toString()
}

export function getDisasterExplorerAppUrl(): string {
  return getLoraApplicationUrl(getDisasterAppId())
}

/** App ID configured (UI may show chain actions). */
export function isDisasterVaultConfigured(): boolean {
  return getDisasterVaultConfig().appId > 0
}
