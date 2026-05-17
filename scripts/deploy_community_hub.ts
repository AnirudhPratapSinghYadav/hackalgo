/**
 * Deploy CommunityDonationHub to testnet and bootstrap admin.
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
  '../savings_vault/projects/community_donation_hub/smart_contracts/artifacts/community_donation_hub',
)

const ALGOD_SERVER = process.env.ALGOD_SERVER || process.env.VITE_ALGOD_SERVER || 'https://testnet-api.algonode.cloud'
const ALGOD_TOKEN = process.env.ALGOD_TOKEN || process.env.VITE_ALGOD_TOKEN || ''
const ALGOD_PORT = process.env.ALGOD_PORT || process.env.VITE_ALGOD_PORT || '443'

async function compileTeal(algod: algosdk.Algodv2, source: string): Promise<Uint8Array> {
  const res = await algod.compile(new TextEncoder().encode(source)).do()
  return new Uint8Array(Buffer.from(res.result, 'base64'))
}

function programExtraPages(programLen: number): number {
  if (programLen <= 2048) return 0
  return Math.min(3, Math.ceil((programLen - 2048) / 4096))
}

async function main() {
  const mnemonic = (process.env.DEPLOYER_MNEMONIC || process.env.AGENT_MNEMONIC || '').trim()
  if (!mnemonic) throw new Error('Set DEPLOYER_MNEMONIC or AGENT_MNEMONIC')

  const account = algosdk.mnemonicToSecretKey(mnemonic)
  const sender = account.addr.toString()
  const algod = new algosdk.Algodv2(ALGOD_TOKEN, ALGOD_SERVER, ALGOD_PORT)
  const spec = JSON.parse(fs.readFileSync(path.join(ARTIFACT_DIR, 'CommunityDonationHub.arc56.json'), 'utf8'))

  const approval = await compileTeal(algod, fs.readFileSync(path.join(ARTIFACT_DIR, 'CommunityDonationHub.approval.teal'), 'utf8'))
  const clear = await compileTeal(algod, fs.readFileSync(path.join(ARTIFACT_DIR, 'CommunityDonationHub.clear.teal'), 'utf8'))
  const extraPages = programExtraPages(approval.length)
  const sp = await algod.getTransactionParams().do()

  const createTxn = algosdk.makeApplicationCreateTxnFromObject({
    from: sender,
    suggestedParams: { ...sp, flatFee: true, fee: 100_000 + extraPages * 10_000 },
    onComplete: algosdk.OnApplicationComplete.NoOpOC,
    approvalProgram: approval,
    clearProgram: clear,
    numGlobalInts: 2,
    numGlobalByteSlices: 1,
    extraPages,
  })
  const { txId: createTxId } = await algod.sendRawTransaction(createTxn.signTxn(account.sk)).do()
  const createResult = await algosdk.waitForConfirmation(algod, createTxId, 8)
  const appId = createResult['application-index']
  if (!appId) throw new Error('No app id')

  const method = (name: string) => {
    const m = spec.methods.find((x: { name: string }) => x.name === name)
    return new algosdk.ABIMethod({
      name: m.name,
      args: m.args.map((a: { type: string; name: string }) => ({ type: a.type, name: a.name })),
      returns: m.returns,
    })
  }

  const sp2 = await algod.getTransactionParams().do()
  const atc = new algosdk.AtomicTransactionComposer()
  await atc.addMethodCall({
    appID: appId,
    sender,
    signer: makeBasicSigner(account.sk),
    method: method('bootstrap'),
    methodArgs: [sender],
    suggestedParams: { ...sp2, flatFee: true, fee: 2000 },
  })
  const boot = await atc.execute(algod, 4)

  console.log('\n=== CommunityDonationHub deployed ===')
  console.log('VITE_APPEALS_APP_ID=', appId)
  console.log('VITE_ADMIN_ADDRESS=', sender)
  console.log('bootstrap:', boot.txIDs[0])
  console.log('https://testnet.explorer.perawallet.app/application/' + appId)
}

function makeBasicSigner(sk: Uint8Array): algosdk.TransactionSigner {
  return async (txnGroup, indexesToSign) => indexesToSign.map((i) => txnGroup[i].signTxn(sk))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
