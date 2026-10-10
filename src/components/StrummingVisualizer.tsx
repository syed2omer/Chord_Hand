import type { StrumStep } from '../features/songs/schema'

const LABEL: Record<StrumStep, string> = { D: 'Down', U: 'Up', '-': 'Rest' }

export default function StrummingVisualizer({ steps, activeStep }: { steps: StrumStep[]; activeStep?: number }) {
  return (
    <ol className="flex gap-2" aria-label="Strumming pattern">
      {steps.map((s, i) => (
        <li key={i} aria-label={LABEL[s]}
          className={`grid h-11 w-9 place-items-center rounded-lg text-lg ${i === activeStep ? 'bg-gold text-fret' : 'bg-teal-raised text-cream'}`}>
          <span aria-hidden="true">{s === 'D' ? '↓' : s === 'U' ? '↑' : '·'}</span>
        </li>
      ))}
    </ol>
  )
}
