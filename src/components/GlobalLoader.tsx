import { useTxLoading } from '../context/TxLoadingContext'

export default function GlobalLoader() {
  const { busy, message } = useTxLoading()
  if (!busy) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      role="status"
      aria-live="polite"
    >
      <div className="rounded-lg border border-border-subtle bg-bg-surface px-6 py-5 shadow-lg max-w-sm text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-accent-primary border-t-transparent" />
        <p className="mt-4 text-sm text-text-primary font-medium">{message ?? 'Processing…'}</p>
        <p className="mt-1 text-xs text-text-tertiary">Waiting for on-chain confirmation</p>
      </div>
    </div>
  )
}
