import { useCallback, useEffect, useRef, useState } from 'react'
import { AudioRenderer } from '../audio/AudioRenderer'
import type { GestureClass } from '../gesture/gestureTypes'
import type { Song } from '../songs/schema'
import { IDLE_STATE, intervalTimer, PerformanceController, type SessionState } from './PerformanceController'

/** Owns the audio renderer and the performance controller for one song. */
export function useSession(song: Song) {
  const [state, setState] = useState<SessionState>(IDLE_STATE)
  const [audioError, setAudioError] = useState<string | null>(null)
  const controller = useRef<PerformanceController | null>(null)
  const renderer = useRef<AudioRenderer | null>(null)
  const gesture = useRef<GestureClass | null>(null)

  useEffect(() => {
    AudioRenderer.preload()
    return () => {
      controller.current?.stop()
      renderer.current?.dispose()
      controller.current = null; renderer.current = null
    }
  }, [])

  const start = useCallback(async (fromIndex = 0) => {
    setAudioError(null)
    try {
      renderer.current ??= await AudioRenderer.create()
    } catch {
      setAudioError('Audio isn’t available in this browser, so the chords can’t be played. Try a recent Chrome, Edge, Safari or Firefox, and check that your device isn’t muted.')
      return
    }
    controller.current?.stop()
    const c = new PerformanceController(song, renderer.current, intervalTimer, setState)
    c.setGesture(gesture.current)
    controller.current = c
    c.start(fromIndex)
  }, [song])

  const stop = useCallback(() => controller.current?.stop(), [])

  const setGesture = useCallback((g: GestureClass | null) => {
    gesture.current = g
    controller.current?.setGesture(g)
  }, [])

  return { state, audioError, start, stop, setGesture }
}
