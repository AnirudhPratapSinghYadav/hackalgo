import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['@perawallet/connect', '@blockshake/defly-connect', '@walletconnect/modal', '@walletconnect/sign-client', '@walletconnect/types']
  }
})
