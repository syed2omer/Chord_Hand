import { useState } from 'react'
import CameraView from '../components/CameraView'
import { datasetAdvice, MIN_PER_CLASS } from '../features/train/dataset'
import { GESTURE_CLASSES, GESTURE_HELP, type GestureClass } from '../features/gesture/gestureTypes'
import { useRecorder } from '../features/train/useRecorder'

export default function Train() {
  const r = useRecorder()
  const [label, setLabel] = useState<GestureClass>('GESTURE_1')
  const busy = r.phase !== 'idle'
  const total = GESTURE_CLASSES.reduce((n, c) => n + r.counts[c].total, 0)
  const advice = datasetAdvice(r.counts)
  const help = GESTURE_HELP[label]

  return (
    <div className="py-4">
      <h1 className="font-display text-6xl">Train the model</h1>
      <p className="mt-2 max-w-2xl text-cream-dim">
        Record each gesture with both hands, at a few distances and angles. Samples are stored in this browser only.
        Export them when you are done and train with the script in <code className="text-cream">ml/</code>.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <CameraView onHands={r.onHands} />
          <p className="mt-3 min-h-6 text-sm" role="status" aria-live="polite">
            {r.phase === 'countdown' && <span className="text-gold">Get ready: {r.countdown}</span>}
            {r.phase === 'recording' && !r.hint && <span className="text-ok">Recording {GESTURE_HELP[label].title}: {r.takeCount} of {r.maxPerTake}</span>}
            {r.phase === 'recording' && r.hint && <span className="text-err">{r.hint} Paused.</span>}
          </p>
        </div>

        <section aria-label="Gesture recorder" className="rounded-2xl border border-cream/10 bg-teal-card p-6">
          <div role="radiogroup" aria-label="Gesture to record" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {GESTURE_CLASSES.map((c) => {
              const x = r.counts[c]
              const on = c === label
              return (
                <button key={c} role="radio" aria-checked={on} disabled={busy} onClick={() => setLabel(c)}
                  className={`rounded-xl border px-2 py-3 text-center disabled:opacity-60 ${on ? 'border-2 border-gold bg-teal-raised' : 'border-transparent bg-teal-raised/60 hover:bg-teal-raised'}`}>
                  <span className="block text-sm">{GESTURE_HELP[c].title}</span>
                  <span className={`block font-display text-2xl leading-tight ${x.total >= MIN_PER_CLASS ? 'text-ok' : 'text-cream'}`}>{x.total}</span>
                </button>
              )
            })}
          </div>

          <h2 className="mt-6 font-display text-4xl">{help.title}</h2>
          <p className="mt-1 text-cream-dim">{help.how}</p>

          <div className="mt-5 flex flex-wrap gap-3">
            {busy ? (
              <button onClick={() => void r.stop()} className="rounded-full bg-err px-6 py-2.5 font-medium text-teal-deep">Stop and save take</button>
            ) : (
              <button onClick={() => r.start(label)} className="rounded-full bg-gold px-6 py-2.5 font-medium text-fret hover:brightness-110">Record a take</button>
            )}
            <button onClick={() => void r.removeLabel(label)} disabled={busy || !r.counts[label].total}
              className="rounded-full border border-cream/25 px-4 py-2.5 text-sm hover:bg-teal-raised disabled:opacity-40">
              Delete {help.title.toLowerCase()} samples
            </button>
          </div>
          <p className="mt-2 text-xs text-cream-dim">A take records up to {r.maxPerTake} samples, about 15 seconds. Slowly move and tilt your hand during the take.</p>

          {r.storageError && <p role="alert" className="mt-4 text-sm text-err">{r.storageError}</p>}
        </section>
      </div>

      <section aria-label="Dataset" className="mt-6 rounded-2xl border border-cream/10 bg-teal-card p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-4xl">Dataset</h2>
            <p className="text-cream-dim">{total} samples across {GESTURE_CLASSES.filter((c) => r.counts[c].total).length} of {GESTURE_CLASSES.length} classes</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => void r.exportData()} disabled={!total}
              className="rounded-full bg-gold px-5 py-2.5 font-medium text-fret hover:brightness-110 disabled:opacity-40">Export dataset</button>
            <button onClick={() => { if (window.confirm('Delete every recorded sample? This can’t be undone.')) void r.removeAll() }} disabled={busy || !total}
              className="rounded-full border border-cream/25 px-4 py-2.5 text-sm hover:bg-teal-raised disabled:opacity-40">Delete all</button>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[28rem] text-left text-sm">
            <caption className="sr-only">Samples per gesture, split by hand</caption>
            <thead className="text-cream-dim">
              <tr><th className="py-2 font-normal">Gesture</th><th className="font-normal">Samples</th><th className="font-normal">Left hand</th><th className="font-normal">Right hand</th><th className="font-normal">Takes</th></tr>
            </thead>
            <tbody>
              {GESTURE_CLASSES.map((c) => {
                const x = r.counts[c]
                return (
                  <tr key={c} className="border-t border-cream/10">
                    <th scope="row" className="py-2 font-normal">{GESTURE_HELP[c].title}</th>
                    <td className="tabular-nums">{x.total}</td><td className="tabular-nums">{x.left}</td><td className="tabular-nums">{x.right}</td><td className="tabular-nums">{x.takes}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {advice.length > 0 && total > 0 && (
          <div className="mt-5">
            <p className="text-sm text-cream-dim">Before you train:</p>
            <ul className="mt-1 list-disc pl-5 text-sm">{advice.slice(0, 6).map((a) => <li key={a}>{a}</li>)}</ul>
          </div>
        )}
      </section>
    </div>
  )
}
