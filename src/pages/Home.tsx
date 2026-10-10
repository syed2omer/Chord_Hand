import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import HandMark from '../components/HandMark'

const DEMO = ['G', 'D', 'Em', 'C']

export default function Home() {
  const [i, setI] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % DEMO.length), 2400)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="grid items-center gap-12 py-10 lg:grid-cols-[1.1fr_1fr] lg:py-20">
      <div>
        <h1 className="font-display text-[clamp(4.5rem,13vw,10rem)] leading-[0.88] tracking-tight">
          Chord<br />Hand
        </h1>
        <p className="mt-6 max-w-md font-display text-3xl italic text-cream-dim">Turn your hands into a guitar.</p>
        <p className="mt-5 max-w-md text-cream-dim">
          Pick a song and show a gesture to your webcam. Chord Hand plays the chord and strums for you while you sing.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/songs" className="rounded-full bg-gold px-7 py-3 font-medium text-fret hover:brightness-110">Play a song</Link>
          <Link to="/learn" className="rounded-full border border-cream/30 px-7 py-3 font-medium hover:bg-teal-raised">Learn guitar</Link>
        </div>
      </div>

      <div className="rounded-3xl border border-cream/10 bg-teal-card p-8">
        <div className="mx-auto h-64"><HandMark animate className="mx-auto h-full" /></div>
        <div className="mt-4 flex items-end justify-center gap-6">
          <span className="text-cream-dim" aria-hidden="true">↓</span>
          <div className="h-24 w-28 overflow-hidden text-center" aria-live="off">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div key={DEMO[i]} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }}
                transition={{ duration: 0.25 }} className="font-display text-8xl leading-none">
                {DEMO[i]}
              </motion.div>
            </AnimatePresence>
          </div>
          <span className="pb-3 text-2xl text-gold" aria-hidden="true">♪ ♪ ♪</span>
        </div>
      </div>
    </div>
  )
}
