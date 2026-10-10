import { getVoicing } from '../features/engine/chordLibrary'

const X0 = 34, STRING_GAP = 30, Y0 = 44, FRET_GAP = 40, FRETS = 5
const sx = (s: number) => X0 + s * STRING_GAP
const fy = (f: number) => Y0 + (f - 0.5) * FRET_GAP

/** One renderer for every chord, driven entirely by voicing data. */
export default function ChordDiagram({ chord, className = '' }: { chord: string; className?: string }) {
  const v = getVoicing(chord)
  if (!v) {
    return (
      <p role="status" className="text-err text-sm">
        No diagram for “{chord}” yet.
      </p>
    )
  }
  const width = X0 * 2 + STRING_GAP * 5
  const height = Y0 + FRETS * FRET_GAP + 16
  const desc = v.frets
    .map((f, i) => `string ${6 - i} ${f < 0 ? 'muted' : f === 0 ? 'open' : `fret ${f}`}`)
    .join(', ')

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={className} role="img" aria-label={`${v.name} chord diagram: ${desc}`}>
      <rect x={X0 - 14} y={Y0 - 4} width={STRING_GAP * 5 + 28} height={FRETS * FRET_GAP + 8} rx={10} fill="var(--color-fret)" />
      {/* open / muted markers */}
      {v.frets.map((f, s) =>
        f === 0 ? (
          <circle key={s} cx={sx(s)} cy={Y0 - 22} r={6} stroke="var(--color-cream)" strokeWidth={2} fill="none" />
        ) : f < 0 ? (
          <path key={s} d={`M${sx(s) - 5} ${Y0 - 27} l10 10 m0 -10 l-10 10`} stroke="var(--color-cream-dim)" strokeWidth={2} strokeLinecap="round" />
        ) : null,
      )}
      {/* frets */}
      {Array.from({ length: FRETS + 1 }, (_, i) => (
        <line key={i} x1={sx(0)} x2={sx(5)} y1={Y0 + i * FRET_GAP} y2={Y0 + i * FRET_GAP}
          stroke="var(--color-cream)" strokeWidth={i === 0 ? 5 : 1} opacity={i === 0 ? 1 : 0.7} />
      ))}
      {/* strings */}
      {Array.from({ length: 6 }, (_, s) => (
        <line key={s} x1={sx(s)} x2={sx(s)} y1={Y0} y2={Y0 + FRETS * FRET_GAP}
          stroke="var(--color-cream)" strokeWidth={1.4} opacity={0.9} />
      ))}
      {v.barre && (
        <rect x={sx(v.barre.fromString) - 9} y={fy(v.barre.fret) - 9}
          width={sx(v.barre.toString) - sx(v.barre.fromString) + 18} height={18} rx={9} fill="var(--color-gold)" />
      )}
      {v.frets.map((f, s) =>
        f > 0 && !(v.barre && f === v.barre.fret) ? (
          <g key={s}>
            <circle cx={sx(s)} cy={fy(f)} r={11} fill="var(--color-gold)" />
            {v.fingers[s] > 0 && (
              <text x={sx(s)} y={fy(f) + 4.5} textAnchor="middle" fontSize={13} fontWeight={600} fill="var(--color-fret)">
                {v.fingers[s]}
              </text>
            )}
          </g>
        ) : null,
      )}
    </svg>
  )
}
