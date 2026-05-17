import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { differenceInDays } from 'date-fns'
import { ChevronDown, ExternalLink, Radio, ShieldCheck, Zap, Wallet } from 'lucide-react'
import { useWallet } from '@txnlab/use-wallet-react'
import { useOpsSession } from '../context/OpsSessionContext'
import { ROUTES } from '../config/routes'
import { DEMO_CORE_FOCUS } from '../config/demoFocus'
import ActDivider from '../components/landing/ActDivider'
import { ScrollProgressBar, StoryRail } from '../components/landing/StoryProgress'
import '../styles/landing.css'

const fade = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-40px' },
  transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
}

const DOC = {
  biharRooftops:
    'https://upload.wikimedia.org/wikipedia/commons/7/7f/An_aerial_view_of_the_flood_affected_village_where_the_people_are_sitting_on_the_top_of_their_houses_in_Bihar.jpg',
  pakistanFloodAerial:
    'https://upload.wikimedia.org/wikipedia/commons/b/bf/Arial_images_of_Pakistani_flood_devastation_%284967890124%29.jpg',
  pakistanRoadGone:
    'https://upload.wikimedia.org/wikipedia/commons/a/a1/Pakistan_flood_damage_2010.jpg',
  ethiopiaWaterCrisis:
    'https://upload.wikimedia.org/wikipedia/commons/8/82/Water_Shortage_in_Ethiopia_%28935%29.jpg',
  ethiopiaDroughtSatellite:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Drought_in_Ethiopia%2C_Natural_Hazards_DVIDS833583.jpg/1920px-Drought_in_Ethiopia%2C_Natural_Hazards_DVIDS833583.jpg',
  myanmarFloodSatellite:
    'https://upload.wikimedia.org/wikipedia/commons/c/c6/Flooded_Myanmar_ESA345485.jpg',
} as const

const STATS = [
  {
    stat: '$395B',
    label: 'Annual climate loss',
    context:
      'Most of it never becomes cash in a survivor’s hand on day one. It becomes lines in a spreadsheet—and a press release.',
  },
  {
    stat: '0',
    label: 'Operational speed of legacy loss & damage',
    context:
      'By the time convoys clear and camps empty, institutional “relief” is often still inside compliance, not inside wallets.',
  },
  {
    stat: '7 YRS',
    label: 'What survivors wait for, on average',
    context:
      'Seven years is not a funding gap. It is a life rebuilt without the money that was already promised.',
  },
]

type StoryChapter = {
  id: string
  chapter: string
  tone: 'night' | 'dawn'
  brightImage?: boolean
  image: string
  imageAlt: string
  kicker: string
  title: string
  lead: string
  body: string
  aside?: string
}

const STORY_CRISIS: StoryChapter[] = [
  {
    id: 'ch-1',
    chapter: '01',
    tone: 'night',
    image: DOC.pakistanFloodAerial,
    imageAlt: 'Aerial view of flood devastation, southern Pakistan',
    kicker: 'South Asia · 2010 monsoon',
    title: 'The water does not wait for a treasury wire.',
    lead: 'Brown floodwater erases roads in hours. Pledges stay trapped in coordination calls while mud closes the only ground route.',
    body: 'Disaster is synchronous; disbursement is deliberately asynchronous. People tread water during someone else’s risk committee.',
  },
  {
    id: 'ch-2',
    chapter: '02',
    tone: 'night',
    image: DOC.ethiopiaWaterCrisis,
    imageAlt: 'Water shortage and drought in Ethiopia',
    kicker: 'Horn of Africa · failed rains',
    title: 'Drought does not issue invoices.',
    lead: 'When rains ghost the sky, pastoralists borrow against a season that will not arrive.',
    body: 'The Horn needs water, pasture, and cash that clears before dignity curdles into dependency. Latency is a second crisis.',
    aside: 'Funds never reach on time. The body does not pause for procurement.',
  },
  {
    id: 'ch-3',
    chapter: '03',
    tone: 'night',
    image: DOC.pakistanRoadGone,
    imageAlt: 'Pakistan floods: washed-out ground access',
    kicker: 'Infrastructure erased',
    title: 'Bureaucracy assumes bridges.',
    lead: 'Floodwater has washed away the road; the voucher assumes you can still reach the tehsil office.',
    body: 'Every destroyed culvert is a denial-of-service attack on relief. The poorest pay twice: once in loss, again in queues.',
  },
  {
    id: 'ch-4',
    chapter: '04',
    tone: 'night',
    image: DOC.biharRooftops,
    imageAlt: 'Bihar flood: families shelter on rooftops',
    kicker: 'Bihar · human scale',
    title: 'On the roof is not safety. It is the last geometry left.',
    lead: 'Families marooned above brown water—visible from the air, invisible to systems that still ask for originals in triplicate.',
    body: 'If you can see them from a helicopter and not from an operations console the same afternoon, your architecture is still decorative.',
  },
]

