import { useEffect, useMemo, useRef, useState } from 'react'
import WalletConnect from '../components/WalletConnect'
import { getGlobalStats } from '../services/algorand'

const STORY_CARDS = [
  {
    title: 'A village flood reserve',
    subtitle: 'When roads closed, the fund was ready.',
    img: 'https://images.pexels.com/photos/6646918/pexels-photo-6646918.jpeg?auto=compress&cs=tinysrgb&w=1600',
    tag: 'Disaster Reserve',
    tagClass: 'text-emerald-700 bg-emerald-50 border-emerald-100',
  },
  {
    title: 'Education fund for one girl',
    subtitle: 'Many contributors. One future.',
    img: 'https://images.pexels.com/photos/5212345/pexels-photo-5212345.jpeg?auto=compress&cs=tinysrgb&w=1600',
    tag: 'Guardian Vault',
    tagClass: 'text-blue-700 bg-blue-50 border-blue-100',
  },
  {
    title: 'A promise kept for parents',
    subtitle: 'No excuses. Code enforces the plan.',
    img: 'https://images.pexels.com/photos/7551442/pexels-photo-7551442.jpeg?auto=compress&cs=tinysrgb&w=1600',
    tag: 'Protection',
    tagClass: 'text-amber-700 bg-amber-50 border-amber-100',
  },
  {
    title: 'Transparent community trust',
    subtitle: 'Every contribution is verifiable.',
    img: 'https://images.pexels.com/photos/3184436/pexels-photo-3184436.jpeg?auto=compress&cs=tinysrgb&w=1600',
    tag: 'On-Chain Proof',
    tagClass: 'text-violet-700 bg-violet-50 border-violet-100',
  },
]

function SmartImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <div className={`relative ${className ?? ''}`}>
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0e27] via-[#1e1b4b] to-[#2563EB] opacity-60" />
        <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '18px 18px' }} />
        <div className="absolute inset-0 flex items-end p-4">
          <div className="bg-black/30 backdrop-blur-md border border-white/10 rounded-xl px-3 py-2">
            <p className="text-white text-sm font-semibold leading-tight">{alt}</p>
            <p className="text-white/50 text-xs mt-0.5">Image unavailable — showing fallback</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  )
}

const USE_CASES = [
  {
    title: 'Education Guardian Vault',
    desc: 'Multiple contributors save together for one child\'s future. The beneficiary receives funds when she turns 18 — no bank, no lawyer, just a trustless promise.',
    accent: 'from-blue-500 to-violet-600',
    border: 'border-blue-200/60 hover:border-blue-300',
    tag: 'Guardian',
    tagColor: 'text-blue-700 bg-blue-50 border-blue-100',
    icon: (
      <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
    ),
    link: '/vault/guardian',
  },
  {
    title: 'Community Disaster Reserve',
    desc: 'Villagers pool savings into a transparent emergency fund. When floods, cyclones, or crises strike — the reserve is already ready. On-chain. Auditable.',
    accent: 'from-emerald-500 to-teal-600',
    border: 'border-emerald-200/60 hover:border-emerald-300',
    tag: 'Community',
    tagColor: 'text-emerald-700 bg-emerald-50 border-emerald-100',
    icon: (
      <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    ),
    link: '/vault/community',
  },
  {
    title: 'Savings Pact & Protection',
    desc: 'Lock accountability with a partner on-chain. Set goals, design your own consequences for early withdrawal, and earn milestone badges that prove discipline.',
    accent: 'from-amber-500 to-orange-600',
    border: 'border-amber-200/60 hover:border-amber-300',
    tag: 'Accountability',
    tagColor: 'text-amber-700 bg-amber-50 border-amber-100',
    icon: (
      <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
    ),
    link: '/dashboard',
  },
]

const STEPS = [
  {
    num: '01',
    title: 'Create a Vault',
    desc: 'Set the purpose, savings goal, and beneficiary. Choose whether it\'s for education, disaster preparedness, or personal accountability.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" /></svg>
    ),
  },
  {
    num: '02',
    title: 'Contributors Deposit',
    desc: 'Multiple people contribute ALGO to the same vault. Every deposit is an atomic transaction — payment and state update happen together or not at all.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
    ),
  },
  {
    num: '03',
    title: 'Goal Reached — Funds Release',
    desc: 'When the savings goal is met, funds can be released to the beneficiary. On-chain, transparent, verifiable — no intermediary can stop it.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" /></svg>
    ),
  },
]

