/**
 * Opt a testnet account into the configured USDC ASA (0-amount self transfer).
 *
 * Usage:
 *   npx tsx scripts/optin_usdc.ts              # funder from AGENT_MNEMONIC / BOT_MNEMONIC
 *   npx tsx scripts/optin_usdc.ts <ADDRESS>    # informational only (cannot sign for others)
 */
import algosdk from 'algosdk'
import * as dotenv from 'dotenv'
import { loraTxUrl } from './bot/config.js'

dotenv.config()

const USDC = Number(process.env.VITE_STABLECOIN_ASSET_ID || 31566704)

function getAlgod(): algosdk.Algodv2 {
  return new algosdk.Algodv2(
    process.env.ALGOD_TOKEN || '',
    process.env.ALGOD_SERVER || process.env.VITE_ALGOD_SERVER || 'https://testnet-api.algonode.cloud',
    process.env.ALGOD_PORT || '443',
  )
}

async function optIn(account: algosdk.Account): Promise<string | null> {
  const algod = getAlgod()
  try {
    await algod.getAssetByID(USDC).do()
  } catch {
    throw new Error(`ASA ${USDC} not found on this network — set VITE_STABLECOIN_ASSET_ID to a valid testnet USDC.`)
  }
  const info = await algod.accountInformation(account.addr).do()
  const assets = (info.assets as { 'asset-id': number }[]) ?? []
  if (assets.some((a) => a['asset-id'] === USDC)) {
    console.log('Already opted in:', account.addr)
    return null
  }
  const sp = await algod.getTransactionParams().do()
  const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: account.addr,
    to: account.addr,
    assetIndex: USDC,
    amount: 0,
    suggestedParams: { ...sp, flatFee: true, fee: 1000 },
  })
  const { txId } = await algod.sendRawTransaction(txn.signTxn(account.sk)).do()
  await algosdk.waitForConfirmation(algod, txId, 4)
  return txId
}

async function main() {
  const argAddr = process.argv[2]
  if (argAddr) {
    console.log('Note: only the mnemonic account can opt itself in. Checking', argAddr)
  }
  const mnemonic = (process.env.BOT_MNEMONIC || process.env.AGENT_MNEMONIC || '').trim()
  if (!mnemonic) throw new Error('Set AGENT_MNEMONIC or BOT_MNEMONIC')
  const account = algosdk.mnemonicToSecretKey(mnemonic)
  console.log('USDC ASA:', USDC)
  console.log('Account:', account.addr)
  const txId = await optIn(account)
  if (txId) {
    console.log('Opt-in confirmed:', txId)
    console.log('Lora:', loraTxUrl(txId))
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