const STORY_RESOLVE: StoryChapter[] = [
  {
    id: 'ch-5',
    chapter: '05',
    tone: 'dawn',
    brightImage: true,
    image: DOC.ethiopiaDroughtSatellite,
    imageAlt: 'NASA satellite: drought-stressed vegetation in Ethiopia',
    kicker: 'Detection · NASA MODIS',
    title: 'The failure is already a colour on a map.',
    lead: 'From orbit, failed rains sketch a bruise across the highlands—brown against cream where pasture should be green.',
    body: 'AlgoVault fuses satellite anomaly with ground truth and human attestation so money moves on evidence—not on optimism.',
  },
  {
    id: 'ch-6',
    chapter: '06',
    tone: 'dawn',
    brightImage: true,
    image: DOC.myanmarFloodSatellite,
    imageAlt: 'Sentinel-1 radar: monsoon flooding extent in Myanmar',
    kicker: 'Extent · Sentinel-1',
    title: 'Water does not respect borders. Neither should verification latency.',
    lead: 'Radar sees through cloud—278,000 hectares drowned while ministries argue over scope.',
    body: 'Detect → approve → trigger → receive—with signatures that mean something in court and timestamps that mean something in a village.',
  },
]

const SDG_GOALS = [
  {
    id: '13',
    title: 'Climate Action',
    color: '#3f7e44',
    summary:
      'AlgoVault targets the gap between climate loss pledges and last-mile payouts—compressing the years between COP promises and rupees in a survivor’s hand.',
  },
  {
    id: '1',
    title: 'No Poverty',
    color: '#e5243b',
    summary:
      'Verified disbursement routes cash directly to households after floods and drought—bypassing the queues that keep the poorest in informal debt.',
  },
  {
    id: '11',
    title: 'Sustainable Cities & Communities',
    color: '#fd9d24',
    summary:
      'When infrastructure fails, communities need money before municipalities rebuild bridges. We model release tied to geotagged disaster proof, not paperwork seasons.',
  },
  {
    id: '16',
    title: 'Peace, Justice & Strong Institutions',
    color: '#00689d',
    summary:
      'Every release is auditable on-chain with human sign-off in the loop—institutional trust without opacity, corruption, or “processing” without a timestamp.',
  },
]

const INSTITUTIONAL_LINKS = [
  {
    abbr: 'WHO',
    name: 'World Health Organization',
    url: 'https://www.who.int/emergencies',
  },
  {
    abbr: 'UNHCR',
    name: 'UN Refugee Agency',
    url: 'https://www.unhcr.org/',
  },
  {
    abbr: 'UN OCHA',
    name: 'UN Office for the Coordination of Humanitarian Affairs',
    url: 'https://www.unocha.org/',
  },
  {
    abbr: 'UNFCCC',
    name: 'UN Climate Change · Loss & Damage',
    url: 'https://unfccc.int/process-and-meetings/bodies/tp/sb-sbi-matters/loss-and-damage',
  },
  {
    abbr: 'CERF',
    name: 'UN Central Emergency Response Fund',
    url: 'https://cerf.un.org/',
  },
  {
    abbr: 'WFP',
    name: 'World Food Programme',
    url: 'https://www.wfp.org/',
  },
  {
    abbr: 'UNDRR',
    name: 'UN Office for Disaster Risk Reduction',
    url: 'https://www.undrr.org/',
  },
  {
    abbr: 'OHCHR',
    name: 'UN Human Rights · protection in crises',
    url: 'https://www.ohchr.org/',
  },
]

