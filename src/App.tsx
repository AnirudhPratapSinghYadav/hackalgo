import AppProviders from './app/AppProviders'
import AppRouter from './router/AppRouter'
import ErrorBoundary from './components/ErrorBoundary'

export default function App() {
  return (
    <AppProviders>
      <ErrorBoundary>
        <AppRouter />
      </ErrorBoundary>
    </AppProviders>
  )
}
