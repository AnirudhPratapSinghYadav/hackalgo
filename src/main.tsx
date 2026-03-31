import React from 'react'
import ReactDOM from 'react-dom/client'
import { WalletProvider, NetworkId, WalletId, WalletManager } from '@txnlab/use-wallet-react'
import '@perawallet/connect'
import '@blockshake/defly-connect'
import '@walletconnect/modal'
import '@walletconnect/sign-client'
import App from './App.tsx'
import './index.css'

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as string | undefined
if (!projectId && import.meta.env.PROD) {
  throw new Error('Missing VITE_WALLETCONNECT_PROJECT_ID in production environment')
}
const effectiveProjectId = projectId || 'dev-walletconnect-project-id'

const walletManager = new WalletManager({
  wallets: [
    WalletId.PERA,
    WalletId.DEFLY,
    { id: WalletId.WALLETCONNECT, options: { projectId: effectiveProjectId } }
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
