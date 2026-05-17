import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as dotenv from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const BOT_DATA_DIR = path.resolve(__dirname, 'data')
export const BOT_ROOT = path.resolve(__dirname, '../..')

dotenv.config({ path: path.join(BOT_ROOT, '.env') })

export const config = {
  demoStrict: process.env.VITE_DEMO_STRICT === 'true',
  network: process.env.VITE_NETWORK || process.env.NETWORK || 'testnet',
  publicAppUrl: (process.env.PUBLIC_APP_URL || 'http://localhost:5173').replace(/\/$/, ''),
  algod: {
    server: process.env.ALGOD_SERVER || process.env.VITE_ALGOD_SERVER || 'https://testnet-api.algonode.cloud',
    port: process.env.ALGOD_PORT || process.env.VITE_ALGOD_PORT || '443',
    token: process.env.ALGOD_TOKEN || process.env.VITE_ALGOD_TOKEN || '',
  },
  indexer: {
    server: process.env.INDEXER_SERVER || process.env.VITE_INDEXER_SERVER || 'https://testnet-idx.algonode.cloud',
    port: process.env.INDEXER_PORT || process.env.VITE_INDEXER_PORT || '443',
  },
  disasterAppId: Number(process.env.VITE_DISASTER_APP_ID) || 0,
  appealsAppId: Number(process.env.VITE_APPEALS_APP_ID) || 0,
  stablecoinAssetId: Number(process.env.VITE_STABLECOIN_ASSET_ID || 31566704),
  adminAddress: process.env.VITE_ADMIN_ADDRESS || '',
  botMnemonic: (process.env.BOT_MNEMONIC || process.env.AGENT_MNEMONIC || '').trim(),
  telegramToken: process.env.TELEGRAM_BOT_TOKEN || '',
  telegramChatId: process.env.TELEGRAM_CHAT_ID || '',
  port: Number(process.env.BOT_PORT || 3002),
  gdacsPollMs: 15 * 60 * 1000,
  indexerPollMs: 2 * 60 * 1000,
  savingsVaultAppId: Number(process.env.VITE_APP_ID || process.env.APP_ID) || 0,
}

export function requireDisasterApp(): number {
  if (!config.disasterAppId) {
    throw new Error('VITE_DISASTER_APP_ID is not configured. Deploy DisasterVault first.')
  }
  return config.disasterAppId
}

export function requireAppealsApp(): number {
  if (!config.appealsAppId) {
    throw new Error('VITE_APPEALS_APP_ID is not configured. Deploy CommunityDonationHub first.')
  }
  return config.appealsAppId
}

export function explorerTxUrl(txId: string): string {
  return loraTxUrl(txId)
}

export function explorerAppUrl(appId: number): string {
  const seg = config.network === 'mainnet' ? 'mainnet' : config.network === 'localnet' ? 'localnet' : 'testnet'
  return `https://lora.algokit.io/${seg}/application/${appId}`
}

export function loraAccountUrl(address: string): string {
  const seg = config.network === 'mainnet' ? 'mainnet' : config.network === 'localnet' ? 'localnet' : 'testnet'
  return `https://lora.algokit.io/${seg}/account/${address}`
}

export function loraTxUrl(txId: string): string {
  const seg = config.network === 'mainnet' ? 'mainnet' : config.network === 'localnet' ? 'localnet' : 'testnet'
  return `https://lora.algokit.io/${seg}/transaction/${txId}`
}

export function peraTxnDeeplink(unsignedTxn: Uint8Array): string {
  const b64 = Buffer.from(unsignedTxn).toString('base64')
  return `https://perawallet.app/txn?txn=${encodeURIComponent(b64)}`
}
