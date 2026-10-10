import { useMemo, useState } from 'react'
import ChordDiagram from '../components/ChordDiagram'
import { getVoicing } from '../features/engine/chordLibrary'

const STARTER = ['G', 'D', 'Em', 'C']
const CHORDS = ['C', 'G', 'D', 'A', 'E', 'F', 'Am', 'Em', 'Dm', 'Ab', 'Fm', 'Db', 'Eb']

export default function Learn() {
  const [chord, setChord] = useState('G')
  const [step, setStep] = useState(0)
  const voicing = useMemo(() => getVoicing(chord), [chord])
  const shape = voicing?.frets.map((f) => f < 0 ? 'x' : f === 0 ? '0' : String(f)).join(' ')

  return (
    <div className="py-6">
      <header className="max-w-3xl">
        <p className="text-xs uppercase tracking-[.22em] text-gold">Real guitar practice</p>
        <h1 className="mt-2 font-display text-6xl">Learn guitar</h1>
        <p className="mt-3 text-cream-dim">A separate space for your real guitar. Choose a chord, follow the fingering diagram, then practise a simple four-chord change at your own pace.</p>
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <section className="rounded-2xl border border-cream/10 bg-teal-card p-6" aria-labelledby="chord-picker-title">
          <h2 id="chord-picker-title" className="font-display text-3xl">Explore a chord</h2>
          <label className="mt-4 block text-sm text-cream-dim" htmlFor="learn-chord">Chord</label>
          <select id="learn-chord" value={chord} onChange={(e) => setChord(e.target.value)} className="mt-2 w-full rounded-xl border border-cream/20 bg-teal-deep px-4 py-3">
            {CHORDS.map((name) => <option key={name}>{name}</option>)}
          </select>
          <div className="mt-4 flex min-h-64 items-center justify-center rounded-xl bg-teal-deep/60 p-3">
            <ChordDiagram chord={chord} className="h-60" />
          </div>
          <p className="mt-3 text-sm text-cream-dim">String order, low to high: <span className="font-mono text-cream">{shape}</span></p>
          <p className="mt-2 text-xs text-cream-dim">Numbers show frets; 0 means open and x means don’t play that string. Use the numbered dots to place your fingers.</p>
        </section>

        <section className="rounded-2xl border border-cream/10 bg-teal-card p-6" aria-labelledby="practice-title">
          <p className="text-xs uppercase tracking-[.22em] text-gold">Beginner exercise</p>
          <h2 id="practice-title" className="mt-2 font-display text-3xl">Four-chord changes</h2>
          <p className="mt-2 text-sm text-cream-dim">Settle each shape, strum once, then move to the next. Keep your wrist relaxed and aim for a clear note on every fretted string.</p>
          <div className="mt-7 grid grid-cols-4 gap-2" aria-label={`Chord ${step + 1} of ${STARTER.length}`}>
            {STARTER.map((name, i) => <button key={name} onClick={() => { setStep(i); setChord(name) }} aria-current={i === step ? 'step' : undefined}
              className={`rounded-xl border p-3 text-center transition-colors ${i === step ? 'border-gold bg-teal-raised text-gold' : 'border-cream/15 text-cream-dim hover:text-cream'}`}>
              <span className="block font-display text-3xl">{name}</span><span className="text-xs">{i + 1}</span>
            </button>)}
          </div>
          <div className="mt-6 rounded-xl border border-cream/10 p-5">
            <p className="text-sm text-cream-dim">Now practise</p>
            <p className="mt-1 font-display text-6xl">{STARTER[step]}</p>
            <p className="mt-2 font-mono text-sm text-gold">D  D  D  D</p>
          </div>
          <div className="mt-5 flex items-center justify-between gap-3">
            <button onClick={() => { const n = (step + STARTER.length - 1) % STARTER.length; setStep(n); setChord(STARTER[n]) }} className="rounded-full border border-cream/25 px-5 py-2 hover:bg-teal-raised">Previous</button>
            <span className="text-sm text-cream-dim">{step + 1} / {STARTER.length}</span>
            <button onClick={() => { const n = (step + 1) % STARTER.length; setStep(n); setChord(STARTER[n]) }} className="rounded-full bg-gold px-5 py-2 font-medium text-fret hover:brightness-110">Next chord</button>
          </div>
        </section>
      </div>
      <p className="mt-6 text-sm text-cream-dim">This learning page is for physical guitar practice; the song player’s camera mode is for air-hand gestures and virtual guitar.</p>
    </div>
  )
}
