import { FEATURE_SIZE, FEATURE_VERSION } from '../gesture/normalize'
import { GESTURE_CLASSES } from '../gesture/gestureTypes'
import type { Sample } from './db'

export const round = (n: number) => Math.round(n * 1e5) / 1e5

export interface DatasetFile {
  format: 'chordhand-dataset'
  version: 1
  featureVersion: number
  featureSize: number
  classes: string[]
  samples: Omit<Sample, 'id'>[]
}

export function buildDataset(samples: Sample[]): DatasetFile {
  return {
    format: 'chordhand-dataset',
    version: 1,
    featureVersion: FEATURE_VERSION,
    featureSize: FEATURE_SIZE,
    classes: GESTURE_CLASSES,
    samples: samples.map(({ id: _id, ...s }) => ({
      ...s,
      landmarks: s.landmarks.map(round),
      features: s.features.map(round),
    })),
  }
}

export function downloadJson(name: string, data: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' }))
  const a = Object.assign(document.createElement('a'), { href: url, download: name })
  a.click()
  URL.revokeObjectURL(url)
}

export const MIN_PER_CLASS = 150
export const MIN_TAKES = 3

/** Plain-language gaps in the dataset, so the person knows what to record next. */
export function datasetAdvice(counts: Record<string, { total: number; left: number; right: number; takes: number }>): string[] {
  const out: string[] = []
  for (const c of GESTURE_CLASSES) {
    const x = counts[c]
    const name = c === 'UNKNOWN' ? 'Everything else' : c.replace('GESTURE_', 'Gesture ').replace('THUMB', 'Thumb')
    if (x.total < MIN_PER_CLASS) out.push(`${name}: record ${MIN_PER_CLASS - x.total} more samples.`)
    else if (x.takes < MIN_TAKES) out.push(`${name}: record at least ${MIN_TAKES - x.takes} more takes, varying distance or angle.`)
    else if (x.left < x.total * 0.25 || x.right < x.total * 0.25) out.push(`${name}: record more with your ${x.left < x.right ? 'left' : 'right'} hand.`)
  }
  return out
}
