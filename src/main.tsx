import React from 'react'
import ReactDOM from 'react-dom/client'
import { WalletProvider, NetworkId, WalletId, WalletManager } from '@txnlab/use-wallet-react'
import App from './App.tsx'
import './index.css'

const walletManager = new WalletManager({
  wallets: [
    WalletId.PERA,
    WalletId.DEFLY,
    WalletId.WALLETCONNECT
  ],
  network: NetworkId.TESTNET
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <WalletProvider manager={walletManager}>
      <App />
    </WalletProvider>
  </React.StrictMode>,
)
