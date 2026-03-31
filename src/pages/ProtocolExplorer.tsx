import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useWallet } from '@txnlab/use-wallet-react'
import {
  getExplorerApplicationUrl,
  getExplorerAccountUrl,
  getGlobalStateTable,
  getLocalStateTable,
  getLocalStateSnapshotAtRound,
  getPendingTxnDetails,
  getBoxProof,
  getProtocolTransactions,
  getVaultAppAddress,
} from '../services/algorand'

function kvRowTypeLabel(type: 'uint64' | 'bytes') {
  return type === 'uint64' ? 'uint64' : 'bytes'
}

export default function ProtocolExplorer() {
  const { activeAddress, wallets } = useWallet()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [globalTable, setGlobalTable] = useState<Awaited<ReturnType<typeof getGlobalStateTable>>>([])
  const [localTable, setLocalTable] = useState<Awaited<ReturnType<typeof getLocalStateTable>>>([])
  const [txRows, setTxRows] = useState<Awaited<ReturnType<typeof getProtocolTransactions>> | null>(null)
  const [boxProof, setBoxProof] = useState<Awaited<ReturnType<typeof getBoxProof>> | null>(null)
  const [selectedTx, setSelectedTx] = useState<string | null>(null)
  const [transition, setTransition] = useState<{
    before?: { totalSavedMicro: number; streak: number; milestone: number; round: number }
    after?: { totalSavedMicro: number; streak: number; milestone: number; round: number }
    pending?: Awaited<ReturnType<typeof getPendingTxnDetails>>
    error?: string
  } | null>(null)

  const appId = Number(import.meta.env.VITE_APP_ID)
  const appAddress = useMemo(() => getVaultAppAddress(), [])

  const disconnect = () => {
    wallets?.forEach((w) => {
      if (w.isConnected) w.disconnect()
    })
  }

  const refresh = useCallback(async () => {
    if (!activeAddress) return
    setLoading(true)
    setError(null)
    try {
      const [g, l, tx] = await Promise.all([
        getGlobalStateTable(),
        getLocalStateTable(activeAddress),
        getProtocolTransactions(activeAddress, 50),
      ])
      setGlobalTable(g)
      setLocalTable(l)
      setTxRows(tx)
      getBoxProof().then(setBoxProof).catch(() => setBoxProof(null))
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load protocol data')
    } finally {
      setLoading(false)
    }
  }, [activeAddress])

  const loadTransition = useCallback(async (txId: string) => {
    if (!activeAddress || !txRows) return
    setSelectedTx(txId)
    setTransition({ })
    const row = txRows.rows.find((r) => r.txId === txId)
    const round = row?.confirmedRound
    if (!round || round <= 1) {
      setTransition({ error: 'State delta not available for this txn (missing confirmed round).' })
      return
    }
    try {
      const [before, after, pending] = await Promise.all([
        getLocalStateSnapshotAtRound(activeAddress, round - 1),
        getLocalStateSnapshotAtRound(activeAddress, round),
        getPendingTxnDetails(txId).catch(() => ({ logs: [], innerTxns: [] })),
      ])
      setTransition({ before, after, pending })
    } catch (e: any) {
      setTransition({ error: e?.message ?? 'State delta not available for this txn.' })
    }
  }, [activeAddress, txRows])

  const logMeaning = useCallback((method: string | undefined, idx: number, kind: string) => {
    if (!method) return 'Unmapped (no verified meaning)'
    const isReturn0 = idx === 0 && kind === 'uint64'
    if (isReturn0 && (method.startsWith('deposit(') || method.startsWith('claim_badge(') || method.startsWith('apply_pact_penalty('))) {
      return 'ABI return value (uint64)'
    }
    return 'Unmapped (no verified meaning)'
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  if (!activeAddress) return <Navigate to="/" replace />

  const primitives = [
    { feature: 'Deposit', primitive: 'Payment + App Call', storage: 'Local State (uint64)', txType: 'Atomic Group' },
    { feature: 'Withdraw', primitive: 'App Call + Inner Tx', storage: 'Local State (uint64)', txType: 'ApplicationCall (NoOp)' },
    { feature: 'Badge', primitive: 'ASA mint (inner AssetConfig)', storage: 'Asset params + ARC-69 note', txType: 'ApplicationCall (NoOp)' },
    { feature: 'Streak', primitive: 'App Call updates local uint64', storage: 'Local State (uint64)', txType: 'ApplicationCall' },
    { feature: 'Milestone thresholds', primitive: 'Global state read', storage: 'Global State (uint64)', txType: 'Algod state read' },
    { feature: 'Boxes', primitive: 'App boxes', storage: 'Box key/value (bytes)', txType: 'ApplicationCall (box I/O)' },
  ]

  const localFields = [
    { key: 'user_total', label: 'total_saved (microALGO)', type: 'uint64', source: 'local state' },
    { key: 'user_streak', label: 'streak', type: 'uint64', source: 'local state' },
    { key: 'user_milestone', label: 'milestone', type: 'uint64', source: 'local state' },
    { key: 'last_deposit', label: 'last_deposit', type: 'uint64', source: 'local state' },
  ]

  const globalFields = [
    { key: 'milestone_1', type: 'uint64' },
    { key: 'milestone_2', type: 'uint64' },
    { key: 'milestone_3', type: 'uint64' },
    { key: 'total_deposited', type: 'uint64' },
    { key: 'total_users', type: 'uint64' },
  ]

  const localLookup = useMemo(() => {
    const map = new Map<string, { type: string; value: string | number; valueB64?: string }>()
    for (const r of localTable) map.set(r.keyUtf8, { type: r.type, value: r.value, valueB64: r.valueB64 })
    return map
  }, [localTable])

  const globalLookup = useMemo(() => {
    const map = new Map<string, { type: string; value: string | number; valueB64?: string }>()
    for (const r of globalTable) map.set(r.keyUtf8, { type: r.type, value: r.value, valueB64: r.valueB64 })
    return map
  }, [globalTable])

  return (
    <div className="min-h-screen bg-[#f8f9fb] font-sans">
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="mx-auto max-w-6xl px-5 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Link to="/dashboard" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#2563EB] to-[#7c3aed] flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <span className="font-bold text-lg text-gray-900 tracking-tight">AlgoVault</span>
            </Link>
            <span className="text-gray-300 hidden sm:inline">/</span>
            <span className="text-sm font-semibold text-gray-900 hidden sm:inline">Protocol Explorer</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={refresh}
              className="px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700"
            >
              Refresh
            </button>
            <button onClick={disconnect} className="text-gray-400 hover:text-red-500 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-6xl px-5 sm:px-6 py-8 space-y-6 pb-20">
        <div className="rounded-3xl overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-r from-[#111827] to-[#1e3a5f]" />
          <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
          <div className="relative px-8 py-10">
            <p className="text-white/60 text-xs font-bold uppercase tracking-wider">AVM Data Model</p>
            <h1 className="text-white text-2xl sm:text-3xl font-extrabold tracking-tight mt-2">Algorand Protocol Explorer</h1>
            <p className="text-white/55 text-sm mt-2 max-w-3xl leading-relaxed">
              This view is a strict mirror of how Algorand represents your activity: <span className="font-semibold text-white/80">uint64</span> and <span className="font-semibold text-white/80">bytes</span>
              in state, ABI selectors in app args, atomic groups, and inner transactions. Every row links to proof on Lora.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <a className="px-4 py-2 rounded-xl bg-white text-gray-900 text-sm font-semibold" href={getExplorerApplicationUrl(appId)} target="_blank" rel="noreferrer">
                View App on Lora
              </a>
              <a className="px-4 py-2 rounded-xl bg-white/10 border border-white/10 text-white text-sm font-semibold" href={getExplorerAccountUrl(appAddress)} target="_blank" rel="noreferrer">
                View App Account on Lora
              </a>
              <a className="px-4 py-2 rounded-xl bg-white/10 border border-white/10 text-white text-sm font-semibold" href={getExplorerAccountUrl(activeAddress)} target="_blank" rel="noreferrer">
                View Wallet on Lora
              </a>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 border-2 border-gray-200 border-t-[#2563EB] rounded-full animate-spin mb-4" />
            <p className="text-sm text-gray-500">Loading from algod (state) and indexer (history)...</p>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-8">
            <p className="text-sm font-semibold text-red-700">Protocol explorer failed to load</p>
            <p className="text-xs text-red-600 mt-1">{error}</p>
          </div>
        ) : (
          <>
            <div className="rounded-2xl border border-gray-100 bg-white p-6 card-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-gray-900 font-bold text-lg tracking-tight">Feature → Primitive Mapping</h2>
                  <p className="text-xs text-gray-500 mt-1">Strict mapping of product features to Algorand primitives, storage, and transaction types.</p>
                </div>
                <span className="text-[10px] font-bold text-gray-500 bg-gray-50 border border-gray-100 px-2.5 py-1 rounded-full uppercase tracking-wider">
                  Protocol truth table
                </span>
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-400 uppercase tracking-wider border-b border-gray-100">
                      <th className="py-2 pr-4">Feature</th>
                      <th className="py-2 pr-4">Primitive</th>
                      <th className="py-2 pr-4">Storage</th>
                      <th className="py-2 pr-4">Tx Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {primitives.map((r) => (
                      <tr key={r.feature} className="border-b border-gray-50 last:border-b-0">
                        <td className="py-3 pr-4 font-semibold text-gray-900">{r.feature}</td>
                        <td className="py-3 pr-4 text-gray-700">{r.primitive}</td>
                        <td className="py-3 pr-4 text-gray-700">{r.storage}</td>
                        <td className="py-3 pr-4 text-gray-700">{r.txType}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-gray-100 bg-white p-6 card-shadow">
                <h2 className="text-gray-900 font-bold text-lg tracking-tight">Local State (per-wallet)</h2>
                <p className="text-xs text-gray-500 mt-1">
                  Source: <span className="font-semibold">algod</span> → <span className="font-mono">accountApplicationInformation()</span>. Values are strictly <span className="font-semibold">uint64</span> or <span className="font-semibold">bytes</span>.
                </p>
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-gray-400 uppercase tracking-wider border-b border-gray-100">
                        <th className="py-2 pr-4">Field</th>
                        <th className="py-2 pr-4">Type</th>
                        <th className="py-2 pr-4">Value</th>
                        <th className="py-2 pr-4">Source</th>
                      </tr>
                    </thead>
                    <tbody>
                      {localFields.map((f) => {
                        const v = localLookup.get(f.key)
                        const value = v ? v.value : '—'
                        return (
                          <tr key={f.key} className="border-b border-gray-50 last:border-b-0">
                            <td className="py-3 pr-4 font-mono text-gray-900">{f.key}</td>
                            <td className="py-3 pr-4 text-gray-700">{f.type}</td>
                            <td className="py-3 pr-4 text-gray-900 font-semibold">{String(value)}</td>
                            <td className="py-3 pr-4 text-gray-500">{f.source}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <details className="mt-4">
                  <summary className="text-xs font-semibold text-gray-700 cursor-pointer">Show raw local-state KV (decoded)</summary>
                  <div className="mt-3 overflow-x-auto">
                    <table className="min-w-full text-xs">
                      <thead>
                        <tr className="text-left text-[10px] text-gray-400 uppercase tracking-wider border-b border-gray-100">
                          <th className="py-2 pr-3">Key (utf8)</th>
                          <th className="py-2 pr-3">Key (base64)</th>
                          <th className="py-2 pr-3">Type</th>
                          <th className="py-2 pr-3">Value</th>
                          <th className="py-2 pr-3">Value (base64)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {localTable.map((r) => (
                          <tr key={r.keyB64} className="border-b border-gray-50 last:border-b-0">
                            <td className="py-2 pr-3 font-mono text-gray-900">{r.keyUtf8}</td>
                            <td className="py-2 pr-3 font-mono text-gray-500">{r.keyB64}</td>
                            <td className="py-2 pr-3 text-gray-700">{kvRowTypeLabel(r.type)}</td>
                            <td className="py-2 pr-3 text-gray-900">{String(r.value)}</td>
                            <td className="py-2 pr-3 font-mono text-gray-500">{r.valueB64 ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-white p-6 card-shadow">
                <h2 className="text-gray-900 font-bold text-lg tracking-tight">Global State (app-wide)</h2>
                <p className="text-xs text-gray-500 mt-1">
                  Source: <span className="font-semibold">algod</span> → <span className="font-mono">getApplicationByID()</span>. Keys are decoded from base64 to utf8; values decoded to uint64/bytes.
                </p>
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-gray-400 uppercase tracking-wider border-b border-gray-100">
                        <th className="py-2 pr-4">Key</th>
                        <th className="py-2 pr-4">Type</th>
                        <th className="py-2 pr-4">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {globalFields.map((f) => {
                        const v = globalLookup.get(f.key)
                        return (
                          <tr key={f.key} className="border-b border-gray-50 last:border-b-0">
                            <td className="py-3 pr-4 font-mono text-gray-900">{f.key}</td>
                            <td className="py-3 pr-4 text-gray-700">{f.type}</td>
                            <td className="py-3 pr-4 text-gray-900 font-semibold">{v ? String(v.value) : '—'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <details className="mt-4">
                  <summary className="text-xs font-semibold text-gray-700 cursor-pointer">Show raw global-state KV (decoded)</summary>
                  <div className="mt-3 overflow-x-auto">
                    <table className="min-w-full text-xs">
                      <thead>
                        <tr className="text-left text-[10px] text-gray-400 uppercase tracking-wider border-b border-gray-100">
                          <th className="py-2 pr-3">Key (utf8)</th>
                          <th className="py-2 pr-3">Key (base64)</th>
                          <th className="py-2 pr-3">Type</th>
                          <th className="py-2 pr-3">Value</th>
                          <th className="py-2 pr-3">Value (base64)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {globalTable.map((r) => (
                          <tr key={r.keyB64} className="border-b border-gray-50 last:border-b-0">
                            <td className="py-2 pr-3 font-mono text-gray-900">{r.keyUtf8}</td>
                            <td className="py-2 pr-3 font-mono text-gray-500">{r.keyB64}</td>
                            <td className="py-2 pr-3 text-gray-700">{kvRowTypeLabel(r.type)}</td>
                            <td className="py-2 pr-3 text-gray-900">{String(r.value)}</td>
                            <td className="py-2 pr-3 font-mono text-gray-500">{r.valueB64 ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-6 card-shadow">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-gray-900 font-bold text-lg tracking-tight">Indexer History (decoded)</h2>
                  <p className="text-xs text-gray-500 mt-1">
                    Source: <span className="font-semibold">indexer</span>. For app calls, the first app arg is decoded as the 4-byte ARC-4 selector; args are decoded to uint64/address/byte[] where possible.
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Strict rule</p>
                  <p className="text-xs text-gray-600">algod = state · indexer = history</p>
                </div>
              </div>

              {!txRows || txRows.rows.length === 0 ? (
                <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-6 text-center">
                  <p className="text-sm font-semibold text-gray-700">No indexed transactions yet</p>
                  <p className="text-xs text-gray-500 mt-1">Make a deposit to generate a payment + app-call atomic group.</p>
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  {Object.keys(txRows.groups).length > 0 && (
                    <details className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                      <summary className="text-sm font-semibold text-gray-800 cursor-pointer">Grouped transaction table (atomic groups)</summary>
                      <div className="mt-3 space-y-3">
                        {Object.entries(txRows.groups).slice(0, 6).map(([g, items]) => (
                          <div key={g} className="rounded-xl border border-gray-200 bg-white p-4">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Group</p>
                                <p className="font-mono text-xs text-gray-800 break-all">{g}</p>
                              </div>
                              {items[0]?.loraGroupUrl && (
                                <a className="text-xs font-semibold text-[#2563EB] hover:underline" href={items[0].loraGroupUrl} target="_blank" rel="noreferrer">
                                  View group on Lora
                                </a>
                              )}
                            </div>
                            <p className="text-xs text-gray-600 mt-2">
                              Atomic group ensures <span className="font-semibold">payment</span> and <span className="font-semibold">state update</span> succeed or fail together.
                            </p>
                            <div className="mt-3 overflow-x-auto">
                              <table className="min-w-full text-xs">
                                <thead>
                                  <tr className="text-left text-[10px] text-gray-400 uppercase tracking-wider border-b border-gray-100">
                                    <th className="py-2 pr-3">Txn</th>
                                    <th className="py-2 pr-3">Type</th>
                                    <th className="py-2 pr-3">Sender</th>
                                    <th className="py-2 pr-3">Receiver</th>
                                    <th className="py-2 pr-3">Amount</th>
                                    <th className="py-2 pr-3">Role</th>
                                    <th className="py-2 pr-3">Proof</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {items.map((r, idx) => (
                                    <tr key={r.txId} className="border-b border-gray-50 last:border-b-0">
                                      <td className="py-2 pr-3 text-gray-600">{idx + 1}</td>
                                      <td className="py-2 pr-3 font-mono text-gray-900">{r.txType}</td>
                                      <td className="py-2 pr-3 font-mono text-gray-700">{r.sender.slice(0, 8)}…</td>
                                      <td className="py-2 pr-3 font-mono text-gray-700">{r.receiver ? `${r.receiver.slice(0, 8)}…` : '—'}</td>
                                      <td className="py-2 pr-3 text-gray-900">{typeof r.amount === 'number' ? `${(r.amount / 1_000_000).toFixed(6)} ALGO` : '—'}</td>
                                      <td className="py-2 pr-3 text-gray-700">{r.txType === 'pay' ? 'fund' : r.txType === 'appl' ? 'state update' : '—'}</td>
                                      <td className="py-2 pr-3">
                                        <a className="text-[#2563EB] hover:underline font-semibold" href={r.loraTxUrl} target="_blank" rel="noreferrer">
                                          Lora
                                        </a>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}

                  <details className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                    <summary className="text-sm font-semibold text-gray-800 cursor-pointer">Inner transaction table (withdrawals + badge mints)</summary>
                    <p className="text-xs text-gray-600 mt-2">
                      Inner transactions are emitted by the <span className="font-semibold">application account</span> during the app call and appear under the parent transaction on Lora.
                    </p>
                    <div className="mt-3 space-y-3">
                      {txRows.rows
                        .filter((r) => (r.innerTxns ?? []).length > 0)
                        .slice(0, 8)
                        .map((r) => (
                          <div key={r.txId} className="rounded-xl border border-gray-200 bg-white p-4">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-semibold text-gray-800">
                                Parent tx: <a className="font-mono text-[#2563EB] hover:underline" href={r.loraTxUrl} target="_blank" rel="noreferrer">{r.txId}</a>
                              </p>
                              <span className="text-[10px] font-bold text-gray-500 bg-gray-50 border border-gray-100 px-2 py-1 rounded-full uppercase tracking-wider">
                                {r.method ?? 'app call'}
                              </span>
                            </div>
                            <div className="mt-3 overflow-x-auto">
                              <table className="min-w-full text-xs">
                                <thead>
                                  <tr className="text-left text-[10px] text-gray-400 uppercase tracking-wider border-b border-gray-100">
                                    <th className="py-2 pr-3">Type</th>
                                    <th className="py-2 pr-3">From</th>
                                    <th className="py-2 pr-3">To</th>
                                    <th className="py-2 pr-3">Amount</th>
                                    <th className="py-2 pr-3">Asset</th>
                                    <th className="py-2 pr-3">Reason</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(r.innerTxns ?? []).map((it, i) => (
                                    <tr key={i} className="border-b border-gray-50 last:border-b-0">
                                      <td className="py-2 pr-3 font-mono text-gray-900">{it.txType}</td>
                                      <td className="py-2 pr-3 font-mono text-gray-700">{(it.sender ?? appAddress).slice(0, 8)}…</td>
                                      <td className="py-2 pr-3 font-mono text-gray-700">{(it.receiver ?? '—').slice(0, 8)}…</td>
                                      <td className="py-2 pr-3 text-gray-900">{typeof it.amount === 'number' ? `${(it.amount / 1_000_000).toFixed(6)} ALGO` : '—'}</td>
                                      <td className="py-2 pr-3 text-gray-900">{it.createdAssetId ?? it.assetId ?? '—'}</td>
                                      <td className="py-2 pr-3 text-gray-700">
                                        {it.txType === 'pay' ? 'withdraw payout' : it.txType === 'acfg' ? 'badge mint (ASA)' : 'contract action'}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ))}
                    </div>
                  </details>

                  <details className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                    <summary className="text-sm font-semibold text-gray-800 cursor-pointer">App call args (ABI selector + typed decoding)</summary>
                    <p className="text-xs text-gray-600 mt-2">
                      For each <span className="font-semibold">appl</span> transaction targeting this App ID, we decode the first arg as the 4-byte ARC-4 selector and then decode arguments by ABI types.
                    </p>
                    <div className="mt-3 space-y-3">
                      {txRows.rows
                        .filter((r) => r.txType === 'appl' && r.appId === appId)
                        .slice(0, 10)
                        .map((r) => (
                          <div key={r.txId} className="rounded-xl border border-gray-200 bg-white p-4">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-xs font-semibold text-gray-800">
                                  Tx: <a className="font-mono text-[#2563EB] hover:underline" href={r.loraTxUrl} target="_blank" rel="noreferrer">{r.txId}</a>
                                </p>
                                <p className="text-[11px] text-gray-600 mt-1">
                                  Method: <span className="font-semibold text-gray-900">{r.method ?? 'unknown'}</span>{' '}
                                  {r.selectorHex ? <span className="font-mono text-gray-500">({r.selectorHex})</span> : null}
                                </p>
                              </div>
                              {r.loraGroupUrl && (
                                <a className="text-xs font-semibold text-gray-600 hover:underline" href={r.loraGroupUrl} target="_blank" rel="noreferrer">
                                  Group
                                </a>
                              )}
                            </div>
                            <div className="mt-3 overflow-x-auto">
                              <table className="min-w-full text-xs">
                                <thead>
                                  <tr className="text-left text-[10px] text-gray-400 uppercase tracking-wider border-b border-gray-100">
                                    <th className="py-2 pr-3">Arg</th>
                                    <th className="py-2 pr-3">Type</th>
                                    <th className="py-2 pr-3">Decoded</th>
                                    <th className="py-2 pr-3">Raw (base64)</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(r.decodedArgs ?? []).map((a) => (
                                    <tr key={a.index} className="border-b border-gray-50 last:border-b-0">
                                      <td className="py-2 pr-3 text-gray-600">{a.index}</td>
                                      <td className="py-2 pr-3 font-mono text-gray-900">{a.type}</td>
                                      <td className="py-2 pr-3 text-gray-900">
                                        {'value' in a
                                          ? String(a.value)
                                          : 'valueUtf8' in a
                                            ? (a.valueUtf8 || a.valueHex)
                                            : 'rawHex' in a
                                              ? a.rawHex
                                              : '—'}
                                      </td>
                                      <td className="py-2 pr-3 font-mono text-gray-500">{a.rawBase64}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ))}
                    </div>
                  </details>

                  <details className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                    <summary className="text-sm font-semibold text-gray-800 cursor-pointer">Notes + Logs decoding (ARC-69 + base64 logs)</summary>
                    <p className="text-xs text-gray-600 mt-2">
                      Notes are decoded as UTF-8 and JSON when possible (ARC-69 badge metadata). Logs are decoded from base64 into uint64/utf8/bytes.
                    </p>
                    <div className="mt-3 space-y-3">
                      {txRows.rows
                        .filter((r) => !!r.note || (r.logs?.length ?? 0) > 0)
                        .slice(0, 10)
                        .map((r) => (
                          <div key={r.txId} className="rounded-xl border border-gray-200 bg-white p-4">
                            <p className="text-xs font-semibold text-gray-800">
                              Tx: <a className="font-mono text-[#2563EB] hover:underline" href={r.loraTxUrl} target="_blank" rel="noreferrer">{r.txId}</a>
                            </p>
                            {r.note && (
                              <div className="mt-3 rounded-lg border border-gray-100 bg-gray-50 p-3">
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                                  Note {r.note.arc69 ? '(ARC-69 detected)' : ''}
                                </p>
                                <p className="text-xs text-gray-700 mt-1 break-all font-mono">{r.note.utf8 ?? '—'}</p>
                              </div>
                            )}
                            {(r.logs?.length ?? 0) > 0 && (
                              <div className="mt-3 overflow-x-auto">
                                <table className="min-w-full text-xs">
                                  <thead>
                                    <tr className="text-left text-[10px] text-gray-400 uppercase tracking-wider border-b border-gray-100">
                                      <th className="py-2 pr-3">Raw (base64)</th>
                                      <th className="py-2 pr-3">Decoded</th>
                                      <th className="py-2 pr-3">Meaning</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {(r.logs ?? []).map((l) => (
                                      <tr key={l.index} className="border-b border-gray-50 last:border-b-0">
                                        <td className="py-2 pr-3 font-mono text-gray-500">{l.rawBase64}</td>
                                        <td className="py-2 pr-3 text-gray-900">
                                          {l.kind === 'uint64' ? String(l.value) : l.kind === 'utf8' ? l.value : l.hex}
                                        </td>
                                        <td className="py-2 pr-3 text-gray-600">
                                          {l.kind === 'uint64' ? 'uint64 log' : l.kind === 'utf8' ? 'utf8 string log' : 'raw bytes log'}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  </details>

                  <details className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <summary className="text-sm font-semibold text-gray-800 cursor-pointer">Boxes (verified on-chain)</summary>
                    <p className="text-xs text-gray-600 mt-2">
                      Source: <span className="font-semibold">algod</span> → <span className="font-mono">getApplicationBoxes()</span> and <span className="font-mono">getApplicationBoxByName()</span>.
                    </p>
                    {!boxProof ? (
                      <p className="text-xs text-gray-500 mt-2">Loading box proof…</p>
                    ) : boxProof.used === false ? (
                      <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
                        <p className="text-sm font-semibold text-emerald-800">This contract does not use boxes (verified).</p>
                        <p className="text-xs text-emerald-700 mt-1">{boxProof.reason}</p>
                      </div>
                    ) : (
                      <div className="mt-3 overflow-x-auto">
                        <table className="min-w-full text-xs">
                          <thead>
                            <tr className="text-left text-[10px] text-gray-400 uppercase tracking-wider border-b border-gray-100">
                              <th className="py-2 pr-3">Key (utf8)</th>
                              <th className="py-2 pr-3">Key (base64)</th>
                              <th className="py-2 pr-3">Size</th>
                              <th className="py-2 pr-3">Type</th>
                              <th className="py-2 pr-3">Value</th>
                            </tr>
                          </thead>
                          <tbody>
                            {boxProof.boxes.map((b) => (
                              <tr key={b.keyBase64} className="border-b border-gray-50 last:border-b-0">
                                <td className="py-2 pr-3 font-mono text-gray-900">{b.keyUtf8}</td>
                                <td className="py-2 pr-3 font-mono text-gray-500">{b.keyBase64}</td>
                                <td className="py-2 pr-3 text-gray-700">{b.size}</td>
                                <td className="py-2 pr-3 text-gray-700">{b.valueType}</td>
                                <td className="py-2 pr-3 text-gray-900 break-all">{b.valuePreview}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </details>

                  <details className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <summary className="text-sm font-semibold text-gray-800 cursor-pointer">State transition engine (before / after)</summary>
                    <p className="text-xs text-gray-600 mt-2">
                      Source: <span className="font-semibold">algod</span> historical account reads using confirmed round:
                      BEFORE = round-1, AFTER = round. No guessing, no UI-derived deltas.
                    </p>
                    <div className="mt-3 rounded-lg border border-gray-100 bg-white p-3">
                      <p className="text-xs text-gray-700">
                        Select a transaction below to compute local-state transition for:
                        <span className="font-mono"> user_total, user_streak, user_milestone</span>.
                      </p>
                    </div>
                    <div className="mt-3 overflow-x-auto">
                      <table className="min-w-full text-xs">
                        <thead>
                          <tr className="text-left text-[10px] text-gray-400 uppercase tracking-wider border-b border-gray-100">
                            <th className="py-2 pr-3">Tx</th>
                            <th className="py-2 pr-3">Method</th>
                            <th className="py-2 pr-3">Round</th>
                            <th className="py-2 pr-3">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(txRows?.rows ?? []).filter((r) => r.txType === 'appl' && r.appId === appId).slice(0, 12).map((r) => (
                            <tr key={r.txId} className="border-b border-gray-50 last:border-b-0">
                              <td className="py-2 pr-3 font-mono text-gray-800">{r.txId.slice(0, 10)}…</td>
                              <td className="py-2 pr-3 text-gray-700">{r.method ?? 'unknown'}</td>
                              <td className="py-2 pr-3 text-gray-700">{r.confirmedRound ?? '—'}</td>
                              <td className="py-2 pr-3">
                                <button
                                  onClick={() => loadTransition(r.txId)}
                                  className="px-2.5 py-1 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-semibold"
                                >
                                  View before/after
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {selectedTx && (
                      <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
                        <p className="text-xs font-semibold text-gray-800">
                          Selected tx: <span className="font-mono">{selectedTx}</span>
                        </p>
                        {transition?.error ? (
                          <p className="text-xs text-gray-600 mt-2">{transition.error}</p>
                        ) : transition?.before && transition?.after ? (
                          <div className="mt-3 overflow-x-auto">
                            <table className="min-w-full text-xs">
                              <thead>
                                <tr className="text-left text-[10px] text-gray-400 uppercase tracking-wider border-b border-gray-100">
                                  <th className="py-2 pr-3">Field</th>
                                  <th className="py-2 pr-3">Before (round {transition.before.round})</th>
                                  <th className="py-2 pr-3">After (round {transition.after.round})</th>
                                </tr>
                              </thead>
                              <tbody>
                                {[
                                  { k: 'total_saved', b: transition.before.totalSavedMicro, a: transition.after.totalSavedMicro },
                                  { k: 'streak', b: transition.before.streak, a: transition.after.streak },
                                  { k: 'milestone', b: transition.before.milestone, a: transition.after.milestone },
                                ].map((r) => (
                                  <tr key={r.k} className="border-b border-gray-50 last:border-b-0">
                                    <td className="py-2 pr-3 font-mono text-gray-900">{r.k}</td>
                                    <td className="py-2 pr-3 text-gray-800">{r.b}</td>
                                    <td className="py-2 pr-3 text-gray-900 font-semibold">{r.a}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="text-xs text-gray-600 mt-2">Loading…</p>
                        )}

                        {transition?.pending && (transition.pending.logs.length > 0 || transition.pending.innerTxns.length > 0) && (
                          <div className="mt-4 grid md:grid-cols-2 gap-4">
                            <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Pending logs (decoded)</p>
                              {(transition.pending.logs.length === 0) ? (
                                <p className="text-xs text-gray-600 mt-2">No logs.</p>
                              ) : (
                                <div className="mt-2 overflow-x-auto">
                                  <table className="min-w-full text-xs">
                                    <thead>
                                      <tr className="text-left text-[10px] text-gray-400 uppercase tracking-wider border-b border-gray-100">
                                        <th className="py-2 pr-3">Raw</th>
                                        <th className="py-2 pr-3">Decoded</th>
                                        <th className="py-2 pr-3">Meaning</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {transition.pending.logs.map((l) => (
                                        <tr key={l.index} className="border-b border-gray-50 last:border-b-0">
                                          <td className="py-2 pr-3 font-mono text-gray-500">{l.rawBase64}</td>
                                          <td className="py-2 pr-3 text-gray-900">{l.kind === 'uint64' ? String(l.value) : l.kind === 'utf8' ? l.value : l.hex}</td>
                                          <td className="py-2 pr-3 text-gray-700">{logMeaning((txRows?.rows.find((x) => x.txId === selectedTx)?.method), l.index, l.kind)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                            <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Pending inner transactions</p>
                              {(transition.pending.innerTxns.length === 0) ? (
                                <p className="text-xs text-gray-600 mt-2">No inner transactions.</p>
                              ) : (
                                <div className="mt-2 overflow-x-auto">
                                  <table className="min-w-full text-xs">
                                    <thead>
                                      <tr className="text-left text-[10px] text-gray-400 uppercase tracking-wider border-b border-gray-100">
                                        <th className="py-2 pr-3">Type</th>
                                        <th className="py-2 pr-3">From</th>
                                        <th className="py-2 pr-3">To</th>
                                        <th className="py-2 pr-3">Amount</th>
                                        <th className="py-2 pr-3">Reason</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {transition.pending.innerTxns.map((it, i) => (
                                        <tr key={i} className="border-b border-gray-50 last:border-b-0">
                                          <td className="py-2 pr-3 font-mono text-gray-900">{it.txType}</td>
                                          <td className="py-2 pr-3 font-mono text-gray-700">{(it.sender ?? appAddress).slice(0, 8)}…</td>
                                          <td className="py-2 pr-3 font-mono text-gray-700">{(it.receiver ?? '—').slice(0, 8)}…</td>
                                          <td className="py-2 pr-3 text-gray-900">{typeof it.amount === 'number' ? `${(it.amount / 1_000_000).toFixed(6)} ALGO` : '—'}</td>
                                          <td className="py-2 pr-3 text-gray-700">{it.txType === 'pay' ? 'withdraw payout' : it.txType === 'acfg' ? 'badge mint (ASA)' : 'contract action'}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </details>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

