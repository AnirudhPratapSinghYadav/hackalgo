import algosdk from 'algosdk'
import type { SignTransactionsFn } from './algorand'
import { getExplorerTransactionUrl } from './algorand'
import { getNetworkConfig } from './networkConfig'
import { executeAtcAndConfirm, makeSigner } from './txPipeline'
import appealsSpec from '../contracts/CommunityDonationHub.arc56.json'

const APP_ID = Number(import.meta.env.VITE_APPEALS_APP_ID) || 0
const ADMIN_ADDRESS = String(import.meta.env.VITE_ADMIN_ADDRESS || '')

type Arc56Method = { name: string; args: { type: string; name: string }[]; returns: { type: string } }

const METHODS = appealsSpec.methods as Arc56Method[]

function methodByName(name: string): algosdk.ABIMethod {
  const m = METHODS.find((x) => x.name === name)
  if (!m) throw new Error(`Method ${name} not in CommunityDonationHub spec`)
  return new algosdk.ABIMethod({
    name: m.name,
    args: m.args.map((a) => ({ type: a.type, name: a.name })),
    returns: m.returns,
  })
}

export function isAppealsHubConfigured(): boolean {
  return Number.isFinite(APP_ID) && APP_ID > 0
}

export function getAppealsAppId(): number {
  if (!isAppealsHubConfigured()) throw new Error('VITE_APPEALS_APP_ID is not set')
  return APP_ID
}

export function getAppealsAppAddress(): string {
  return algosdk.getApplicationAddress(getAppealsAppId()).toString()
}

export function getAdminAddress(): string {
  return ADMIN_ADDRESS
}

function getAlgod(): algosdk.Algodv2 {
  const { algod } = getNetworkConfig()
  return new algosdk.Algodv2(algod.token, algod.server, algod.port)
}

async function suggestedParams(): Promise<algosdk.SuggestedParams> {
  const sp = await getAlgod().getTransactionParams().do()
  return { ...sp, flatFee: true, fee: 2000 }
}

async function executeAtc(atc: algosdk.AtomicTransactionComposer): Promise<{
  txId: string
  methodResults: algosdk.ABIResult[]
}> {
  const { txId, methodResults } = await executeAtcAndConfirm(atc)
  return { txId, methodResults }
}

function appealBoxName(appealId: number): Uint8Array {
  const name = new Uint8Array(8)
  new DataView(name.buffer).setBigUint64(0, BigInt(appealId))
  return name
}

function appealBoxRef(appealId: number): algosdk.BoxReference {
  return { appIndex: getAppealsAppId(), name: appealBoxName(appealId) }
}

async function readAppealCount(): Promise<number> {
  const info = await getAlgod().getApplicationByID(getAppealsAppId()).do()
  const gs = info.params['global-state'] as { key: string; value: { uint: number } }[] | undefined
  const key = Buffer.from('appeal_count').toString('base64')
  return gs?.find((e) => e.key === key)?.value?.uint ?? 0
}

export async function createAppealOnChain(
  sender: string,
  signTransactions: SignTransactionsFn,
  input: { targetMicroAlgo: number; beneficiary: string; metadataUri: string },
): Promise<{ txId: string; appealId: number }> {
  const sp = await suggestedParams()
  const nextId = (await readAppealCount()) + 1
  const atc = new algosdk.AtomicTransactionComposer()
  await atc.addMethodCall({
    appID: getAppealsAppId(),
    sender,
    signer: makeSigner(signTransactions),
    method: methodByName('create_appeal'),
    methodArgs: [BigInt(input.targetMicroAlgo), input.beneficiary, input.metadataUri],
    boxes: [appealBoxRef(nextId)],
    suggestedParams: sp,
  })
  const { txId, methodResults } = await executeAtc(atc)
  const ret = methodResults[0]?.returnValue
  const appealId = ret instanceof Uint8Array ? Number(algosdk.ABIType.from('uint64').decode(ret)) : 0
  return { txId, appealId }
}

export async function adminApproveAppeal(
  adminSender: string,
  signTransactions: SignTransactionsFn,
  appealId: number,
): Promise<string> {
  const sp = await suggestedParams()
  const atc = new algosdk.AtomicTransactionComposer()
  await atc.addMethodCall({
    appID: getAppealsAppId(),
    sender: adminSender,
    signer: makeSigner(signTransactions),
    method: methodByName('admin_approve'),
    methodArgs: [BigInt(appealId)],
    boxes: [appealBoxRef(appealId)],
    suggestedParams: sp,
  })
  const { txId } = await executeAtc(atc)
  return txId
}

export async function donateToAppeal(
  sender: string,
  signTransactions: SignTransactionsFn,
  appealId: number,
  amountMicroAlgo: number,
): Promise<string> {
  const sp = await suggestedParams()
  const appAddr = getAppealsAppAddress()
  const payTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: sender,
    to: appAddr,
    amount: amountMicroAlgo,
    suggestedParams: { ...sp, fee: 1000 },
  })
  const atc = new algosdk.AtomicTransactionComposer()
  atc.addTransaction({ txn: payTxn, signer: makeSigner(signTransactions) })
  await atc.addMethodCall({
    appID: getAppealsAppId(),
    sender,
    signer: makeSigner(signTransactions),
    method: methodByName('donate'),
    methodArgs: [BigInt(appealId), { txn: payTxn, signer: makeSigner(signTransactions) }],
    boxes: [appealBoxRef(appealId)],
    suggestedParams: { ...sp, fee: 2000 },
  })
  const { txId } = await executeAtc(atc)
  return txId
}

export async function withdrawAppeal(
  beneficiary: string,
  signTransactions: SignTransactionsFn,
  appealId: number,
): Promise<string> {
  const sp = await suggestedParams()
  const atc = new algosdk.AtomicTransactionComposer()
  await atc.addMethodCall({
    appID: getAppealsAppId(),
    sender: beneficiary,
    signer: makeSigner(signTransactions),
    method: methodByName('withdraw'),
    methodArgs: [BigInt(appealId)],
    boxes: [appealBoxRef(appealId)],
    suggestedParams: { ...sp, fee: 3000 },
  })
  const { txId } = await executeAtc(atc)
  return txId
}

export async function readAppealState(appealId: number): Promise<{
  target: number
  raised: number
  status: number
}> {
  const sp = await suggestedParams()
  const atc = new algosdk.AtomicTransactionComposer()
  const sender = algosdk.getApplicationAddress(getAppealsAppId()).toString()
  await atc.addMethodCall({
    appID: getAppealsAppId(),
    sender,
    signer: algosdk.makeEmptyTransactionSigner(),
    method: methodByName('get_appeal'),
    methodArgs: [BigInt(appealId)],
    suggestedParams: sp,
  })
  const result = await atc.simulate(getAlgod())
  const raw = result.methodResults[0]?.returnValue
  if (!(raw instanceof Uint8Array)) throw new Error('No return from get_appeal')
  const decoded = algosdk.ABIType.from('(uint64,uint64,uint64)').decode(raw) as bigint[]
  return { target: Number(decoded[0]), raised: Number(decoded[1]), status: Number(decoded[2]) }
}

export { getExplorerTransactionUrl }
