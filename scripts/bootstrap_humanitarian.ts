/**
 * Bootstrap DisasterVault + CommunityDonationHub (sets admin/treasury on-chain).
 *
 * Usage: npx tsx scripts/bootstrap_humanitarian.ts
 * Env: AGENT_MNEMONIC or BOT_MNEMONIC, VITE_ADMIN_ADDRESS, VITE_DISASTER_APP_ID, VITE_APPEALS_APP_ID
 *
 * After redeploy, update .env app IDs and run this once so Lora no longer shows admin: 0.
 */
import algosdk from 'algosdk'
import * as dotenv from 'dotenv'
import { explorerTxUrl } from './bot/config.js'

dotenv.config()

const DISASTER_APP = Number(process.env.VITE_DISASTER_APP_ID) || 0
const APPEALS_APP = Number(process.env.VITE_APPEALS_APP_ID) || 0
const ADMIN = (process.env.VITE_ADMIN_ADDRESS || '').trim()
const TREASURY = (process.env.VITE_TREASURY_ADDRESS || process.env.VITE_ADMIN_ADDRESS || '').trim()

function getAlgod(): algosdk.Algodv2 {
  return new algosdk.Algodv2(
    process.env.ALGOD_TOKEN || '',
    process.env.ALGOD_SERVER || process.env.VITE_ALGOD_SERVER || 'https://testnet-api.algonode.cloud',
    process.env.ALGOD_PORT || '443',
  )
}

async function callBootstrapDisaster(
  appId: number,
  signer: algosdk.Account,
  adminAddr: string,
  treasuryAddr: string,
): Promise<string> {
  const algod = getAlgod()
  const sp = await algod.getTransactionParams().do()
  const atc = new algosdk.AtomicTransactionComposer()
  const method = algosdk.ABIMethod.fromSignature('bootstrap(address,address)void')
  await atc.addMethodCall({
    appID: appId,
    sender: signer.addr,
    signer: algosdk.makeBasicAccountTransactionSigner(signer),
    method,
    methodArgs: [adminAddr, treasuryAddr],
    suggestedParams: { ...sp, flatFee: true, fee: 2000 },
  })
  const result = await atc.execute(algod, 4)
  const txIds = result.txIDs
  return txIds[txIds.length - 1] ?? txIds[0]
}

async function callBootstrapAppeals(appId: number, signer: algosdk.Account, adminAddr: string): Promise<string> {
  const algod = getAlgod()
  const sp = await algod.getTransactionParams().do()
  const atc = new algosdk.AtomicTransactionComposer()
  const method = algosdk.ABIMethod.fromSignature('bootstrap(address)void')
  await atc.addMethodCall({
    appID: appId,
    sender: signer.addr,
    signer: algosdk.makeBasicAccountTransactionSigner(signer),
    method,
    methodArgs: [adminAddr],
    suggestedParams: { ...sp, flatFee: true, fee: 2000 },
  })
  const result = await atc.execute(algod, 4)
  const txIds = result.txIDs
  return txIds[txIds.length - 1] ?? txIds[0]
}

async function main() {
  const mnemonic = (process.env.BOT_MNEMONIC || process.env.AGENT_MNEMONIC || '').trim()
  if (!mnemonic) throw new Error('Set AGENT_MNEMONIC or BOT_MNEMONIC')
  if (!ADMIN || !algosdk.isValidAddress(ADMIN)) throw new Error('Set VITE_ADMIN_ADDRESS')
  if (!TREASURY || !algosdk.isValidAddress(TREASURY)) throw new Error('Set VITE_TREASURY_ADDRESS or VITE_ADMIN_ADDRESS')
  if (!DISASTER_APP || !APPEALS_APP) throw new Error('Set VITE_DISASTER_APP_ID and VITE_APPEALS_APP_ID')

  const deployer = algosdk.mnemonicToSecretKey(mnemonic)
  console.log('Bootstrap admin:', ADMIN)
  console.log('Treasury:', TREASURY)

  const dTx = await callBootstrapDisaster(DISASTER_APP, deployer, ADMIN, TREASURY)
  console.log('DisasterVault bootstrap:', explorerTxUrl(dTx))

  const aTx = await callBootstrapAppeals(APPEALS_APP, deployer, ADMIN)
  console.log('Appeals hub bootstrap:', explorerTxUrl(aTx))

  console.log('Done — verify global state on Lora (admin should match VITE_ADMIN_ADDRESS).')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
