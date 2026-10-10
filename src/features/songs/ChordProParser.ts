import { isSupportedChord } from '../engine/chordLibrary'
import { parseStrumPattern } from '../engine/StrummingEngine'
import {
  MUTE, type ChordName, type Difficulty, type GestureId, type LyricSegment, type Song, type SongSection, type StrumStep,
} from './schema'

export interface ParseIssue { line: number; message: string }
export interface ParseResult { song?: Song; errors: ParseIssue[]; warnings: ParseIssue[] }

export const LIMITS = { maxChars: 100_000, maxLines: 600 }

const CHORD_ALIASES: Record<string, string> = { Cmaj: 'C', Gmaj: 'G', Fmaj: 'F', Dmaj: 'D', Amin: 'Am', Emin: 'Em', Cmajor: 'C', Gmajor: 'G', Fmajor: 'F', Dmajor: 'D', Aminor: 'Am', Eminor: 'Em' }
const AUTO_GESTURES: GestureId[] = ['GESTURE_1', 'GESTURE_2', 'GESTURE_3', 'GESTURE_4', 'GESTURE_5', 'GESTURE_THUMB']
const GESTURE_KEYS: Record<string, GestureId> = {
  '0': 'GESTURE_0', '1': 'GESTURE_1', '2': 'GESTURE_2', '3': 'GESTURE_3', '4': 'GESTURE_4', '5': 'GESTURE_5', t: 'GESTURE_THUMB', thumb: 'GESTURE_THUMB',
}
const DEFAULT_PATTERN: Record<string, StrumStep[]> = {
  simple4: ['D', '-', 'D', 'U', '-', 'U', 'D', 'U'],
  simple3: ['D', '-', 'D', 'U', 'D', 'U'],
  compound: ['D', '-', 'D', 'U', '-', 'U'],
}

export function normalizeChord(raw: string): string {
  const t = raw.trim()
  const fixed = t.charAt(0).toUpperCase() + t.slice(1)
  return CHORD_ALIASES[fixed] ?? fixed
}

/** Beats per chord and steps per beat from a time signature like 4/4, 3/4, 6/8, 12/8. */
export function timeSignatureDefaults(ts: string) {
  const [num, den] = ts.split('/').map(Number)
  if (den === 8 && num % 3 === 0) return { beatsPerChord: num / 3, stepsPerBeat: 3, pattern: DEFAULT_PATTERN.compound }
  if (num === 3) return { beatsPerChord: 3, stepsPerBeat: 2, pattern: DEFAULT_PATTERN.simple3 }
  return { beatsPerChord: num, stepsPerBeat: 2, pattern: DEFAULT_PATTERN.simple4 }
}

const DIRECTIVE = /^\{\s*([a-z_]+)\s*(?::\s*(.*?))?\s*\}$/i
const SECTION_START = new Set(['start_of_verse', 'sov', 'start_of_chorus', 'soc', 'start_of_bridge', 'sob', 'start_of_part'])
const SECTION_END = new Set(['end_of_verse', 'eov', 'end_of_chorus', 'eoc', 'end_of_bridge', 'eob', 'end_of_part'])
const DEFAULT_SECTION_NAME: Record<string, string> = { sov: 'Verse', start_of_verse: 'Verse', soc: 'Chorus', start_of_chorus: 'Chorus', sob: 'Bridge', start_of_bridge: 'Bridge' }

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'song'

/** Splits "[G]Hello [D]world" into chord-plus-text segments. */
function parseLyricLine(line: string, lineNo: number, errors: ParseIssue[]): LyricSegment[] {
  const matches = [...line.matchAll(/\[([^\]]*)\]/g)]
  const segs: LyricSegment[] = []
  const lead = line.slice(0, matches[0]?.index ?? line.length)
  if (lead) segs.push({ text: lead })
  const reported = new Set<string>()
  matches.forEach((m, i) => {
    const end = matches[i + 1]?.index ?? line.length
    const text = line.slice(m.index! + m[0].length, end)
    const chord = normalizeChord(m[1])
    if (!m[1].trim()) { errors.push({ line: lineNo, message: 'There is an empty chord, [ ]. Put a chord name inside the brackets.' }); return }
    if (!isSupportedChord(chord) && !reported.has(chord)) {
      reported.add(chord)
      errors.push({ line: lineNo, message: `Chord “${m[1].trim()}” isn’t supported yet. Use a chromatic major/minor chord or a common 7, maj7, m7, sus2, sus4, dim, aug, 6, m6, or add9 chord.` })
    }
    segs.push({ chord, text })
  })
  return segs
}

