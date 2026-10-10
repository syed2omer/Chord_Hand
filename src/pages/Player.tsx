import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import CameraView from '../components/CameraView'
import ChordDiagram from '../components/ChordDiagram'
import ChordDisplay from '../components/ChordDisplay'
import ChordFeedback from '../components/ChordFeedback'
import ChordQueue from '../components/ChordQueue'
import GestureIndicator from '../components/GestureIndicator'
import GestureStrip from '../components/GestureStrip'
import LyricsDisplay from '../components/LyricsDisplay'
import MusicControls from '../components/MusicControls'
import SongTimeline from '../components/SongTimeline'
import StrummingVisualizer from '../components/StrummingVisualizer'
import { computeFeedback } from '../features/engine/feedback'
import { useSession } from '../features/engine/useSession'
import type { GestureClass } from '../features/gesture/gestureTypes'
import { useGestureRecognition } from '../features/gesture/useGestureRecognition'
import { deriveProgression, gestureForChord, totalSeconds } from '../features/songs/progression'
import { useSongs } from '../features/songs/useSongs'
import { GESTURE_LABEL, type Song } from '../features/songs/schema'

export default function Player() {
  const { songId = '' } = useParams()
  const { songs, loading } = useSongs()
  const song = songs.find((x) => x.id === songId)
  if (loading) return <p className="py-24 text-center text-cream-dim">Loading song…</p>
  if (!song) {
    return <p className="py-24 text-center text-cream-dim">We couldn’t find that song. <Link className="text-gold underline" to="/songs">Back to songs</Link></p>
  }
  if (!deriveProgression(song).length) {
    return <p className="py-24 text-center text-err">This song has no chords yet. Add chords to the lyrics and try again.</p>
  }
  // key= resets the session when switching songs.
  return <Session key={song.id} song={song} />
}

const KEY_GESTURE: Record<string, GestureClass> = {
  '0': 'GESTURE_0', '1': 'GESTURE_1', '2': 'GESTURE_2', '3': 'GESTURE_3', '4': 'GESTURE_4', '5': 'GESTURE_5', t: 'GESTURE_THUMB',
}

function Session({ song }: { song: Song }) {
  const progression = useMemo(() => deriveProgression(song), [song])
  const [startIndex, setStartIndex] = useState(0)
  const [cameraOn, setCameraOn] = useState(false)
  const { model, modelError, reading, onHands, reset } = useGestureRecognition()
  const session = useSession(song)
  const { state } = session

  const last = progression.length - 1
  const idle = state.phase === 'idle' || state.phase === 'ended'
  const index = idle && state.phase !== 'ended' ? startIndex : state.index
  const current = progression[index]
  const next = progression[index + 1]
  const gestureOf = (chord?: string) => {
    const g = chord ? gestureForChord(song, chord) : undefined
    return g ? GESTURE_LABEL[g].toLowerCase() : undefined
  }

  const confirmed = reading.status === 'confirmed' ? reading.gesture : null

  // Camera gesture -> controller. The controller only ever sees a confirmed gesture.
  useEffect(() => { session.setGesture(confirmed) }, [confirmed, session.setGesture])

  // Keyboard stand-in for the camera, also an accessible way to play.
  useEffect(() => {
    let held: string | null = null
    const typing = (t: EventTarget | null) => t instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)
    const down = (e: KeyboardEvent) => {
      const g = KEY_GESTURE[e.key.toLowerCase()]
      if (!g || e.repeat || e.ctrlKey || e.metaKey || e.altKey || typing(e.target)) return
      held = e.key.toLowerCase(); session.setGesture(g)
    }
    const up = (e: KeyboardEvent) => {
      if (held === e.key.toLowerCase()) { held = null; session.setGesture(confirmed) }
    }
    window.addEventListener('keydown', down); window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [session.setGesture, confirmed])

  const feedback = computeFeedback({
    song, phase: state.phase, expected: current.chord, next: next?.chord, countIn: state.countIn,
    guard: state.guard, status: reading.status, gesture: reading.gesture,
  })
  const total = totalSeconds(song)
  const elapsed = state.phase === 'idle' ? (progression.slice(0, startIndex).reduce((n, p) => n + p.durationBeats, 0) * 60) / song.tempo
    : (state.elapsedBeats * 60) / song.tempo

  return (
    <div className="py-4">
      <div className="mb-5">
        <h1 className="font-display text-5xl leading-tight">{song.title}</h1>
        <p className="text-cream-dim">{song.artist}, key of {song.key}. Section: {song.sections[current.sectionIndex].name}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <CameraView
          onHands={onHands}
          onTrackingStop={reset}
          onActiveChange={setCameraOn}
          overlay={<GestureIndicator reading={reading} />}
        />
        <section aria-label="Current chord" className="rounded-2xl border border-cream/10 bg-teal-card p-6">
          <ChordDisplay chord={current.chord} next={next?.chord} gestureLabel={gestureOf(current.chord)} />
          <ChordDiagram chord={current.chord} className="mx-auto mt-2 h-60" />
          <ChordFeedback feedback={feedback} cameraOn={cameraOn} model={model} modelError={modelError}
            expected={current.chord} gestureLabel={gestureOf(current.chord)} nextGestureLabel={gestureOf(next?.chord)} />
          {session.audioError && <p role="alert" className="mt-3 text-sm text-err">{session.audioError}</p>}
          <div className="mt-5"><GestureStrip song={song} activeChord={current.chord} /></div>
        </section>
      </div>

      {song.lyricsNotIncluded && (
        <p role="note" className="mt-6 rounded-xl border border-gold/40 bg-teal-card px-4 py-3 text-sm text-cream-dim">
          This song comes with chords only, because the lyrics are copyrighted. To sing along, <Link to="/import" className="text-gold underline">import your own ChordPro sheet</Link> with lyrics you have the right to use.
        </p>
      )}

      <section aria-label="Lyrics and progression" className="mt-6 grid gap-6 rounded-2xl border border-cream/10 bg-teal-card p-6 lg:grid-cols-[1fr_auto]">
        <LyricsDisplay song={song} current={current} />
        <div className="space-y-6">
          <div>
            <p className="mb-2 text-sm text-cream-dim">Coming up</p>
            <ChordQueue chords={progression.map((p) => p.chord)} index={index} />
          </div>
          <div>
            <p className="mb-2 text-sm text-cream-dim">Strumming, played for you</p>
            <StrummingVisualizer steps={song.strummingPattern.steps} activeStep={state.step ?? undefined} />
          </div>
        </div>
      </section>

      <div className="mt-6 space-y-4 rounded-2xl border border-cream/10 bg-teal-card p-5">
        <SongTimeline elapsed={elapsed} total={total} />
        <MusicControls
          phase={state.phase}
          canPrev={startIndex > 0} canNext={startIndex < last}
          onPrev={() => setStartIndex((n) => Math.max(0, n - 1))}
          onNext={() => setStartIndex((n) => Math.min(last, n + 1))}
          onStart={() => void session.start(state.phase === 'ended' ? 0 : startIndex)}
          onStop={() => session.stop()}
          tempo={song.tempo} timeSignature={song.timeSignature} startChord={progression[startIndex].chord}
        />
      </div>
    </div>
  )
}
