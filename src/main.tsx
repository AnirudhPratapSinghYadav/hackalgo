import React from 'react'
import ReactDOM from 'react-dom/client'
import { WalletProvider, WalletId, WalletManager } from '@txnlab/use-wallet-react'
import '@perawallet/connect'
import '@blockshake/defly-connect'
import App from './App.tsx'
import './index.css'
import { getNetworkConfig } from './services/networkConfig'
import { ErrorBoundary } from './components/ErrorBoundary'

const net = getNetworkConfig()

const walletManager = new WalletManager({
  // WalletConnect removed (mobile reliability + evaluator simplicity).
  wallets: [WalletId.PERA, WalletId.DEFLY],
  network: net.walletNetworkId,
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <WalletProvider manager={walletManager}>
        <App />
      </WalletProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