export default function Landing() {
  const walletRef = useRef<HTMLDivElement>(null)
  const [stats, setStats] = useState({ totalDeposited: 0, totalUsers: 0 })
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'))
    if (nodes.length === 0) return

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue
          const el = e.target as HTMLElement
          el.classList.add('reveal-in')
          io.unobserve(el)
        }
      },
      { threshold: 0.12 },
    )

    for (const n of nodes) io.observe(n)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    getGlobalStats()
      .then((s) => { setStats({ totalDeposited: s.totalDeposited, totalUsers: s.totalUsers }); setLoaded(true) })
      .catch(() => setLoaded(true))
  }, [])

  const scrollToWallet = () => {
    walletRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const totalAlgo = useMemo(() => (stats.totalDeposited / 1_000_000).toFixed(2), [stats.totalDeposited])

  return (
    <div className="min-h-screen font-sans bg-white">
      {/* NAVBAR */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100/80">
        <div className="max-w-6xl mx-auto px-5 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#2563EB] to-[#7c3aed] flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
            </div>
            <span className="font-bold text-lg text-gray-900 tracking-tight">AlgoVault</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Algorand Testnet
            </div>
            <button
              onClick={scrollToWallet}
              className="px-5 py-2 bg-gradient-to-r from-[#2563EB] to-[#7c3aed] text-white text-sm font-semibold rounded-xl hover:shadow-lg hover:shadow-blue-500/20 transition-all"
            >
              Connect Wallet
            </button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative min-h-screen flex items-center pt-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0e27] via-[#111827] to-[#1e1b4b]" />

        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '32px 32px' }}
        />

        {/* Glow orbs */}
        <div className="absolute top-1/4 left-[10%] w-72 h-72 bg-blue-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-[15%] w-56 h-56 bg-violet-500/10 rounded-full blur-[100px]" />
        <div className="absolute top-[60%] left-[50%] w-40 h-40 bg-emerald-500/8 rounded-full blur-[80px]" />

        <div className="relative z-10 max-w-6xl mx-auto px-5 sm:px-6 py-16 sm:py-20 lg:py-0 w-full">
          <div className="grid lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 bg-white/[0.07] backdrop-blur-sm px-4 py-2 rounded-full mb-6 border border-white/[0.08]">
              <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              <span className="text-white/70 text-xs font-semibold">Secured by Algorand Blockchain</span>
            </div>

            <h1 className="text-white font-extrabold text-[2.5rem] sm:text-5xl lg:text-[3.5rem] leading-[1.08] mb-6 tracking-tight">
              Promises that live<br />
              <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">on the blockchain</span>
            </h1>

            <p className="text-white/45 text-base sm:text-lg leading-relaxed max-w-2xl mb-10">
              A trustless savings platform where communities fund education, prepare for disasters,
              and protect those who can't protect themselves. Every contribution is transparent.
              Every promise is enforced by code.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mb-12">
              <button
                onClick={scrollToWallet}
                className="px-8 py-4 bg-gradient-to-r from-[#2563EB] to-[#7c3aed] text-white font-semibold rounded-xl text-base hover:shadow-xl hover:shadow-blue-500/25 transition-all"
              >
                Start Contributing
              </button>
              <a
                href="#use-cases"
                className="px-8 py-4 bg-white/[0.07] backdrop-blur-sm text-white font-semibold rounded-xl text-base border border-white/[0.08] hover:bg-white/[0.12] transition-all text-center"
              >
                See Real Use Cases
              </a>
            </div>

            <div className="flex flex-wrap gap-x-8 gap-y-4 pt-6 border-t border-white/[0.06]">
              <div>
                <div className="text-white font-bold text-2xl tracking-tight">
                  {loaded ? totalAlgo : '...'}
                </div>
                <div className="text-white/30 text-xs mt-0.5">ALGO Saved</div>
              </div>
              <div>
                <div className="text-white font-bold text-2xl tracking-tight">
                  {loaded ? stats.totalUsers : '...'}
                </div>
                <div className="text-white/30 text-xs mt-0.5">Contributors</div>
              </div>
              <div>
                <div className="text-white font-bold text-2xl tracking-tight">100%</div>
                <div className="text-white/30 text-xs mt-0.5">On-Chain</div>
              </div>
              <div>
                <div className="text-white font-bold text-2xl tracking-tight">&lt;3s</div>
                <div className="text-white/30 text-xs mt-0.5">Finality</div>
              </div>
            </div>
            </div>

            {/* REAL-LIFE IMAGE COLLAGE */}
            <div className="hidden lg:block lg:col-span-5">
              <div className="relative">
                <div className="absolute -inset-6 bg-gradient-to-br from-blue-500/10 via-violet-500/10 to-emerald-500/10 rounded-[32px] blur-2xl" />

                <div className="relative grid grid-cols-2 gap-4">
                  <div className="col-span-2 rounded-2xl overflow-hidden border border-white/[0.10] shadow-2xl shadow-black/25 reveal" data-reveal>
                    <SmartImage
                      src="https://images.pexels.com/photos/7551442/pexels-photo-7551442.jpeg?auto=compress&cs=tinysrgb&w=1800"
                      alt="Guardian promise"
                      className="w-full h-44 object-cover"
                    />
                    <div className="p-4 bg-white/[0.04]">
                      <p className="text-white font-semibold text-sm">Save for someone who can’t save yet</p>
                      <p className="text-white/50 text-xs mt-1">A promise kept by code — not trust.</p>
                    </div>
                  </div>

                  <div className="rounded-2xl overflow-hidden border border-white/[0.10] bg-white/[0.04] shadow-xl shadow-black/20 reveal" data-reveal>
                    <SmartImage
                      src="https://images.pexels.com/photos/5212345/pexels-photo-5212345.jpeg?auto=compress&cs=tinysrgb&w=1400"
                      alt="Education"
                      className="w-full h-44 object-cover"
                    />
                    <div className="p-3">
                      <span className="text-[10px] font-bold text-blue-200/90 bg-blue-500/10 border border-blue-500/20 px-2 py-1 rounded-full uppercase tracking-wider">
                        Education
                      </span>
                      <p className="text-white/70 text-xs mt-2 leading-relaxed">One goal. Many contributors.</p>
                    </div>
                  </div>

                  <div className="rounded-2xl overflow-hidden border border-white/[0.10] bg-white/[0.04] shadow-xl shadow-black/20 reveal" data-reveal>
                    <SmartImage
                      src="https://images.pexels.com/photos/6646918/pexels-photo-6646918.jpeg?auto=compress&cs=tinysrgb&w=1400"
                      alt="Disaster reserve"
                      className="w-full h-44 object-cover"
                    />
                    <div className="p-3">
                      <span className="text-[10px] font-bold text-emerald-200/90 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-full uppercase tracking-wider">
                        Disaster Reserve
                      </span>
                      <p className="text-white/70 text-xs mt-2 leading-relaxed">Transparency when it matters.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PREMIUM STORYTELLING (Humanitarian Intelligence Platform) */}
      <section className="py-16 sm:py-20 bg-gradient-to-b from-white to-[#f8f9fb] border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-5 sm:px-6">
          <div className="text-center mb-10 reveal" data-reveal>
            <span className="text-xs font-bold text-[#2563EB] uppercase tracking-widest">Humanitarian Intelligence</span>
            <h2 className="text-gray-900 font-extrabold text-3xl sm:text-4xl mt-3 tracking-tight">
              Crisis intelligence that feels premium — and proves itself on-chain
            </h2>
            <p className="text-gray-500 mt-4 max-w-3xl mx-auto leading-relaxed">
              AlgoVault pairs AI crisis verification with Algorand-native transparency, so decisions are explainable,
              auditable, and fast — even under pressure.
            </p>
          </div>

          <div className="grid lg:grid-cols-12 gap-6">
            {/* SECTION A */}
            <div className="lg:col-span-5 rounded-3xl border border-gray-100 bg-white p-7 card-shadow reveal" data-reveal>
              <p className="text-xs font-bold text-emerald-700 uppercase tracking-widest">Respond to Crisis from Anywhere</p>
              <h3 className="text-gray-900 font-extrabold text-xl mt-2 tracking-tight">WhatsApp + Telegram + AI alerts</h3>
              <p className="text-sm text-gray-500 mt-3 leading-relaxed">
                Message the Guardian like a human. It understands intent, handles typos, remembers context, and responds
                with verified briefs — not robotic replies.
              </p>
              <div className="mt-5 grid grid-cols-3 gap-3">
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Channel</p>
                  <div className="mt-2 flex items-center gap-2">
                    <svg className="w-5 h-5" viewBox="0 0 32 32" aria-hidden="true">
                      <path fill="#25D366" d="M16 3C9.1 3 3.5 8.6 3.5 15.5c0 2.6.8 5.1 2.2 7.2L4 29l6.5-1.7c2 1.1 4.2 1.7 6.5 1.7 6.9 0 12.5-5.6 12.5-12.5S22.9 3 16 3z"/>
                      <path fill="#fff" d="M12.3 9.6c-.3-.7-.6-.7-.9-.7h-.8c-.3 0-.7.1-1 .5-.3.4-1.3 1.2-1.3 3 0 1.8 1.3 3.5 1.5 3.8.2.2 2.6 4.1 6.3 5.6 3.1 1.3 3.7 1 4.4.9.7-.1 2.2-.9 2.5-1.8.3-.9.3-1.6.2-1.8-.1-.2-.3-.3-.6-.5-.3-.1-2.2-1.1-2.6-1.2-.3-.1-.6-.1-.9.2-.3.3-1 1.2-1.2 1.4-.2.2-.5.3-.8.1-.3-.1-1.4-.5-2.6-1.6-1-.9-1.6-2-1.8-2.3-.2-.3 0-.5.1-.7.2-.2.3-.5.5-.7.2-.2.3-.4.4-.7.1-.2.1-.5 0-.7-.1-.2-.8-2-.9-2.3z"/>
                    </svg>
                    <p className="text-sm font-extrabold text-gray-900">WhatsApp</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Channel</p>
                  <div className="mt-2 flex items-center gap-2">
                    <svg className="w-5 h-5" viewBox="0 0 32 32" aria-hidden="true">
                      <path fill="#229ED9" d="M16 3C8.8 3 3 8.8 3 16s5.8 13 13 13 13-5.8 13-13S23.2 3 16 3z"/>
                      <path fill="#fff" d="M23.6 10.2l-2.6 12.4c-.2.9-.7 1.1-1.5.7l-4.1-3-2 1.9c-.2.2-.4.4-.8.4l.3-4.5 8.1-7.3c.4-.3-.1-.5-.6-.2l-10 6.3-4.3-1.4c-.9-.3-.9-.9.2-1.3l16.7-6.5c.8-.3 1.5.2 1.2 1.5z"/>
                    </svg>
                    <p className="text-sm font-extrabold text-gray-900">Telegram</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Brain</p>
                  <p className="text-sm font-extrabold text-gray-900 mt-2">On‑Chain Proof</p>
                  <p className="text-[11px] text-gray-500 mt-1">Algorand + Lora</p>
                </div>
              </div>
            </div>

            {/* SECTION B */}
            <div className="lg:col-span-7 rounded-3xl border border-gray-100 bg-gradient-to-br from-[#0a0e27] via-[#111827] to-[#1e1b4b] p-7 overflow-hidden card-shadow reveal" data-reveal>
              <div className="flex items-start justify-between gap-6 flex-wrap">
                <div>
                  <p className="text-xs font-bold text-cyan-200 uppercase tracking-widest">Every Contribution Verified On-Chain</p>
                  <h3 className="text-white font-extrabold text-xl mt-2 tracking-tight">Algorand + Lora proof links</h3>
                  <p className="text-white/55 text-sm mt-3 leading-relaxed max-w-xl">
                    Contributions and releases are recorded transparently on Algorand. Anyone can independently verify
                    transactions and balances using Lora Explorer — no trust required.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3">
                  <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Auditability</p>
                  <p className="text-white font-extrabold mt-1">Public, verifiable, timestamped</p>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-4 font-mono text-[12px] text-emerald-100/80 leading-relaxed">
                <div>[12:00:05] 📡 INGRESS: “flood in Hyderabad?”</div>
                <div>[12:00:08] 🔍 ORACLE: verifying live sources…</div>
                <div>[12:00:12] ✅ CONSENSUS: sources linked + timestamped</div>
                <div>[12:00:15] ⚡ SMART CONTRACT: action prepared (auditable)</div>
              </div>
            </div>
          </div>

          {/* SECTION C */}
          <div className="mt-6 rounded-3xl border border-gray-100 bg-white p-7 card-shadow reveal" data-reveal>
            <div className="flex items-start justify-between gap-6 flex-wrap">
              <div>
                <p className="text-xs font-bold text-violet-700 uppercase tracking-widest">AI Monitors 24/7</p>
                <h3 className="text-gray-900 font-extrabold text-xl mt-2 tracking-tight">Global signals → verified briefs</h3>
                <p className="text-sm text-gray-500 mt-3 leading-relaxed max-w-3xl">
                  Instead of overwhelming dashboards, AlgoVault produces calm, human-grade intelligence: what’s happening,
                  why it matters, sources, confidence, and the safest next action.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-2 rounded-full">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live intelligence posture
              </div>
            </div>

            <div className="mt-6 grid sm:grid-cols-3 gap-4">
              {['South Asia', 'East Asia', 'Global'].map((r) => (
                <div key={r} className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{r}</p>
                  <div className="mt-3 h-2.5 rounded-full bg-white border border-gray-100 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-500 via-violet-500 to-cyan-400 w-[68%]" />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Signal density → verified briefs (not raw noise)</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* USE CASES */}
      <section id="use-cases" className="py-20 sm:py-28 bg-white">
        <div className="max-w-6xl mx-auto px-5 sm:px-6">
          <div className="text-center mb-14 reveal" data-reveal>
            <span className="text-xs font-bold text-[#2563EB] uppercase tracking-widest">Real Impact</span>
            <h2 className="text-gray-900 font-extrabold text-3xl sm:text-4xl mt-3 tracking-tight">
              Built for people, not portfolios
            </h2>
            <p className="text-gray-500 mt-4 max-w-2xl mx-auto leading-relaxed">
              Three real-world use cases that turn blockchain savings into a force for community protection and accountability.
            </p>
          </div>

          {/* Floating real-life stories */}
          <div className="mb-10">
            <div className="flex items-center justify-between mb-4 reveal" data-reveal>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Stories</p>
                <h3 className="text-gray-900 font-extrabold text-xl tracking-tight mt-1">Real-world scenarios</h3>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {STORY_CARDS.map((s) => (
                <div
                  key={s.title}
                  className="rounded-2xl border border-gray-100 bg-white card-shadow hover:card-shadow-hover transition-all overflow-hidden reveal"
                  data-reveal
                >
                  <SmartImage src={s.img} alt={s.title} className="w-full h-36 object-cover" />
                  <div className="p-4">
                    <span className={`inline-flex text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${s.tagClass}`}>
                      {s.tag}
                    </span>
                    <p className="text-gray-900 font-semibold text-base mt-2 leading-tight">{s.title}</p>
                    <p className="text-gray-500 text-xs mt-1">{s.subtitle}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Photo-led scroll story panels */}
          <div className="grid lg:grid-cols-3 gap-5 mb-12">
            <div className="rounded-2xl overflow-hidden border border-gray-100 bg-white card-shadow reveal" data-reveal>
              <div className="relative h-56">
                <SmartImage
                  src="https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=1600"
                  alt="Contributors working together"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent" />
                <div className="absolute left-5 right-5 bottom-5">
                  <p className="text-white font-bold text-lg leading-tight">People contribute together</p>
                  <p className="text-white/70 text-sm mt-1">Shared goals, visible progress, no hidden ledger.</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl overflow-hidden border border-gray-100 bg-white card-shadow reveal" data-reveal>
              <div className="relative h-56">
                <SmartImage
                  src="https://images.pexels.com/photos/267885/pexels-photo-267885.jpeg?auto=compress&cs=tinysrgb&w=1600"
                  alt="Education and future"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent" />
                <div className="absolute left-5 right-5 bottom-5">
                  <p className="text-white font-bold text-lg leading-tight">A future funded early</p>
                  <p className="text-white/70 text-sm mt-1">Guardian vaults for education, care, and responsibility.</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl overflow-hidden border border-gray-100 bg-white card-shadow reveal" data-reveal>
              <div className="relative h-56">
                <SmartImage
                  src="https://images.pexels.com/photos/2335126/pexels-photo-2335126.jpeg?auto=compress&cs=tinysrgb&w=1600"
                  alt="Community resilience"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent" />
                <div className="absolute left-5 right-5 bottom-5">
                  <p className="text-white font-bold text-lg leading-tight">Resilience before crisis</p>
                  <p className="text-white/70 text-sm mt-1">Disaster reserves that are transparent and ready.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {USE_CASES.map((uc) => (
              <div
                key={uc.title}
                className={`group relative rounded-2xl border ${uc.border} p-6 sm:p-7 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 bg-white reveal`}
                data-reveal
              >
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${uc.accent} flex items-center justify-center mb-5 shadow-lg`}>
                  {uc.icon}
                </div>
                <span className={`inline-flex text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border mb-4 ${uc.tagColor}`}>
                  {uc.tag}
                </span>
                <h3 className="font-bold text-gray-900 text-lg mb-2.5">{uc.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{uc.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-20 sm:py-28 bg-[#f8f9fb]">
        <div className="max-w-6xl mx-auto px-5 sm:px-6">
          <div className="text-center mb-14 reveal" data-reveal>
            <span className="text-xs font-bold text-[#2563EB] uppercase tracking-widest">Transparent Process</span>
            <h2 className="text-gray-900 font-extrabold text-3xl sm:text-4xl mt-3 tracking-tight">
              How it works
            </h2>
            <p className="text-gray-500 mt-4 max-w-2xl mx-auto leading-relaxed">
              Three steps. All on-chain. No intermediaries, no trust required.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map((step) => (
              <div key={step.num} className="relative reveal" data-reveal>
                <div className="flex items-center gap-4 mb-4">
                  <span className="text-5xl font-extrabold text-gray-100 leading-none">{step.num}</span>
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#2563EB]/10 to-[#7c3aed]/10 flex items-center justify-center text-[#2563EB]">
                    {step.icon}
                  </div>
                </div>
                <h3 className="font-bold text-gray-900 text-lg mb-2">{step.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TECHNOLOGY STRIP */}
      <section className="py-16 bg-white border-y border-gray-100">
        <div className="max-w-6xl mx-auto px-5 sm:px-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-2xl font-bold text-gray-900">ARC-4</div>
              <div className="text-xs text-gray-500 mt-1">ABI Standard</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">Atomic</div>
              <div className="text-xs text-gray-500 mt-1">Grouped Txns</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">ASA</div>
              <div className="text-xs text-gray-500 mt-1">Badge NFTs</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">&lt;0.001</div>
              <div className="text-xs text-gray-500 mt-1">ALGO per Txn</div>
            </div>
          </div>
        </div>
      </section>

      {/* WALLET CONNECT SECTION */}
      <section ref={walletRef} className="py-20 sm:py-28 bg-gradient-to-b from-white to-[#f8f9fb]">
        <div className="max-w-[420px] mx-auto px-5 sm:px-6">
          <WalletConnect />
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-8 bg-[#f8f9fb] border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-5 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-[#2563EB] to-[#7c3aed] flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
            </div>
            <span className="text-sm font-semibold text-gray-700">AlgoVault</span>
          </div>
          <p className="text-xs text-gray-400">
            Built on Algorand &middot; App ID: {import.meta.env.VITE_APP_ID} &middot; Testnet
          </p>
        </div>
      </footer>
    </div>
  )
}
