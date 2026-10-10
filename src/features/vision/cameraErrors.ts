export type CameraErrorKind = 'denied' | 'no-camera' | 'in-use' | 'unsupported' | 'insecure' | 'unknown'

export interface CameraError { kind: CameraErrorKind; message: string }

const MESSAGES: Record<CameraErrorKind, string> = {
  denied: 'Camera access was blocked. Allow the camera in your browser’s site settings, then press Try again.',
  'no-camera': 'No camera was found. Connect a webcam and press Try again.',
  'in-use': 'Your camera is being used by another app. Close it and press Try again.',
  unsupported: 'This browser can’t access a camera. Try a recent version of Chrome, Edge, Safari or Firefox.',
  insecure: 'Camera access needs a secure connection (HTTPS or localhost).',
  unknown: 'The camera couldn’t start. Reload the page and try again.',
}

export function toCameraError(err: unknown): CameraError {
  const name = err instanceof DOMException || err instanceof Error ? err.name : ''
  let kind: CameraErrorKind = 'unknown'
  if (name === 'NotAllowedError' || name === 'SecurityError' || name === 'PermissionDeniedError') kind = 'denied'
  else if (name === 'NotFoundError' || name === 'OverconstrainedError' || name === 'DevicesNotFoundError') kind = 'no-camera'
  else if (name === 'NotReadableError' || name === 'TrackStartError' || name === 'AbortError') kind = 'in-use'
  return { kind, message: MESSAGES[kind] }
}

export function checkCameraSupport(): CameraError | null {
  if (typeof window !== 'undefined' && !window.isSecureContext) return { kind: 'insecure', message: MESSAGES.insecure }
  if (!navigator.mediaDevices?.getUserMedia) return { kind: 'unsupported', message: MESSAGES.unsupported }
  return null
}