const PROTOCOL_STEPS = [
  { icon: Radio, title: 'Detect', body: 'Guardian AI ingests satellite imagery, IMD alerts, and GDACS events.', step: '01' },
  { icon: ShieldCheck, title: 'Approve', body: 'Field officers attest with geotagged proof. Human authority signs before release.', step: '02' },
  { icon: Zap, title: 'Trigger', body: 'Multi-sig vault conditions met. Disbursement executes on Algorand testnet.', step: '03' },
  { icon: Wallet, title: 'Receive', body: 'Verified beneficiaries receive funds via Pera, SMS, or MoneyGram—with full audit trail.', step: '04' },
]

function BackgroundMedia({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="landing-media" aria-hidden>
      <img src={src} alt={alt} />
    </div>
  )
}

function StoryScrim({ alignRight, heavy }: { alignRight: boolean; heavy?: boolean }) {
  return (
    <>
      <div
        className={`absolute inset-0 z-[1] pointer-events-none ${
          heavy ? 'bg-[#151c18]/68' : 'bg-[#151c18]/58'
        }`}
        aria-hidden
      />
      <div
        className={`absolute inset-0 z-[1] pointer-events-none ${
          alignRight
            ? 'bg-gradient-to-l from-[#151c18]/92 via-[#151c18]/72 to-transparent'
            : 'bg-gradient-to-r from-[#151c18]/92 via-[#151c18]/72 to-transparent'
        }`}
        aria-hidden
      />
      <div className="absolute inset-0 z-[1] bg-gradient-to-t from-[#151c18]/90 via-transparent to-[#151c18]/55 pointer-events-none" aria-hidden />
    </>
  )
}

