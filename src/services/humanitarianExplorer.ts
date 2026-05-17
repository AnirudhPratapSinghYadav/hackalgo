import algosdk from 'algosdk'
import { getNetworkConfig } from './networkConfig'

function loraBase(): string {
  const { loraNetworkSegment } = getNetworkConfig()
  return `https://lora.algokit.io/${loraNetworkSegment}`
}

export function getLoraApplicationUrl(appId: number): string {
  return `${loraBase()}/application/${appId}`
}

export function getLoraAccountUrl(address: string): string {
  return `${loraBase()}/account/${address}`
}

export function getLoraTransactionUrl(txId: string): string {
  return `${loraBase()}/transaction/${txId}`
}

export function getDisasterVaultLoraUrls(): {
  appId: number
  appUrl: string
  appAddress: string
  accountUrl: string
} | null {
  const appId = Number(import.meta.env.VITE_DISASTER_APP_ID) || 0
  if (!appId) return null
  const appAddress = algosdk.getApplicationAddress(appId).toString()
  return {
    appId,
    appUrl: getLoraApplicationUrl(appId),
    appAddress,
    accountUrl: getLoraAccountUrl(appAddress),
  }
}

export function getAppealsHubLoraUrls(): {
  appId: number
  appUrl: string
  appAddress: string
  accountUrl: string
} | null {
  const appId = Number(import.meta.env.VITE_APPEALS_APP_ID) || 0
  if (!appId) return null
  const appAddress = algosdk.getApplicationAddress(appId).toString()
  return {
    appId,
    appUrl: getLoraApplicationUrl(appId),
    appAddress,
    accountUrl: getLoraAccountUrl(appAddress),
  }
}
