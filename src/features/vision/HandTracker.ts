import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision'

export interface Landmark { x: number; y: number; z: number }
export interface TrackedHand {
  landmarks: Landmark[] // 21 points, normalized 0..1 in the unmirrored camera frame
  /** The user's real hand. See note in detect(). */
  hand: 'Left' | 'Right'
  score: number
}

const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.0/wasm'
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'

export class HandTracker {
  private constructor(private landmarker: HandLandmarker) {}

  static async create(): Promise<HandTracker> {
    const fileset = await FilesetResolver.forVisionTasks(WASM_URL)
    const make = (delegate: 'GPU' | 'CPU') =>
      HandLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate },
        runningMode: 'VIDEO',
        numHands: 2,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      })
    try { return new HandTracker(await make('GPU')) } catch { return new HandTracker(await make('CPU')) }
  }

  private lastTs = -1

  detect(video: HTMLVideoElement): TrackedHand[] {
    if (video.readyState < 2) return []
    // MediaPipe needs strictly increasing timestamps.
    const ts = Math.max(performance.now(), this.lastTs + 1)
    this.lastTs = ts
    const result = this.landmarker.detectForVideo(video, ts)
    return result.landmarks.map((landmarks, i) => {
      const cat = result.handedness[i]?.[0]
      // MediaPipe labels handedness as if the image were a mirror. We feed it the raw
      // (unmirrored) frame, so the label is the opposite of the user's real hand.
      const hand = cat?.categoryName === 'Left' ? 'Right' : 'Left'
      return { landmarks, hand, score: cat?.score ?? 0 }
    })
  }

  close() { this.landmarker.close() }
}
