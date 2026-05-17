/**
 * Deploy DisasterVault to Algorand testnet, bootstrap, fund USDC, demo create_campaign.
 *
 * Usage:
 *   DEPLOYER_MNEMONIC="25 words ..." npx tsx scripts/deploy_disaster_vault.ts
 *
 * Env: ALGOD_SERVER, ALGOD_TOKEN, ALGOD_PORT, TREASURY_ADDRESS (optional),
 *      DISASTER_APPROVER_1..3, BENEFICIARY_1..3, VITE_STABLECOIN_ASSET_ID (default 31566704 testnet USDC)
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import algosdk from 'algosdk'
import * as dotenv from 'dotenv'

dotenv.config()

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ARTIFACT_DIR = path.resolve(
  __dirname,
  '../savings_vault/projects/disaster_vault/smart_contracts/artifacts/disaster_vault',
)
const ARC56_PATH = path.join(ARTIFACT_DIR, 'DisasterVault.arc56.json')
const APPROVAL_TEAL = path.join(ARTIFACT_DIR, 'DisasterVault.approval.teal')
const CLEAR_TEAL = path.join(ARTIFACT_DIR, 'DisasterVault.clear.teal')

const USDC_TESTNET = Number(process.env.VITE_STABLECOIN_ASSET_ID || 31566704)
const ALGOD_SERVER = process.env.ALGOD_SERVER || process.env.VITE_ALGOD_SERVER || 'https://testnet-api.algonode.cloud'
const ALGOD_TOKEN = process.env.ALGOD_TOKEN || process.env.VITE_ALGOD_TOKEN || ''
const ALGOD_PORT = process.env.ALGOD_PORT || process.env.VITE_ALGOD_PORT || '443'

function getAlgod(): algosdk.Algodv2 {
  return new algosdk.Algodv2(ALGOD_TOKEN, ALGOD_SERVER, ALGOD_PORT)
}

/** Algorand: max program = 2048 + extraPages * 4096 bytes */
async function compileTeal(algod: algosdk.Algodv2, source: string): Promise<Uint8Array> {
  const res = await algod.compile(new TextEncoder().encode(source)).do()
  return new Uint8Array(Buffer.from(res.result, 'base64'))
}

function programExtraPages(programLen: number): number {
  if (programLen <= 2048) return 0
  const needed = Math.ceil((programLen - 2048) / 4096)
  if (needed > 3) {
    throw new Error(
      `Approval program ${programLen} bytes exceeds Algorand limit (2048+3*4096). Recompile with optimizations or shrink contract.`,
    )
  }
  return needed
}

function loadArc56(): { methods: Array<{ name: string; args: { type: string; name: string }[]; returns: { type: string } }> } {
  return JSON.parse(fs.readFileSync(ARC56_PATH, 'utf8'))
}

function methodByName(
  spec: ReturnType<typeof loadArc56>,
  name: string,
): algosdk.ABIMethod {
  const m = spec.methods.find((x) => x.name === name)
  if (!m) throw new Error(`Method ${name} missing`)
  return new algosdk.ABIMethod({
    name: m.name,
    args: m.args.map((a) => ({ type: a.type, name: a.name })),
    returns: m.returns,
  })
}

