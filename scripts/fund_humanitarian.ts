/**
 * Fund humanitarian app accounts + opt into testnet USDC.
 *
 * Usage: npx tsx scripts/fund_humanitarian.ts
 * Env: AGENT_MNEMONIC or BOT_MNEMONIC, VITE_DISASTER_APP_ID, VITE_APPEALS_APP_ID, VITE_STABLECOIN_ASSET_ID
 */
import algosdk from 'algosdk'
import * as dotenv from 'dotenv'
import { explorerTxUrl } from './bot/config.js'

dotenv.config()

const USDC = Number(process.env.VITE_STABLECOIN_ASSET_ID || 31566704)
const DISASTER_APP = Number(process.env.VITE_DISASTER_APP_ID) || 0
const APPEALS_APP = Number(process.env.VITE_APPEALS_APP_ID) || 0
const ALGO_FUND_APP = 3_000_000
const USDC_FUND_APP = 100_000

function getAlgod(): algosdk.Algodv2 {
  return new algosdk.Algodv2(
    process.env.ALGOD_TOKEN || '',
    process.env.ALGOD_SERVER || process.env.VITE_ALGOD_SERVER || 'https://testnet-api.algonode.cloud',
    process.env.ALGOD_PORT || '443',
  )
}

async function fundAlgo(from: algosdk.Account, to: string, amount: number): Promise<string> {
  const algod = getAlgod()
  const sp = await algod.getTransactionParams().do()
  const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: from.addr,
    to,
    amount,
    suggestedParams: { ...sp, flatFee: true, fee: 1000 },
  })
  const { txId } = await algod.sendRawTransaction(txn.signTxn(from.sk)).do()
  await algosdk.waitForConfirmation(algod, txId, 4)
  return txId
}

async function optInAsset(account: algosdk.Account, assetId: number): Promise<string | null> {
  const algod = getAlgod()
  const info = await algod.accountInformation(account.addr).do()
  const assets = (info.assets as { 'asset-id': number }[]) ?? []
  if (assets.some((a) => a['asset-id'] === assetId)) return null
  const sp = await algod.getTransactionParams().do()
  const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: account.addr,
    to: account.addr,
    assetIndex: assetId,
    amount: 0,
    suggestedParams: { ...sp, flatFee: true, fee: 1000 },
  })
  const { txId } = await algod.sendRawTransaction(txn.signTxn(account.sk)).do()
  await algosdk.waitForConfirmation(algod, txId, 4)
  return txId
}

async function fundAppUsdc(from: algosdk.Account, appAddr: string, amount: number): Promise<string> {
  const algod = getAlgod()
  const sp = await algod.getTransactionParams().do()
  const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: from.addr,
    to: appAddr,
    assetIndex: USDC,
    amount,
    suggestedParams: { ...sp, flatFee: true, fee: 1000 },
  })
  const { txId } = await algod.sendRawTransaction(txn.signTxn(from.sk)).do()
  await algosdk.waitForConfirmation(algod, txId, 4)
  return txId
}

async function main() {
  const mnemonic = (process.env.BOT_MNEMONIC || process.env.AGENT_MNEMONIC || '').trim()
  if (!mnemonic) throw new Error('Set AGENT_MNEMONIC or BOT_MNEMONIC')
  if (!DISASTER_APP || !APPEALS_APP) throw new Error('Set VITE_DISASTER_APP_ID and VITE_APPEALS_APP_ID')

  const funder = algosdk.mnemonicToSecretKey(mnemonic)
  const disasterAddr = algosdk.getApplicationAddress(DISASTER_APP).toString()
  const appealsAddr = algosdk.getApplicationAddress(APPEALS_APP).toString()

  console.log('\n=== AlgoVault Humanitarian Funding ===\n')
  console.log('Funder:', funder.addr)
  console.log('USDC ASA:', USDC)

  let usdcOk = false
  try {
    await getAlgod().getAssetByID(USDC).do()
    usdcOk = true
  } catch {
    console.warn(`\nUSDC ASA ${USDC} not on this network — skipping USDC steps. Create/opt-in test USDC or update VITE_STABLECOIN_ASSET_ID.`)
  }

  if (usdcOk) {
    console.log('\n1) Opt-in funder to USDC…')
    const optFunder = await optInAsset(funder, USDC)
    if (optFunder) console.log('   ', explorerTxUrl(optFunder))
  }

  console.log('\n2) Fund Appeals app (ALGO for boxes)…')
  const appealsAlgoTx = await fundAlgo(funder, appealsAddr, ALGO_FUND_APP)
  console.log('   ', appealsAlgoTx, explorerTxUrl(appealsAlgoTx))
  console.log('   Lora:', `https://lora.algokit.io/testnet/application/${APPEALS_APP}`)

  console.log('\n3) Fund DisasterVault app (ALGO for boxes)…')
  const disasterAlgoTx = await fundAlgo(funder, disasterAddr, ALGO_FUND_APP)
  console.log('   ', disasterAlgoTx, explorerTxUrl(disasterAlgoTx))

  if (!usdcOk) {
    console.log('\n=== Lora verify (ALGO funded) ===')
    console.log('DisasterVault:', `https://lora.algokit.io/testnet/application/${DISASTER_APP}`)
    console.log('Appeals hub:  ', `https://lora.algokit.io/testnet/application/${APPEALS_APP}`)
    return
  }

  console.log('\n4) DisasterVault USDC opt-in')
  console.log('   The app opts into USDC automatically on the first create_campaign (inner asset transfer).')
  console.log('   Run: npm run optin:usdc  (funder wallet) before donating USDC.')

  console.log('\n5) Send micro-USDC to DisasterVault app (after app holds USDC)…')
  try {
    const usdcTx = await fundAppUsdc(funder, disasterAddr, USDC_FUND_APP)
    console.log('   ', usdcTx, explorerTxUrl(usdcTx))
  } catch (e) {
    console.warn('   USDC fund skipped:', e instanceof Error ? e.message : e)
  }

  console.log('\n=== Verify on Lora (JSON state + ABI) ===')
  console.log('DisasterVault:', `https://lora.algokit.io/testnet/application/${DISASTER_APP}`)
  console.log('Appeals hub:  ', `https://lora.algokit.io/testnet/application/${APPEALS_APP}`)
  console.log('\nRun: npx tsx scripts/verify_deployment.ts')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
