import { describe, expect, it } from 'vitest'
import { toCameraError } from '../src/features/vision/cameraErrors'

const named = (name: string) => Object.assign(new Error('x'), { name })

describe('camera error mapping', () => {
  it('maps permission denial', () => expect(toCameraError(named('NotAllowedError')).kind).toBe('denied'))
  it('maps missing camera', () => expect(toCameraError(named('NotFoundError')).kind).toBe('no-camera'))
  it('maps camera in use', () => expect(toCameraError(named('NotReadableError')).kind).toBe('in-use'))
  it('falls back to unknown with a readable message', () => {
    const e = toCameraError('weird')
    expect(e.kind).toBe('unknown')
    expect(e.message.length).toBeGreaterThan(10)
  })
})
