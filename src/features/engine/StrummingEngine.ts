import type { StrumStep } from '../songs/schema'

export interface StrumHit { offset: number; direction: 'D' | 'U'; step: number }

export const stepSeconds = (tempo: number, stepsPerBeat: number) => 60 / tempo / stepsPerBeat

/**
 * The hits for one chord: the pattern repeats from its first step until the chord's length runs out.
 * `-` is a rest. Offsets are seconds from the chord's start.
 */
export function strumSchedule(steps: StrumStep[], tempo: number, stepsPerBeat: number, durationBeats: number): StrumHit[] {
  if (!steps.length) return []
  const total = Math.round(durationBeats * stepsPerBeat)
  const dt = stepSeconds(tempo, stepsPerBeat)
  const hits: StrumHit[] = []
  for (let i = 0; i < total; i++) {
    const s = steps[i % steps.length]
    if (s !== '-') hits.push({ offset: i * dt, direction: s, step: i % steps.length })
  }
  return hits
}

/** Parses typed patterns like "D D U U D U" or "D - D U - U" (also "DDUUDU", "down up"). */
export function parseStrumPattern(text: string): { steps: StrumStep[] } | { error: string } {
  const tokens = text.trim().toUpperCase().split(/[\s,]+/).filter(Boolean)
    .flatMap((t) => (/^[DU-]+$/.test(t) ? t.split('') : [t]))
    .map((t) => (t === 'DOWN' ? 'D' : t === 'UP' ? 'U' : t === 'REST' ? '-' : t))
  if (!tokens.length) return { error: 'Enter a strumming pattern, like D D U U D U.' }
  const bad = tokens.find((t) => t !== 'D' && t !== 'U' && t !== '-')
  if (bad) return { error: `“${bad}” isn’t a strum. Use D (down), U (up) or - (rest).` }
  if (tokens.length > 32) return { error: 'That pattern is too long. Keep it to 32 steps or fewer.' }
  if (!tokens.some((t) => t !== '-')) return { error: 'A pattern needs at least one down or up strum.' }
  return { steps: tokens as StrumStep[] }
}
