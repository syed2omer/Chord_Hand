import { AnimatePresence, motion } from 'framer-motion'

export default function ChordDisplay({ chord, gestureLabel, next }: { chord: string; gestureLabel?: string; next?: string }) {
  return (
    <div className="flex items-start justify-between gap-6">
      <div>
        <p className="text-sm text-cream-dim">Play this chord</p>
        <div className="h-[8.5rem] overflow-hidden" aria-live="polite" aria-atomic="true">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={chord}
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -24, opacity: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="font-display text-[8rem] leading-[1] tracking-tight"
            >
              {chord}
            </motion.div>
          </AnimatePresence>
        </div>
        {gestureLabel && <p className="mt-1 text-cream-dim">Show: <span className="text-cream">{gestureLabel}</span></p>}
      </div>
      <div className="text-right">
        <p className="text-sm text-cream-dim">Next</p>
        <p className="font-display text-6xl leading-none text-gold" aria-label={`Next chord ${next ?? 'none'}`}>{next ?? '–'}</p>
      </div>
    </div>
  )
}
