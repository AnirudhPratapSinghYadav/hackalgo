import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('AlgoVault UI error', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-[40vh] flex items-center justify-center p-8">
          <div className="max-w-md text-center border border-border-subtle rounded-lg p-6 bg-bg-surface">
            <h2 className="font-serif text-xl text-text-primary">Something went wrong</h2>
            <p className="mt-2 text-sm text-text-secondary">{this.state.error.message}</p>
            <button
              type="button"
              className="mt-4 px-4 py-2 text-sm bg-accent-primary text-white rounded"
              onClick={() => this.setState({ error: null })}
            >
              Try again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
