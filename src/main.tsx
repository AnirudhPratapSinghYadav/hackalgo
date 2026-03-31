import React from 'react'
import ReactDOM from 'react-dom/client'
import { WalletProvider, NetworkId, WalletId, WalletManager } from '@txnlab/use-wallet-react'
import '@perawallet/connect'
import '@blockshake/defly-connect'
import App from './App.tsx'
import './index.css'

const walletManager = new WalletManager({
  // WalletConnect removed (mobile reliability + evaluator simplicity).
  wallets: [WalletId.PERA, WalletId.DEFLY],
  network: NetworkId.TESTNET,
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <WalletProvider manager={walletManager}>
      <App />
    </WalletProvider>
  </React.StrictMode>,
)
