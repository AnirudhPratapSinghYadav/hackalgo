import type { ReactNode } from 'react'
import React from 'react'

type Props = { children: ReactNode }
type State = { hasError: boolean; message?: string }

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(err: unknown): State {
    const message = err instanceof Error ? err.message : String(err)
    return { hasError: true, message }
  }

  componentDidCatch(err: unknown) {
    // Keep minimal; avoid crashing production on unexpected wallet/runtime issues.
    console.error('[AlgoVault] UI crash recovered by ErrorBoundary:', err)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="min-h-screen bg-[#f8f9fb] font-sans flex items-center justify-center px-6">
        <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-bold text-red-600 uppercase tracking-widest">Recovered</p>
          <h1 className="text-lg font-extrabold text-gray-900 mt-2">Something went wrong</h1>
          <p className="text-sm text-gray-600 mt-2">
            The app hit an unexpected error. Your funds are safe — this is only the UI.
          </p>
          <p className="text-[11px] font-mono text-gray-500 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 mt-4 break-all">
            {this.state.message ?? 'Unknown error'}
          </p>
          <button
            type="button"
            className="mt-4 w-full py-3 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#1d4ed8] text-white text-sm font-semibold"
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
        </div>
      </div>
    )
  }
}

