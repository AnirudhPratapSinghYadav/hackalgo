/**
 * Generate two distinct testnet approver wallets for DisasterVault multi-sig demo.
 * Does NOT write to .env — paste addresses manually.
 *
 * Usage: npm run wallets:generate
 */
import algosdk from 'algosdk'

const FAUCET = 'https://bank.testnet.algorand.network'

function main() {
  console.log('AlgoVault — demo approver wallets\n')
  console.log('Fund each address at:', FAUCET)
  console.log('Import mnemonics into Pera before the finale.\n')
  console.log('Paste into .env:')
  console.log('  VITE_DISASTER_APPROVER_1 = <wallet 1 address>')
  console.log('  VITE_DISASTER_APPROVER_2 = <wallet 2 address>')
  console.log('(VITE_DISASTER_APPROVER_0 can match VITE_ADMIN_ADDRESS)\n')
  console.log('Create a NEW campaign after updating .env — old campaigns keep old approver boxes.\n')

  for (let i = 1; i <= 2; i++) {
    const acct = algosdk.generateAccount()
    const mnemonic = algosdk.secretKeyToMnemonic(acct.sk)
    console.log(`── Approver ${i} ──`)
    console.log('Address:  ', acct.addr)
    console.log('Mnemonic: ', mnemonic)
    console.log('')
  }
}

main()
