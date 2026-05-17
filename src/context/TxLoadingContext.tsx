import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

interface TxLoadingContextValue {
  busy: boolean
  message: string | null
  runWithLoading: <T>(fn: () => Promise<T>, message?: string) => Promise<T>
}

const TxLoadingContext = createContext<TxLoadingContextValue | null>(null)

export function TxLoadingProvider({ children }: { children: ReactNode }) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const runWithLoading = useCallback(async <T,>(fn: () => Promise<T>, msg?: string) => {
    setBusy(true)
    setMessage(msg ?? 'Confirm in Pera Wallet…')
    try {
      return await fn()
    } finally {
      setBusy(false)
      setMessage(null)
    }
  }, [])

  const value = useMemo(() => ({ busy, message, runWithLoading }), [busy, message, runWithLoading])

  return <TxLoadingContext.Provider value={value}>{children}</TxLoadingContext.Provider>
}

export function useTxLoading() {
  const ctx = useContext(TxLoadingContext)
  if (!ctx) throw new Error('useTxLoading must be used within TxLoadingProvider')
  return ctx
}
