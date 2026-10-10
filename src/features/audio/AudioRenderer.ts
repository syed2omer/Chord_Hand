import type * as ToneNS from 'tone'
import type { ChordRenderer, StrumEvent } from '../engine/renderer'

type ToneModule = typeof ToneNS
let loaded: ToneModule | null = null

/** Browser guitar sound: six plucked-string models through a soft filter and a touch of reverb. */
export class AudioRenderer implements ChordRenderer {
  private constructor(
    private Tone: ToneModule,
    private strings: ToneNS.PluckSynth[],
    private master: ToneNS.Gain,
    private nodes: { dispose(): unknown }[],
    private clickSynth: ToneNS.MembraneSynth,
  ) {}

  /** Start fetching the audio library early so create() can run inside the click that starts a session. */
  static preload() { void import('tone').then((m) => { loaded = m }).catch(() => undefined) }

  static async create(): Promise<AudioRenderer> {
    // Browsers only allow audio to start from a user gesture, so call start() before any await when possible.
    const startNow = loaded ? loaded.start() : null
    const Tone = loaded ?? (loaded = await import('tone'))
    await (startNow ?? Tone.start())

    const master = new Tone.Gain(1)
    const reverb = new Tone.Reverb({ decay: 1.4, wet: 0.14 })
    const filter = new Tone.Filter(3800, 'lowpass')
    const out = new Tone.Gain(0.55).toDestination()
    master.chain(filter, reverb, out)
    await reverb.ready
    const strings = Array.from({ length: 6 }, () =>
      new Tone.PluckSynth({ attackNoise: 1.4, dampening: 3600, resonance: 0.985 }).connect(master))
    const clickSynth = new Tone.MembraneSynth({ envelope: { attack: 0.001, decay: 0.08, sustain: 0 }, volume: -10 }).connect(out)
    return new AudioRenderer(Tone, strings, master, [...strings, master, reverb, filter, out, clickSynth], clickSynth)
  }

  now() { return this.Tone.now() }

  strum(e: StrumEvent) {
    // Downstrokes sweep low to high across every string; upstrokes catch only the higher strings, high to low.
    const notes = e.direction === 'D' ? e.notes : [...e.notes].filter((n) => n.string >= 2).reverse()
    const gap = e.direction === 'D' ? 0.013 : 0.008
    notes.forEach((n, i) => this.strings[n.string].triggerAttack(n.note, e.time + i * gap))
  }

  mute(time: number) {
    const g = this.master.gain
    g.cancelScheduledValues(time)
    g.setValueAtTime(g.value, time)
    g.linearRampToValueAtTime(0, time + 0.03)
    g.setValueAtTime(0, time + 0.06)
    g.linearRampToValueAtTime(1, time + 0.09)
  }

  click(time: number, accent: boolean) {
    this.clickSynth.triggerAttackRelease(accent ? 'G4' : 'C4', 0.05, time)
  }

  dispose() { this.nodes.forEach((n) => n.dispose()) }
}
