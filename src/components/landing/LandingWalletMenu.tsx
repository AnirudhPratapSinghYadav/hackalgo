import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, Wallet } from 'lucide-react'
import { useWallet } from '@txnlab/use-wallet-react'
import { useOpsSession } from '../../context/OpsSessionContext'

export default function LandingWalletMenu() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const { wallets } = useWallet()
  const { connect, enterDemoMode } = useOpsSession()

  useEffect(() => {
    const onOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [])

  const handlePera = async () => {
    setOpen(false)
    try {
      await connect('pera')
      navigate('/operations')
    } catch {
      /* user cancelled */
    }
  }

  const handleDefly = async () => {
    setOpen(false)
    try {
      await connect('defly')
      navigate('/operations')
    } catch {
      /* user cancelled */
    }
  }

  const handleDemo = () => {
    setOpen(false)
    enterDemoMode()
    navigate('/operations')
  }

  const peraReady = wallets?.some((w) => String(w.id).toLowerCase() === 'pera')
  const deflyReady = wallets?.some((w) => String(w.id).toLowerCase() === 'defly')

  return (
    <div ref={ref} className="fixed top-0 right-0 z-50 p-4 sm:p-6">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-4 py-3 bg-[#151917]/90 backdrop-blur-md border border-white/10 text-[#f3f1eb] font-sans text-sm font-medium shadow-[0_0_30px_rgba(80,106,90,0.15)] hover:border-[#506a5a]/50 transition-all duration-300 min-h-[44px]"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Wallet size={18} strokeWidth={1.5} />
        <span className="hidden sm:inline">Connect</span>
        <ChevronDown size={16} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open ? (
        <div className="absolute right-4 sm:right-6 top-full mt-2 w-56 bg-[#151c18]/95 backdrop-blur-md border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.6)] overflow-hidden">
          <p className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-[#6b736d] border-b border-white/5">
            Institutional access
          </p>
          <button
            type="button"
            onClick={handlePera}
            disabled={!peraReady}
            className="w-full flex items-center gap-3 px-4 py-3.5 bg-[#ffe200] text-black font-sans font-medium text-sm hover:bg-[#ffe200]/90 transition-colors disabled:opacity-40 min-h-[44px]"
          >
            Pera Wallet
          </button>
          <button
            type="button"
            onClick={handleDefly}
            disabled={!deflyReady}
            className="w-full flex items-center gap-3 px-4 py-3.5 bg-white text-black font-sans font-medium text-sm hover:bg-gray-200 transition-colors disabled:opacity-40 min-h-[44px] border-t border-white/5"
          >
            Defly Wallet
          </button>
          <button
            type="button"
            onClick={handleDemo}
            className="w-full flex items-center gap-3 px-4 py-3.5 bg-transparent text-[#f3f1eb] font-sans font-medium text-sm border-t border-[#506a5a]/30 hover:bg-[#506a5a]/20 transition-colors min-h-[44px]"
          >
            Demo console
          </button>
        </div>
      ) : null}
    </div>
  )
}