async function main() {
  const mnemonic = (process.env.DEPLOYER_MNEMONIC || process.env.AGENT_MNEMONIC || '').trim()
  if (!mnemonic) throw new Error('Set DEPLOYER_MNEMONIC in .env')

  const account = algosdk.mnemonicToSecretKey(mnemonic)
  const sender = account.addr.toString()
  const algod = getAlgod()
  const spec = loadArc56()

  const approval = await compileTeal(algod, fs.readFileSync(APPROVAL_TEAL, 'utf8'))
  const clear = await compileTeal(algod, fs.readFileSync(CLEAR_TEAL, 'utf8'))
  const extraPages = programExtraPages(approval.length)
  const sp = await algod.getTransactionParams().do()

  const createTxn = algosdk.makeApplicationCreateTxnFromObject({
    from: sender,
    suggestedParams: { ...sp, flatFee: true, fee: 100_000 + extraPages * 10_000 },
    onComplete: algosdk.OnApplicationComplete.NoOpOC,
    approvalProgram: approval,
    clearProgram: clear,
    numLocalInts: 0,
    numLocalByteSlices: 0,
    numGlobalInts: 2,
    numGlobalByteSlices: 2,
    extraPages,
  })
  const signedCreate = createTxn.signTxn(account.sk)
  const { txId: createTxId } = await algod.sendRawTransaction(signedCreate).do()
  const createResult = await algosdk.waitForConfirmation(algod, createTxId, 8)
  const appId = createResult['application-index']
  if (!appId) throw new Error('No app id from create')
  const appAddr = algosdk.getApplicationAddress(appId).toString()

  console.log('\n=== DisasterVault deployed ===')
  console.log('APP_ID=', appId)
  console.log('APP_ADDRESS=', appAddr)
  console.log('ASSET_ID=', USDC_TESTNET)
  console.log('Create tx:', explorerTx(createTxId))

  const treasury = process.env.TREASURY_ADDRESS || sender
  const spBoot = await algod.getTransactionParams().do()
  const atcBootstrap = new algosdk.AtomicTransactionComposer()
  await atcBootstrap.addMethodCall({
    appID: appId,
    sender,
    signer: makeBasicSigner(account.sk),
    method: methodByName(spec, 'bootstrap'),
    methodArgs: [sender, treasury],
    suggestedParams: { ...spBoot, flatFee: true, fee: 2000 },
  })
  const boot = await atcBootstrap.execute(algod, 4)
  console.log('bootstrap tx:', explorerTx(boot.txIDs[0]))

  const fundAlgo = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: sender,
    to: appAddr,
    amount: 2_000_000,
    suggestedParams: { ...(await algod.getTransactionParams().do()), flatFee: true, fee: 1000 },
  })
  const fundAlgoId = (await algod.sendRawTransaction(fundAlgo.signTxn(account.sk)).do()).txId
  await algosdk.waitForConfirmation(algod, fundAlgoId, 4)
  console.log('Funded app with 2 ALGO for box MBR:', explorerTx(fundAlgoId))

  const approvers = [
    process.env.DISASTER_APPROVER_1 || sender,
    process.env.DISASTER_APPROVER_2 || sender,
    process.env.DISASTER_APPROVER_3 || sender,
  ]
  const expiry = Number(sp.firstRound) + 1_000_000
  const gs = await algod.getApplicationByID(appId).do()
  const countKey = Buffer.from('campaign_count').toString('base64')
  const countEntry = (gs.params['global-state'] as { key: string; value: { uint: number } }[])?.find(
    (e) => e.key === countKey,
  )
  const nextCampaign = (countEntry?.value?.uint ?? 0) + 1
  const boxName = new Uint8Array(8)
  new DataView(boxName.buffer).setBigUint64(0, BigInt(nextCampaign))

  const spCreate = await algod.getTransactionParams().do()
  const atcCreate = new algosdk.AtomicTransactionComposer()
  await atcCreate.addMethodCall({
    appID: appId,
    sender,
    signer: makeBasicSigner(account.sk),
    method: methodByName(spec, 'create_campaign'),
    methodArgs: [
      'AlgoBharat Flood Relief 2025',
      BigInt(1_000_000_000),
      'Bihar, India',
      approvers,
      BigInt(2),
      BigInt(expiry),
      BigInt(USDC_TESTNET),
    ],
    boxes: [{ appIndex: appId, name: boxName }],
    suggestedParams: { ...spCreate, flatFee: true, fee: 8000 },
  })
  try {
    const created = await atcCreate.execute(algod, 4)
    const campaignId = decodeUint64Return(created.methodResults[0]?.returnValue)
    console.log('create_campaign tx:', explorerTx(created.txIDs[0]))
    console.log('campaign_id=', campaignId)
  } catch (e) {
    console.warn('create_campaign demo skipped:', e instanceof Error ? e.message : e)
  }

  const fundAmount = 500_000
  try {
    const fundTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      from: sender,
      to: appAddr,
      assetIndex: USDC_TESTNET,
      amount: fundAmount,
      suggestedParams: { ...sp, flatFee: true, fee: 1000 },
    })
    const signedFund = fundTxn.signTxn(account.sk)
    const { txId: fundTxId } = await algod.sendRawTransaction(signedFund).do()
    await algosdk.waitForConfirmation(algod, fundTxId, 4)
    console.log(`Funded app with ${fundAmount} micro-USDC:`, explorerTx(fundTxId))
  } catch (e) {
    console.warn('USDC fund skipped (opt-in to ASA on deployer?):', e instanceof Error ? e.message : e)
  }

  const beneficiaries = [
    process.env.BENEFICIARY_1 || sender,
    process.env.BENEFICIARY_2 || sender,
    process.env.BENEFICIARY_3 || sender,
  ]
  console.log('\nDemo beneficiaries (for disburse test):', beneficiaries.join(', '))
  console.log('\nAdd to .env:')
  console.log(`VITE_DISASTER_APP_ID=${appId}`)
  console.log(`VITE_USE_REAL_CONTRACT=true`)
  console.log(`VITE_ADMIN_ADDRESS=${sender}`)
  console.log(`VITE_STABLECOIN_ASSET_ID=${USDC_TESTNET}`)
  approvers.forEach((a, i) => console.log(`VITE_DISASTER_APPROVER_${i}=${a}`))
  console.log('\nApp explorer:', `https://testnet.explorer.perawallet.app/application/${appId}`)
}

function makeBasicSigner(sk: Uint8Array): algosdk.TransactionSigner {
  return async (txnGroup, indexesToSign) => indexesToSign.map((i) => txnGroup[i].signTxn(sk))
}

function decodeUint64Return(raw: unknown): number {
  if (raw instanceof Uint8Array) return Number(algosdk.ABIType.from('uint64').decode(raw))
  return 0
}

function explorerTx(id: string): string {
  return `https://testnet.explorer.perawallet.app/tx/${id}`
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
