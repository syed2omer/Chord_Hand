import { useCallback, useEffect, useRef, useState } from 'react'
import { checkCameraSupport, toCameraError, type CameraError } from './cameraErrors'

export type CameraStatus = 'idle' | 'starting' | 'active' | 'error'

/** Owns the webcam stream. Attach `videoRef` to a <video playsInline muted>. */
export function useCamera() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [status, setStatus] = useState<CameraStatus>('idle')
  const [error, setError] = useState<CameraError | null>(null)

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setStatus('idle')
  }, [])

  const start = useCallback(async () => {
    const unsupported = checkCameraSupport()
    if (unsupported) { setError(unsupported); setStatus('error'); return }
    setStatus('starting'); setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      streamRef.current = stream
      const video = videoRef.current
      if (!video) { stream.getTracks().forEach((t) => t.stop()); return }
      video.srcObject = stream
      await video.play()
      setStatus('active')
      // If the camera is unplugged or taken by another app mid-session.
      stream.getVideoTracks()[0]?.addEventListener('ended', () => {
        setError({ kind: 'in-use', message: 'The camera stopped. Reconnect it and press Try again.' })
        setStatus('error')
      })
    } catch (e) {
      streamRef.current?.getTracks().forEach((t) => t.stop())
      setError(toCameraError(e)); setStatus('error')
    }
  }, [])

  useEffect(() => () => { streamRef.current?.getTracks().forEach((t) => t.stop()) }, [])

  return { videoRef, status, error, start, stop }
}
