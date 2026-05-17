import algosdk from 'algosdk'
import { config } from '../config.js'

let algodClient: algosdk.Algodv2 | null = null
let indexerClient: algosdk.Indexer | null = null

export function getAlgod(): algosdk.Algodv2 {
  if (!algodClient) {
    algodClient = new algosdk.Algodv2(config.algod.token, config.algod.server, config.algod.port)
  }
  return algodClient
}

export function getIndexer(): algosdk.Indexer {
  if (!indexerClient) {
    indexerClient = new algosdk.Indexer(
      config.algod.token,
      config.indexer.server,
      config.indexer.port,
    )
  }
  return indexerClient
}

export async function suggestedParams(fee = 2000): Promise<algosdk.SuggestedParams> {
  const sp = await getAlgod().getTransactionParams().do()
  return { ...sp, flatFee: true, fee }
}