export function parseChordPro(input: string): ParseResult {
  const errors: ParseIssue[] = []
  const warnings: ParseIssue[] = []
  const fail = (message: string): ParseResult => ({ errors: [{ line: 0, message }, ...errors], warnings })

  if (!input.trim()) return fail('There is nothing to import. Paste a ChordPro chord sheet or choose a file.')
  if (input.length > LIMITS.maxChars) return fail(`This file is too long. The limit is ${LIMITS.maxChars.toLocaleString()} characters.`)
  if (input.includes('\u0000')) return fail('This doesn’t look like a text file.')
  const lines = input.replace(/\r\n?/g, '\n').split('\n')
  if (lines.length > LIMITS.maxLines) return fail(`This file has too many lines. The limit is ${LIMITS.maxLines}.`)

  const meta: Record<string, string> = {}
  let customMapping: Partial<Record<GestureId, ChordName>> | null = null
  let customStrum: StrumStep[] | null = null
  let beatsOverride: number | null = null
  const sections: SongSection[] = []
  let current: SongSection | null = null
  const open = (name: string) => { current = { name, lines: [] }; sections.push(current) }

  lines.forEach((raw, i) => {
    const lineNo = i + 1
    const line = raw.replace(/\s+$/, '')
    if (!line.trim() || line.trim().startsWith('#')) return

    const d = DIRECTIVE.exec(line.trim())
    if (d) {
      const key = d[1].toLowerCase()
      const value = (d[2] ?? '').trim()
      if (SECTION_START.has(key)) {
        const label = /^label\s*=\s*"?([^"]*)"?$/i.exec(value)?.[1] ?? value
        open(label || DEFAULT_SECTION_NAME[key] || 'Section')
      } else if (SECTION_END.has(key)) {
        // Lines after an end marker keep going into the same section; nothing to do.
      } else if (key === 'comment' || key === 'c' || key === 'comment_italic' || key === 'ci') {
        if (value) open(value)
      } else if (key === 'title' || key === 't') meta.title = value
      else if (key === 'artist' || key === 'subtitle' || key === 'st') meta.artist = value
      else if (key === 'key') meta.key = value
      else if (key === 'tempo') meta.tempo = value
      else if (key === 'time') meta.time = value
      else if (key === 'beats') {
        const n = Number(value)
        if (!Number.isInteger(n) || n < 1 || n > 16) errors.push({ line: lineNo, message: '{beats: …} must be a whole number from 1 to 16.' })
        else beatsOverride = n
      } else if (key === 'strum') {
        const r = parseStrumPattern(value)
        if ('error' in r) errors.push({ line: lineNo, message: r.error })
        else customStrum = r.steps
      } else if (key === 'gestures') {
        const map: Partial<Record<GestureId, ChordName>> = {}
        const seenChords = new Set<string>()
        for (const pair of value.split(/[\s,]+/).filter(Boolean)) {
          const [k, v] = pair.split('=')
          const gesture = GESTURE_KEYS[(k ?? '').toLowerCase()]
          const chord = normalizeChord(v ?? '')
          if (!gesture || !v) { errors.push({ line: lineNo, message: `“${pair}” isn’t a gesture setting. Use pairs like 1=C 2=G 3=Am (keys 0 to 5, or t for thumb).` }); continue }
          if (!isSupportedChord(chord)) { errors.push({ line: lineNo, message: `Chord “${v}” isn’t supported yet. Supported chord names include all chromatic major and minor chords, plus common seventh and suspended chords.` }); continue }
          if (gesture === 'GESTURE_0') { errors.push({ line: lineNo, message: 'Gesture 0 is reserved for mute. Assign chords to gestures 1–5 or t.' }); continue }
          if (map[gesture]) { errors.push({ line: lineNo, message: `Gesture “${k}” is used twice.` }); continue }
          if (seenChords.has(chord)) { errors.push({ line: lineNo, message: `Chord ${chord} is assigned to two gestures.` }); continue }
          seenChords.add(chord); map[gesture] = chord
        }
        customMapping = map
      } else {
        warnings.push({ line: lineNo, message: `Ignored the {${key}} directive. Chord Hand doesn’t use it.` })
      }
      return
    }

    if (!current) open('Song')
    current!.lines.push({ segments: parseLyricLine(line, lineNo, errors) })
  })

  const usedSections = sections.filter((s) => s.lines.length)
  const chords: ChordName[] = []
  for (const s of usedSections) for (const l of s.lines) for (const g of l.segments) if (g.chord && !chords.includes(g.chord)) chords.push(g.chord)
  const hasChordInSheet = usedSections.some((s) => s.lines.some((l) => l.segments.some((g) => g.chord)))
  if (!hasChordInSheet && !errors.length) return fail('This song has no chords. Put chords in square brackets, like [C]Hello [G]world.')
  if (chords.length > 6) errors.push({ line: 0, message: `This song uses ${chords.length} unique chords, but each song can use at most six chord gestures. Simplify the harmony or transpose the song before importing.` })

  // --- metadata ---
  const title = meta.title || 'Untitled song'
  if (!meta.title) warnings.push({ line: 0, message: 'No {title: …} found, so the song is called “Untitled song”.' })
  if (!meta.artist) warnings.push({ line: 0, message: 'No {artist: …} found.' })

  let tempo = 80
  if (meta.tempo) {
    const n = Number(meta.tempo)
    if (!Number.isFinite(n) || n < 30 || n > 240) errors.push({ line: 0, message: `{tempo: ${meta.tempo}} must be a number from 30 to 240 BPM.` })
    else tempo = Math.round(n)
  } else warnings.push({ line: 0, message: 'No {tempo: …} found, so 80 BPM is used.' })

  let timeSignature = '4/4'
  if (meta.time) {
    if (!/^\d{1,2}\/(2|4|8|16)$/.test(meta.time) || Number(meta.time.split('/')[0]) < 1) errors.push({ line: 0, message: `{time: ${meta.time}} must look like 4/4, 3/4 or 6/8.` })
    else timeSignature = meta.time
  }
  const defaults = timeSignatureDefaults(timeSignature)
  if (!customStrum) warnings.push({ line: 0, message: `No {strum: …} found, so a standard ${timeSignature} pattern is used.` })

  // --- gesture mapping ---
  let gestureMapping: Partial<Record<GestureId, ChordName>>
  if (customMapping) {
    gestureMapping = { GESTURE_0: MUTE, ...(customMapping as Partial<Record<GestureId, ChordName>>) }
    const missing = chords.filter((c) => !Object.values(customMapping!).includes(c))
    if (missing.length) errors.push({ line: 0, message: `Your {gestures: …} line has no gesture for ${missing.join(', ')}.` })
  } else {
    gestureMapping = { GESTURE_0: MUTE }
    chords.forEach((c, i) => { gestureMapping[AUTO_GESTURES[i]] = c })
  }

  const hasLyrics = usedSections.some((s) => s.lines.some((l) => l.segments.some((g) => g.text.trim())))
  if (!hasLyrics) warnings.push({ line: 0, message: 'There are no lyrics, only chords. The song will play with chords only.' })

  if (errors.length) return { errors, warnings }

  const n = chords.length
  const difficulty: Difficulty = n <= 3 && !chords.includes('F') ? 'Beginner' : n <= 5 ? 'Easy' : 'Intermediate'
  const song: Song = {
    schemaVersion: 1,
    id: `${slug(title)}-${Date.now().toString(36)}`,
    title,
    artist: meta.artist || 'Unknown artist',
    key: meta.key || chords[0],
    tempo,
    timeSignature,
    beatsPerChord: beatsOverride ?? defaults.beatsPerChord,
    stepsPerBeat: defaults.stepsPerBeat,
    difficulty,
    gestureMapping,
    sections: usedSections,
    strummingPattern: { steps: customStrum ?? defaults.pattern },
    lyricsNotIncluded: !hasLyrics || undefined,
    source: 'imported',
  }
  return { song, errors, warnings }
}
