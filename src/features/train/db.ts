import type { GestureClass } from '../gesture/gestureTypes'
import { GESTURE_CLASSES } from '../gesture/gestureTypes'

export interface Sample {
  id?: number
  label: GestureClass
  hand: 'Left' | 'Right'
  /** One id per recording take. Training splits by take so near-identical frames never straddle train and test. */
  take: string
  aspect: number
  landmarks: number[] // raw 21x3, flattened
  features: number[] // normalizeLandmarks() output, flattened
}

export interface LabelCounts { total: number; left: number; right: number; takes: number }
export type Counts = Record<GestureClass, LabelCounts>

const DB_NAME = 'chordhand'
const STORE = 'samples'

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      const store = req.result.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true })
      store.createIndex('label', 'label')
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  return open().then(
    (db) => new Promise((resolve, reject) => {
      const t = db.transaction(STORE, mode)
      const r = run(t.objectStore(STORE))
      t.oncomplete = () => { db.close(); resolve(r ? r.result : undefined) }
      t.onerror = () => { db.close(); reject(t.error) }
    }),
  )
}

export const addSamples = (batch: Sample[]) =>
  tx('readwrite', (s) => { batch.forEach((x) => s.add(x)) }).then(() => undefined)

export const getAllSamples = () => tx<Sample[]>('readonly', (s) => s.getAll()).then((r) => r ?? [])

export const clearAll = () => tx('readwrite', (s) => s.clear()).then(() => undefined)

export function clearLabel(label: GestureClass): Promise<void> {
  return open().then(
    (db) => new Promise((resolve, reject) => {
      const t = db.transaction(STORE, 'readwrite')
      const req = t.objectStore(STORE).index('label').openKeyCursor(IDBKeyRange.only(label))
      req.onsuccess = () => {
        const cur = req.result
        if (cur) { t.objectStore(STORE).delete(cur.primaryKey); cur.continue() }
      }
      t.oncomplete = () => { db.close(); resolve() }
      t.onerror = () => { db.close(); reject(t.error) }
    }),
  )
}

export function countSamples(samples: Sample[]): Counts {
  const counts = Object.fromEntries(
    GESTURE_CLASSES.map((c) => [c, { total: 0, left: 0, right: 0, takes: 0 }]),
  ) as Counts
  const takes = Object.fromEntries(GESTURE_CLASSES.map((c) => [c, new Set<string>()])) as Record<GestureClass, Set<string>>
  for (const s of samples) {
    const c = counts[s.label]
    c.total++
    if (s.hand === 'Left') c.left++; else c.right++
    takes[s.label].add(s.take)
  }
  GESTURE_CLASSES.forEach((c) => { counts[c].takes = takes[c].size })
  return counts
}
