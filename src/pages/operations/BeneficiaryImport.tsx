import { useState } from 'react'
import algosdk from 'algosdk'
import { OpsPanel, Button } from '../../components/ui'
import { usePlatformStore, type BeneficiaryPayoutRow } from '../../store/platformStore'

/** Demo CSV: wallet addresses only — on-chain USDC disbursement. */
function parseWalletCsv(text: string): BeneficiaryPayoutRow[] {
  const lines = text
    .trim()
    .split(/\r?\n/)
    .filter((l) => l.trim() && !l.trim().startsWith('#'))
  const rows: BeneficiaryPayoutRow[] = []
  for (const line of lines) {
    const parts = line.split(',').map((p) => p.trim())
    if (parts.length < 3) continue

    let name: string
    let address: string
    let amountStr: string

    if (parts.length >= 4 && parts[1].toLowerCase() === 'wallet') {
      ;[name, , address, amountStr] = parts
    } else {
      ;[name, address, amountStr] = parts
    }

    if (name.toLowerCase() === 'name') continue
    const amountUsdc = parseFloat(amountStr)
    if (!Number.isFinite(amountUsdc) || amountUsdc <= 0) {
      throw new Error(`Invalid amount on row: ${line}`)
    }
    if (!algosdk.isValidAddress(address)) {
      throw new Error(`Invalid Algorand wallet on row: ${line}`)
    }

    rows.push({
      name,
      deliveryType: 'wallet',
      identifier: address,
      address,
      amountMicroUsdc: Math.round(amountUsdc * 1_000_000),
    })
  }
  return rows
}

const SAMPLE_CSV = `name,wallet_address,amount_usdc
Jane Doe,AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA,10
Field Team B,BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB,25
`

export default function BeneficiaryImport() {
  const setPending = usePlatformStore((s) => s.setPendingBeneficiaryPayouts)
  const pending = usePlatformStore((s) => s.pendingBeneficiaryPayouts)
  const [csv, setCsv] = useState(SAMPLE_CSV)
  const [error, setError] = useState<string | null>(null)

  const handleParse = () => {
    try {
      setError(null)
      const rows = parseWalletCsv(csv)
      if (rows.length === 0) throw new Error('No valid rows')
      setPending(rows)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Parse failed')
    }
  }

  return (
    <OpsPanel title="Beneficiary CSV import" accent="left">
      <p className="text-xs text-text-secondary mb-3">
        One row per survivor wallet. Format:{' '}
        <span className="font-mono">name,wallet_address,amount_usdc</span>
        <br />
        USDC is sent on Algorand testnet — each row must be a valid wallet address.
      </p>
      <textarea
        value={csv}
        onChange={(e) => setCsv(e.target.value)}
        rows={6}
        className="w-full font-mono text-xs bg-bg-elevated border border-border-medium p-3 text-text-primary"
      />
      {error ? <p className="mt-2 text-xs text-alert-critical">{error}</p> : null}
      <div className="mt-4 flex gap-3 flex-wrap">
        <Button variant="primary" type="button" onClick={handleParse}>
          Validate &amp; load
        </Button>
        <span className="text-xs text-text-tertiary self-center font-mono">
          {pending.length} wallet(s) ready for release
        </span>
      </div>
      {pending.length > 0 ? (
        <ul className="mt-4 space-y-1 font-mono text-[10px] text-text-tertiary max-h-32 overflow-y-auto">
          {pending.map((r) => (
            <li key={r.identifier}>
              {r.name}: {(r.amountMicroUsdc / 1_000_000).toFixed(2)} USDC → {r.identifier.slice(0, 8)}…
            </li>
          ))}
        </ul>
      ) : null}
    </OpsPanel>
  )
}
