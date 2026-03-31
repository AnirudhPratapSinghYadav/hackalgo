interface Milestone {
  label: string
  threshold: number
  icon: string
}

interface Props {
  savedAlgo: number
  milestones?: Milestone[]
  currentMilestone?: number
  compact?: boolean
  variant?: 'personal' | 'guardian' | 'community'
}

const DEFAULT_MILESTONES: Milestone[] = [
  { label: 'Vault Starter', threshold: 10, icon: '\u{1F949}' },
  { label: 'Vault Builder', threshold: 50, icon: '\u{1F948}' },
  { label: 'Vault Master', threshold: 100, icon: '\u{1F947}' },
]

export default function ProgressJourney({
  savedAlgo,
  milestones = DEFAULT_MILESTONES,
  currentMilestone = 0,
  compact = false,
  variant = 'personal',
}: Props) {
  const maxThreshold = milestones[milestones.length - 1]?.threshold ?? 100
  const progressPct = Math.min(100, (savedAlgo / maxThreshold) * 100)
  const isActive = savedAlgo > 0
  const isComplete = progressPct >= 100
  const nearMilestone = !isComplete && milestones.some((m) => savedAlgo < m.threshold && savedAlgo >= m.threshold * 0.9)

  const theme = (() => {
    if (variant === 'community') {
      return {
        bg: 'from-emerald-950 via-[#06281f] to-teal-950',
        fill: 'from-emerald-400 via-teal-400 to-emerald-300',
        glow: 'bg-emerald-500/18',
        activeNode: 'from-emerald-500 to-teal-600 border-emerald-300/50 shadow-emerald-500/30',
        approachingBorder: 'border-emerald-400/30 shadow-emerald-500/20',
        activeLabel: 'text-emerald-300',
        avatarTone: 'from-emerald-300 to-teal-400',
        title: 'Reserve Journey',
        accentText: 'text-emerald-200',
      }
    }
    if (variant === 'guardian') {
      return {
        bg: 'from-blue-950 via-[#0a1636] to-violet-950',
        fill: 'from-blue-400 via-violet-400 to-cyan-300',
        glow: 'bg-blue-500/18',
        activeNode: 'from-blue-500 to-violet-600 border-blue-300/50 shadow-blue-500/30',
        approachingBorder: 'border-blue-400/30 shadow-blue-500/20',
        activeLabel: 'text-blue-300',
        avatarTone: 'from-blue-300 to-violet-400',
        title: 'Guardian Journey',
        accentText: 'text-blue-200',
      }
    }
    return {
      bg: 'from-gray-900 via-[#111827] to-[#1e1b4b]',
      fill: 'from-blue-500 via-violet-500 to-blue-400',
      glow: 'bg-blue-500/20',
      activeNode: 'from-blue-500 to-violet-600 border-blue-400/50 shadow-blue-500/30',
      approachingBorder: 'border-blue-400/30 shadow-blue-500/20',
      activeLabel: 'text-blue-400',
      avatarTone: 'from-blue-300 to-violet-400',
      title: 'Your Savings Journey',
      accentText: 'text-white/80',
    }
  })()

  return (
    <div className={`relative bg-gradient-to-br ${theme.bg} rounded-2xl overflow-hidden ${compact ? 'p-4 sm:p-5' : 'p-5 sm:p-7'}`}>
      {/* Background grid */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '24px 24px' }}
      />

      {/* Ambient glow behind avatar */}
      <div
        className={`absolute top-1/2 -translate-y-1/2 w-24 h-24 ${theme.glow} rounded-full blur-[40px] transition-all duration-1000 pointer-events-none`}
        style={{ left: `calc(${Math.max(4, progressPct)}% - 56px)` }}
      />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between mb-5">
        <h3 className={`text-white font-bold ${compact ? 'text-sm' : 'text-base sm:text-lg'}`}>
          {theme.title}
        </h3>
        <div className="text-right">
          <p className="text-xs text-white/40 font-mono">
            {savedAlgo.toFixed(2)} / {maxThreshold} ALGO
          </p>
          <p className={`text-[10px] ${theme.accentText}`}>
            {isComplete ? 'Milestones completed' : nearMilestone ? 'Approaching milestone' : isActive ? 'In progress' : 'Not started'}
          </p>
        </div>
      </div>

      {/* Journey Road */}
      <div className="relative z-10" style={{ perspective: '600px' }}>
        <div
          className={`relative ${compact ? 'h-28 sm:h-32' : 'h-40 sm:h-44'}`}
          style={{ transform: 'rotateX(4deg)', transformOrigin: 'center bottom' }}
        >
          {/* Road shadow */}
          <div className="absolute top-[58%] left-2 right-2 h-10 bg-black/30 rounded-full blur-md" />

          {/* Road track */}
          <div className="absolute top-1/2 left-0 right-0 h-4 -translate-y-1/2 bg-white/[0.07] rounded-full border border-white/[0.05]">
            {/* Progress fill */}
            <div
              className={`h-full bg-gradient-to-r ${theme.fill} rounded-full transition-all duration-1000 ease-out relative`}
              style={{ width: `${progressPct}%` }}
            >
              <div className="absolute inset-0 progress-shimmer rounded-full" />
            </div>
          </div>

          {/* Step plates (premium "road segments") */}
          <div className="absolute top-1/2 left-2 right-2 -translate-y-1/2 flex items-center justify-between opacity-60">
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className="h-7 w-8 sm:w-10 rounded-xl bg-white/[0.05] border border-white/[0.05]"
                style={{ transform: `skewX(-10deg) translateY(${i % 2 === 0 ? 0 : 2}px)` }}
              />
            ))}
          </div>

          {/* Milestone nodes */}
          {milestones.map((m, i) => {
            const pos = (m.threshold / maxThreshold) * 100
            const reached = currentMilestone > i
            const active = currentMilestone === i && savedAlgo >= m.threshold
            const approaching = !reached && !active && savedAlgo >= m.threshold * 0.8
            const scale = 1 + (1 - pos / 100) * 0.06

            return (
              <div
                key={i}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-all duration-500"
                style={{ left: `${pos}%`, transform: `translateY(-50%) translateX(-50%) scale(${scale})` }}
              >
                <div
                  className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center transition-all duration-500 border-2 ${
                    reached
                      ? 'bg-gradient-to-br from-amber-400 to-orange-500 border-amber-300/50 shadow-lg shadow-amber-500/30'
                      : active
                        ? `bg-gradient-to-br ${theme.activeNode} shadow-lg animate-pulse`
                        : approaching
                          ? `bg-gray-700 ${theme.approachingBorder} shadow-md`
                          : 'bg-gray-800 border-gray-600'
                  }`}
                >
                  <span className={`${compact ? 'text-base' : 'text-lg sm:text-2xl'}`}>
                    {reached || active ? m.icon : '\u{1F512}'}
                  </span>
                </div>

                {/* Label */}
                <div className="absolute top-full mt-1.5 sm:mt-2 left-1/2 -translate-x-1/2 whitespace-nowrap text-center">
                  <p className={`font-bold ${compact ? 'text-[9px]' : 'text-[10px] sm:text-xs'} ${
                    reached ? 'text-amber-400' : active ? theme.activeLabel : 'text-white/30'
                  }`}>
                    {m.label}
                  </p>
                  <p className={`${compact ? 'text-[8px]' : 'text-[9px] sm:text-[10px]'} text-white/20`}>
                    {m.threshold} ALGO
                  </p>
                </div>
              </div>
            )
          })}

          {/* Avatar */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 transition-all duration-1000 ease-out"
            style={{ left: `${Math.max(3, progressPct)}%` }}
          >
            <div className="relative">
              {/* character shadow */}
              <div className="absolute left-1/2 top-[70%] -translate-x-1/2 w-14 sm:w-16 h-4 bg-black/40 blur-md rounded-full" />

              <div
                className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-[26px] flex items-center justify-center shadow-2xl border transition-all tilt-hover ${
                  isActive
                    ? `bg-gradient-to-br ${theme.avatarTone} border-white/40 ${isComplete ? '' : 'avatar-bounce'}`
                    : 'bg-gray-700 border-gray-500 shadow-gray-900/40'
                }`}
              >
                <RoadCharacter state={isComplete ? 'complete' : nearMilestone ? 'near' : isActive ? 'walk' : 'idle'} />
              </div>
            </div>
            {/* Trail particles when active */}
            {isActive && (
              <div className="absolute -left-1 top-1/2 -translate-y-1/2 flex gap-0.5">
                <span className={`w-1.5 h-1.5 rounded-full ${variant === 'community' ? 'bg-emerald-300/60' : variant === 'guardian' ? 'bg-blue-300/60' : 'bg-blue-400/60'} animate-ping`} style={{ animationDuration: '1.5s' }} />
                <span className={`w-1 h-1 rounded-full ${variant === 'community' ? 'bg-teal-200/40' : variant === 'guardian' ? 'bg-violet-300/40' : 'bg-violet-400/40'} animate-ping`} style={{ animationDuration: '2s', animationDelay: '0.3s' }} />
              </div>
            )}
          </div>

          {/* Start node */}
          <div className="absolute top-1/2 left-0 -translate-y-1/2 w-5 h-5 rounded-full bg-gray-700 border-2 border-gray-500 flex items-center justify-center">
            <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-400' : 'bg-gray-500'}`} />
          </div>
        </div>
      </div>

      {/* Bottom stats */}
      <div className="relative z-10 flex items-center justify-between mt-4 sm:mt-6 pt-4 border-t border-white/[0.06]">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-400 animate-pulse' : 'bg-gray-600'}`} />
          <span className="text-xs text-white/40">
            {progressPct >= 100
              ? 'All milestones achieved!'
              : isActive
                ? `${progressPct.toFixed(0)}% to final milestone`
                : 'Make your first deposit to begin'}
          </span>
        </div>
        {currentMilestone > 0 && (
          <span className="text-xs text-amber-400 font-semibold">
            {currentMilestone} badge{currentMilestone > 1 ? 's' : ''} earned
          </span>
        )}
      </div>
    </div>
  )
}

function RoadCharacter({ state }: { state: 'idle' | 'walk' | 'near' | 'complete' }) {
  const face =
    state === 'complete' ? '😄' : state === 'near' ? '😮' : state === 'walk' ? '🙂' : '😐'
  const badge =
    state === 'complete' ? '🏁' : state === 'near' ? '⭐' : state === 'walk' ? '👣' : '•'

  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="relative w-full h-full flex items-center justify-center">
        <div className="absolute top-3 right-3 text-xs sm:text-sm bg-white/15 border border-white/20 rounded-full px-2 py-0.5">
          {badge}
        </div>
        <div className={`text-2xl sm:text-3xl ${state === 'walk' ? 'animate-pulse' : ''}`}>
          {face}
        </div>
      </div>
    </div>
  )
}
