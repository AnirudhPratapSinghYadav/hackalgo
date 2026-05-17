import { motion } from 'framer-motion'

type ActDividerProps = {
  act: string
  roman: string
  title: string
  subtitle: string
  variant: 'crisis' | 'turn' | 'resolve'
}

const variantStyles = {
  crisis: {
    gradient: 'from-[#1a1210] via-[#151c18] to-[#151c18]',
    accent: 'text-[#e8b4ae]',
    glow: 'bg-[#7c3b35]/15',
  },
  turn: {
    gradient: 'from-[#151c18] via-[#1a2620] to-[#151c18]',
    accent: 'text-[#d4bc8a]',
    glow: 'bg-[#8b6914]/12',
  },
  resolve: {
    gradient: 'from-[#121a16] via-[#1a2620] to-[#151c18]',
    accent: 'text-[#8fb39a]',
    glow: 'bg-[#506a5a]/15',
  },
}

export default function ActDivider({ act, roman, title, subtitle, variant }: ActDividerProps) {
  const v = variantStyles[variant]

  return (
    <section className={`relative z-30 py-24 sm:py-32 overflow-hidden isolate bg-gradient-to-b ${v.gradient}`}>
      <div
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(90vw,520px)] h-48 rounded-full blur-[100px] landing-orb ${v.glow}`}
        aria-hidden
      />

      <motion.div
        className="relative max-w-7xl mx-auto px-6 sm:px-10 lg:pr-16"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-10">
          <span
            className="font-serif text-[5rem] sm:text-[7rem] leading-none text-white/[0.07] select-none shrink-0"
            aria-hidden
          >
            {roman}
          </span>
          <div className="pb-3 border-b border-white/15 flex-1 min-w-0">
            <p className={`font-mono text-[10px] tracking-[0.35em] uppercase mb-2 ${v.accent}`}>{act}</p>
            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-[#f3f1eb] leading-[0.95] tracking-tight">
              {title}
            </h2>
            <p className="font-sans text-sm sm:text-base text-[#c8cdc4] mt-3 max-w-xl leading-relaxed">{subtitle}</p>
</div>
        </div>
      </motion.div>
    </section>
  )
}
