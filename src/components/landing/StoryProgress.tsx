import { motion, useScroll, useSpring } from 'framer-motion'

export function ScrollProgressBar() {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 28, restDelta: 0.001 })

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-[3px] z-[80] origin-left pointer-events-none"
      style={{
        scaleX,
        background: 'linear-gradient(90deg, #7c3b35 0%, #8b5a3c 35%, #506a5a 70%, #5f7968 100%)',
      }}
    />
  )
}

/** Minimal scroll indicator — avoids overlapping chapter text on the right */
export function StoryRail() {
  const { scrollYProgress } = useScroll()
  const scaleY = useSpring(scrollYProgress, { stiffness: 120, damping: 28, restDelta: 0.001 })

  return (
    <div
      className="fixed right-3 top-1/2 -translate-y-1/2 z-[40] hidden xl:block w-1 h-32 rounded-full bg-white/10 overflow-hidden pointer-events-none"
      aria-hidden
    >
      <motion.div
        className="w-full h-full origin-top bg-gradient-to-b from-[#7c3b35] via-[#506a5a] to-[#5f7968]"
        style={{ scaleY }}
      />
    </div>
  )
}
