import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '../config/queryClient'
import { OpsSessionProvider } from '../context/OpsSessionContext'
import { TxLoadingProvider } from '../context/TxLoadingContext'
import GlobalLoader from '../components/GlobalLoader'

interface AppProvidersProps {
  children: ReactNode
}

/**
 * Global providers: async data (React Query) + ops session (wallet / demo).
 * WalletProvider remains in main.tsx (requires WalletManager at bootstrap).
 * ChainBootstrapGate lives inside BrowserRouter (AppRouter) so useLocation() works.
 */
export default function AppProviders({ children }: AppProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <TxLoadingProvider>
        <OpsSessionProvider>
          {children}
        </OpsSessionProvider>
        <GlobalLoader />
      </TxLoadingProvider>
    </QueryClientProvider>
  )
}
