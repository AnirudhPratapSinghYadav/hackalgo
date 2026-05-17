import * as fs from 'node:fs'
import * as path from 'node:path'
import algosdk from 'algosdk'
import { BOT_ROOT } from '../config.js'

type Arc56Method = { name: string; args: { type: string; name: string }[]; returns: { type: string } }

export function loadArc56(contractName: 'DisasterVault' | 'CommunityDonationHub'): {
  methods: Arc56Method[]
} {
  const file = path.join(BOT_ROOT, 'src', 'contracts', `${contractName}.arc56.json`)
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

export function methodByName(spec: { methods: Arc56Method[] }, name: string): algosdk.ABIMethod {
  const m = spec.methods.find((x) => x.name === name)
  if (!m) throw new Error(`Method ${name} not in ARC-56 spec`)
  return new algosdk.ABIMethod({
    name: m.name,
    args: m.args.map((a) => ({ type: a.type, name: a.name })),
    returns: m.returns,
  })
}
