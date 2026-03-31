import { NetworkId } from '@txnlab/use-wallet-react'

export type AlgoVaultNetwork = 'testnet' | 'mainnet' | 'localnet'

export type NetworkConfig = {
  network: AlgoVaultNetwork
  walletNetworkId: NetworkId
  loraNetworkSegment: 'testnet' | 'mainnet' | 'localnet'
  algod: { server: string; port: number; token: string }
  indexer: { server: string; port: number }
}

function normalizeNetwork(n?: string): AlgoVaultNetwork {
  const v = String(n ?? '').toLowerCase()
  if (v === 'mainnet') return 'mainnet'
  if (v === 'localnet') return 'localnet'
  return 'testnet'
}

export function getNetworkConfig(): NetworkConfig {
  const network = normalizeNetwork(import.meta.env.VITE_NETWORK)

  const walletNetworkId =
    network === 'mainnet' ? NetworkId.MAINNET : network === 'localnet' ? NetworkId.LOCALNET : NetworkId.TESTNET

  const loraNetworkSegment = network === 'mainnet' ? 'mainnet' : network === 'localnet' ? 'localnet' : 'testnet'

  const algodServer = import.meta.env.VITE_ALGOD_SERVER
  const indexerServer = import.meta.env.VITE_INDEXER_SERVER
  if (!algodServer) throw new Error('Missing VITE_ALGOD_SERVER in .env.')
  if (!indexerServer) throw new Error('Missing VITE_INDEXER_SERVER in .env.')

  const algodPort = Number(import.meta.env.VITE_ALGOD_PORT || 443)
  const indexerPort = Number(import.meta.env.VITE_INDEXER_PORT || 443)

  return {
    network,
    walletNetworkId,
    loraNetworkSegment,
    algod: {
      server: algodServer,
      port: Number.isFinite(algodPort) ? algodPort : 443,
      token: import.meta.env.VITE_ALGOD_TOKEN || '',
    },
    indexer: {
      server: indexerServer,
      port: Number.isFinite(indexerPort) ? indexerPort : 443,
    },
  }
}