function StoryPanel({ chapter, index }: { chapter: StoryChapter; index: number }) {
  const isNight = chapter.tone === 'night'
  const alignRight = index % 2 === 1
  const badgeClass = isNight
    ? 'text-[#e8b4ae] border-[#7c3b35]/50 bg-[#7c3b35]/25'
    : 'text-[#8fb39a] border-[#506a5a]/50 bg-[#506a5a]/25'

  return (
    <section className="relative z-20 min-h-[100svh] flex items-center overflow-hidden isolate">
      <BackgroundMedia src={chapter.image} alt={chapter.imageAlt} />
      <StoryScrim alignRight={alignRight} heavy={chapter.brightImage} />

      <span
        className="absolute bottom-6 right-4 sm:right-8 font-serif text-[clamp(4rem,14vw,10rem)] leading-none text-white/[0.05] select-none z-[2] pointer-events-none"
        aria-hidden
      >
        {chapter.chapter}
      </span>

      <div
        className={`relative z-10 w-full max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 py-24 sm:py-28 lg:py-32 xl:pr-14 flex ${
          alignRight ? 'justify-end' : 'justify-start'
        }`}
      >
        <motion.article
          className={`landing-copy-panel w-full max-w-lg sm:max-w-xl lg:max-w-2xl rounded-2xl p-7 sm:p-9 lg:p-10 ${
            alignRight ? 'text-right' : 'text-left'
          }`}
          initial={{ opacity: 0, y: 24, x: alignRight ? 16 : -16 }}
          whileInView={{ opacity: 1, y: 0, x: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className={`flex flex-wrap items-center gap-2 sm:gap-3 mb-5 ${alignRight ? 'justify-end' : ''}`}>
            <span className={`font-mono text-xs px-2.5 py-1 rounded border ${badgeClass}`}>{chapter.chapter}</span>
            <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-[#a7aca2]">{chapter.kicker}</p>
          </div>

          <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl xl:text-[2.75rem] text-[#f3f1eb] leading-[1.02] tracking-tight">
            {chapter.title}
          </h2>
          <p className="font-sans text-base sm:text-lg text-[#e8ebe4] mt-5 leading-relaxed">{chapter.lead}</p>
          <div
            className={`h-px w-14 my-7 bg-gradient-to-r ${
              alignRight ? 'ml-auto from-transparent to-white/40' : 'from-white/40 to-transparent'
            }`}
          />
          <p className="font-sans text-sm sm:text-base text-[#c8cdc4] leading-relaxed">{chapter.body}</p>

          {chapter.aside ? (
            <p
              className={`font-serif text-lg sm:text-xl text-[#f3f1eb] mt-8 italic leading-snug border-[#7c3b35] ${
                alignRight ? 'border-r-[3px] pr-5' : 'border-l-[3px] pl-5'
              }`}
            >
              {chapter.aside}
            </p>
          ) : null}
        </motion.article>
      </div>
    </section>
  )
}

export default function Landing() {
  const [copDays, setCopDays] = useState(0)
  const navigate = useNavigate()
  const { wallets } = useWallet()
  const { connect, enterDemoMode } = useOpsSession()

  const peraReady = wallets?.some((w) => String(w.id).toLowerCase() === 'pera')
  const deflyReady = wallets?.some((w) => String(w.id).toLowerCase() === 'defly')

  useEffect(() => {
    setCopDays(differenceInDays(new Date(), new Date('2022-11-20')))
  }, [])

  const handlePera = async () => {
    try {
      await connect('pera')
      navigate('/operations')
    } catch {
      /* cancelled */
    }
  }

  const handleDefly = async () => {
    try {
      await connect('defly')
      navigate('/operations')
    } catch {
      /* cancelled */
    }
  }

  const handleDemo = () => {
    enterDemoMode()
    navigate('/operations')
  }

  return (
    <div className="landing-root bg-[#151c18] text-[#f3f1eb] min-h-screen overflow-x-hidden">
      <ScrollProgressBar />
      <StoryRail />

      <header className="fixed top-0 left-0 right-0 z-[70] flex items-center justify-between px-5 sm:px-8 py-4 bg-gradient-to-b from-[#151c18]/95 via-[#151c18]/70 to-transparent">
        <p className="font-serif text-lg sm:text-xl tracking-tight pointer-events-none">
          <span className="text-[#f3f1eb]">ALGO</span>
          <span className="text-[#8fb39a]">VAULT</span>
        </p>
        <nav className="flex items-center gap-4 sm:gap-6 font-mono text-[10px] uppercase tracking-[0.15em]">
          <span className="text-[#a7aca2] hidden sm:inline">Story</span>
          {!DEMO_CORE_FOCUS ? (
            <Link to={ROUTES.communityFeed} className="text-[#c8cdc4] hover:text-[#8fb39a] transition-colors">
              Community
            </Link>
          ) : null}
          <Link to={ROUTES.access} className="text-[#c8cdc4] hover:text-[#8fb39a] transition-colors">
            Operations
          </Link>
        </nav>
      </header>

      {/* PROLOGUE */}
      <section className="relative z-10 min-h-[100svh] flex flex-col items-center justify-center px-4 sm:px-6 overflow-hidden isolate">
        <BackgroundMedia src={DOC.biharRooftops} alt="Flood-affected village in Bihar" />
        <div className="absolute inset-0 z-[1] bg-[#151c18]/52 pointer-events-none" aria-hidden />
        <div className="absolute inset-0 z-[1] bg-[radial-gradient(ellipse_90%_70%_at_50%_45%,transparent_0%,#151c18_72%)] pointer-events-none" aria-hidden />

        <motion.div
          className="relative z-10 w-full max-w-4xl mx-auto landing-hero-panel rounded-2xl px-6 sm:px-10 py-10 sm:py-14 text-center mt-16"
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="font-mono text-[10px] tracking-[0.3em] text-[#a7aca2] uppercase mb-6">
            Prologue · Global loss & damage
          </p>
          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-[#f3f1eb] leading-[0.92] tracking-tight">
            Relief funds almost never arrive when the body is still in{' '}
            <span className="text-[#e8b4ae]">shock.</span>
          </h1>
          <p className="font-sans text-base sm:text-lg text-[#c8cdc4] max-w-2xl mx-auto mt-8 leading-relaxed">
            The UN&apos;s Loss & Damage Fund has disbursed <strong className="text-[#f3f1eb] font-semibold">$0</strong> in
            last-mile payouts—from Patna to Pibor, Indus to Awash. Settlement latency dressed as policy.
          </p>
          <div className="inline-block mt-8 px-5 py-3 rounded-lg border border-[#7c3b35]/40 bg-[#7c3b35]/20">
            <p className="font-mono text-sm text-[#f3f1eb]">
              Days since COP27 — fund live on paper:{' '}
              <span className="text-[#e8b4ae] font-semibold">{copDays}</span>
            </p>
          </div>
        </motion.div>

        <motion.div
          className="absolute bottom-8 sm:bottom-12 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#a7aca2]">Scroll</span>
          <ChevronDown size={20} className="text-[#8fb39a]" strokeWidth={1.5} />
        </motion.div>
      </section>

      {/* AUTOPSY */}
      <section className="relative z-30 py-28 sm:py-36 px-5 sm:px-8 overflow-hidden isolate bg-[#151c18]">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#7c3b35]/8 rounded-full blur-[100px] landing-orb pointer-events-none" aria-hidden />

        <motion.div className="relative max-w-7xl mx-auto xl:pr-10" {...fade}>
          <p className="font-mono text-[10px] tracking-[0.3em] text-[#8fb39a] uppercase mb-3">The autopsy</p>
          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-[#f3f1eb] leading-[0.95] tracking-tight max-w-3xl">
            When &ldquo;soon&rdquo; means seasons, people stop believing in relief.
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-16">
            {STATS.map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="relative p-7 sm:p-8 rounded-2xl border border-white/12 bg-[#151917] hover:border-[#7c3b35]/40 transition-colors"
              >
                <span className="absolute top-4 right-4 font-mono text-[10px] text-[#6b736d]">0{i + 1}</span>
                <p className="font-serif text-5xl sm:text-6xl text-[#e8b4ae] tracking-tighter leading-none">{item.stat}</p>
                <div className="h-px w-full my-5 bg-white/15" />
                <p className="font-mono text-[10px] text-[#c8cdc4] uppercase tracking-widest mb-2">{item.label}</p>
                <p className="font-sans text-sm text-[#a7aca2] leading-relaxed">{item.context}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      <ActDivider
        act="Act I"
        roman="I"
        title="The Crisis"
        subtitle="Four chapters. Four geographies. One pattern: catastrophe in hours, compensation in years."
        variant="crisis"
      />

      {STORY_CRISIS.map((chapter, i) => (
        <StoryPanel key={chapter.id} chapter={chapter} index={i} />
      ))}

      <ActDivider
        act="Act II"
        roman="II"
        title="The Turn"
        subtitle="From documenting loss to compressing the clock—where verification meets settlement."
        variant="turn"
      />

      {STORY_RESOLVE.map((chapter, i) => (
        <StoryPanel key={chapter.id} chapter={chapter} index={i} />
      ))}

      <ActDivider
        act="Act III"
        roman="III"
        title="The Protocol"
        subtitle="Institutional rails that refuse to treat urgency as a footnote."
        variant="resolve"
      />

      <section className="relative z-30 py-24 sm:py-32 px-5 sm:px-8 isolate bg-[#151917]">
        <motion.div className="relative max-w-6xl mx-auto xl:pr-10" {...fade}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-5">
            {PROTOCOL_STEPS.map((step, i) => {
              const Icon = step.icon
              return (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06, duration: 0.45 }}
                  className="relative p-7 sm:p-8 rounded-2xl border border-[#506a5a]/35 bg-[#151c18] hover:border-[#506a5a]/60 transition-colors"
                >
                  <span className="font-mono text-[10px] text-[#6b736d] absolute top-5 right-5">{step.step}</span>
                  <div className="w-12 h-12 rounded-xl bg-[#506a5a]/20 border border-[#506a5a]/40 flex items-center justify-center mb-5">
                    <Icon size={22} className="text-[#8fb39a]" strokeWidth={1.5} />
                  </div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#8fb39a] mb-2">{step.title}</p>
                  <p className="font-sans text-sm text-[#c8cdc4] leading-relaxed">{step.body}</p>
                </motion.div>
              )
            })}
          </div>
        </motion.div>
      </section>

      {/* EPILOGUE */}
      <section className="relative z-30 min-h-[70svh] flex flex-col lg:flex-row overflow-hidden isolate">
        <div className="relative lg:w-1/2 min-h-[45svh] lg:min-h-[70svh] overflow-hidden">
          <BackgroundMedia src={DOC.pakistanRoadGone} alt="Flood damage, Pakistan" />
          <div className="absolute inset-0 z-[1] bg-[#151c18]/45 lg:bg-gradient-to-r lg:from-transparent lg:via-[#151c18]/40 lg:to-[#151c18]" />
        </div>
        <div className="lg:w-1/2 flex items-center px-6 sm:px-10 py-16 sm:py-20 bg-[#151c18] border-t lg:border-t-0 lg:border-l border-white/10">
          <motion.div {...fade} className="max-w-md">
            <p className="font-mono text-[10px] tracking-[0.3em] text-[#8fb39a] uppercase mb-5">Epilogue</p>
            <p className="font-serif text-2xl sm:text-3xl lg:text-4xl text-[#f3f1eb] leading-[0.95] tracking-tight">
              The most obscene line in humanitarian finance is not the amount pledged. It is the{' '}
              <span className="italic text-[#d4bc8a]">timestamp.</span>
            </p>
            <p className="font-sans text-sm sm:text-base text-[#c8cdc4] mt-6 leading-relaxed">
              AlgoVault is built for operators who cannot say &ldquo;processing&rdquo; again.
            </p>
          </motion.div>
        </div>
      </section>

      {/* GATEWAY */}
      <section className="relative z-30 py-28 sm:py-36 px-5 sm:px-8 overflow-hidden isolate bg-[#151c18]">
        <motion.div className="relative max-w-3xl mx-auto text-center xl:pr-8" {...fade}>
          <p className="font-mono text-[10px] tracking-[0.3em] text-[#a7aca2] uppercase mb-3">Operations gateway</p>
          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl text-[#f3f1eb] leading-[0.95] tracking-tight">
            Enter the console.
          </h2>
          <p className="font-sans text-sm text-[#c8cdc4] max-w-md mx-auto mt-5 leading-relaxed">
            Wallet or demo—the infrastructure that models how verified relief should move.
          </p>

          <div className="mt-12 p-6 sm:p-8 rounded-2xl landing-copy-panel">
            <div className="flex justify-center mb-4">
              <Link
                to={ROUTES.access}
                className="px-8 py-3.5 font-sans font-semibold bg-[#8fb39a] text-[#151c18] rounded-xl hover:brightness-105 transition-all min-h-[48px] inline-flex items-center justify-center"
              >
                Enter Operations
              </Link>
            </div>
            <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
              <button
                type="button"
                onClick={handlePera}
                disabled={!peraReady}
                className="px-7 py-3.5 font-sans font-medium bg-[#ffe200] text-black rounded-xl hover:brightness-105 transition-all disabled:opacity-40 min-h-[48px]"
              >
                Pera Wallet
              </button>
              <button
                type="button"
                onClick={handleDefly}
                disabled={!deflyReady}
                className="px-7 py-3.5 font-sans font-medium bg-white text-black rounded-xl hover:brightness-95 transition-all disabled:opacity-40 min-h-[48px]"
              >
                Defly Wallet
              </button>
              <button
                type="button"
                onClick={handleDemo}
                className="px-7 py-3.5 font-sans font-medium text-[#f3f1eb] border border-[#506a5a] rounded-xl hover:bg-[#506a5a]/20 transition-all min-h-[48px]"
              >
                Demo Access
              </button>
            </div>
          </div>
        </motion.div>
      </section>

      {/* SDGs */}
      <section className="relative z-30 py-24 sm:py-32 px-5 sm:px-8 isolate bg-[#151917] border-t border-white/10">
        <motion.div className="relative max-w-7xl mx-auto xl:pr-10" {...fade}>
          <p className="font-mono text-[10px] tracking-[0.3em] text-[#8fb39a] uppercase mb-3">
            UN Sustainable Development Goals
          </p>
          <h2 className="font-serif text-3xl sm:text-4xl text-[#f3f1eb] leading-[0.95] tracking-tight max-w-2xl">
            Four goals this infrastructure is built to serve.
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-12">
            {SDG_GOALS.map((goal, i) => (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06, duration: 0.45 }}
                className="rounded-2xl border border-white/10 bg-[#151c18] p-6 sm:p-7 hover:border-white/20 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <span
                    className="font-serif text-4xl sm:text-5xl leading-none shrink-0"
                    style={{ color: goal.color }}
                  >
                    {goal.id}
                  </span>
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#a7aca2] mb-1">
                      SDG {goal.id}
                    </p>
                    <h3 className="font-serif text-xl text-[#f3f1eb] leading-tight">{goal.title}</h3>
                    <p className="font-sans text-sm text-[#c8cdc4] mt-3 leading-relaxed">{goal.summary}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* INSTITUTIONAL ALIGNMENT */}
      <section className="relative z-30 py-20 sm:py-28 px-5 sm:px-8 isolate bg-[#151c18] border-t border-white/10">
        <motion.div className="relative max-w-7xl mx-auto xl:pr-10" {...fade}>
          <p className="font-mono text-[10px] tracking-[0.3em] text-[#a7aca2] uppercase mb-3">
            Institutional context
          </p>
          <h2 className="font-serif text-2xl sm:text-3xl text-[#f3f1eb] leading-[0.95] tracking-tight max-w-2xl">
            Aligned with the actors who define disaster response—not endorsed by them.
          </h2>
          <p className="font-sans text-sm text-[#a7aca2] mt-4 max-w-2xl leading-relaxed">
            AlgoVault is independent testnet infrastructure. These links are reference frameworks for loss &amp; damage,
            humanitarian coordination, and rights in crisis.
          </p>

          <ul className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {INSTITUTIONAL_LINKS.map((org) => (
              <li key={org.abbr}>
                <a
                  href={org.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-col h-full rounded-xl border border-white/10 bg-[#151917] px-4 py-4 hover:border-[#506a5a]/50 hover:bg-[#151917]/80 transition-colors"
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-mono text-sm font-medium text-[#8fb39a]">{org.abbr}</span>
                    <ExternalLink size={14} className="text-[#6b736d] group-hover:text-[#a7aca2] shrink-0" />
                  </span>
                  <span className="font-sans text-xs text-[#c8cdc4] mt-2 leading-snug">{org.name}</span>
                </a>
              </li>
            ))}
          </ul>
        </motion.div>
      </section>

      <footer className="relative z-30 py-12 border-t border-white/10 bg-[#151c18] px-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#a7aca2] text-center">
          Institutional disaster disbursement · Algorand testnet
        </p>
        <p className="font-mono text-[9px] text-[#6b736d] text-center max-w-3xl mx-auto mt-3 leading-relaxed">
          Imagery: Wikimedia Commons — PIB India, US DoD, Oxfam (CC BY 2.0), NASA, ESA/Copernicus (CC BY-SA 3.0 IGO).
        </p>
      </footer>
    </div>
  )
}
