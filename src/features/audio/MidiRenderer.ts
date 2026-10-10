import { noteToMidi } from '../engine/chordNotes'
import type { ChordRenderer, StrumEvent } from '../engine/renderer'

/**
 * Sends the same chord events to a MIDI output instead of the speakers. Not wired into the UI yet;
 * it exists to prove the engine isn't tied to Tone.js. Needs a browser with Web MIDI (Chrome, Edge).
 */
export class MidiRenderer implements ChordRenderer {
  private open: { note: number; off: number }[] = []
  private constructor(private out: MIDIOutput, private clock: () => number) {}

  static async create(clock: () => number): Promise<MidiRenderer> {
    if (!navigator.requestMIDIAccess) throw new Error('This browser does not support MIDI.')
    const access = await navigator.requestMIDIAccess()
    const out = [...access.outputs.values()][0]
    if (!out) throw new Error('No MIDI output device found.')
    return new MidiRenderer(out, clock)
  }

  /** Converts a renderer-clock time (seconds) to Web MIDI's performance.now() milliseconds. */
  private at(time: number) { return performance.now() + Math.max(0, (time - this.clock()) * 1000) }

  now() { return this.clock() }

  strum(e: StrumEvent) {
    const notes = e.direction === 'D' ? e.notes : e.notes.filter((n) => n.string >= 2)
    notes.forEach((n, i) => {
      const num = noteToMidi(n.note)
      const t = this.at(e.time + i * 0.012)
      this.out.send([0x90, num, 88], t)
      this.open.push({ note: num, off: t })
    })
  }

  mute(time: number) {
    const t = this.at(time)
    this.open.forEach((o) => this.out.send([0x80, o.note, 0], t))
    this.open = []
  }

  click() { /* no metronome over MIDI */ }

  dispose() { this.mute(this.clock()) }
}
