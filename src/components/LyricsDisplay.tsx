import { useEffect, useRef } from 'react'
import type { ProgressionEntry, Song } from '../features/songs/schema'

export default function LyricsDisplay({ song, current }: { song: Song; current?: ProgressionEntry }) {
  const activeRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    activeRef.current?.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' })
  }, [current?.sectionIndex, current?.lineIndex])

  return (
    <div className="max-h-80 overflow-y-auto pr-2" role="region" aria-label="Lyrics" tabIndex={0}>
      {song.sections.map((section, si) => (
        <div key={si} className="mb-6">
          <h3 className="mb-3 text-sm text-cream-dim">{section.name}</h3>
          {section.lines.map((line, li) => {
            const isLine = current?.sectionIndex === si && current?.lineIndex === li
            return (
              <div key={li} ref={isLine ? activeRef : undefined}
                className={`mb-4 flex flex-wrap transition-opacity ${isLine ? 'opacity-100' : 'opacity-45'}`}>
                {line.segments.map((seg, gi) => {
                  const isChord = isLine && current?.segmentIndex === gi
                  return (
                    <span key={gi} className="inline-flex flex-col">
                      <span className={`h-7 font-display text-2xl leading-7 ${isChord ? 'text-gold underline decoration-2 underline-offset-4' : 'text-cream-dim'}`}>
                        {seg.chord ?? '\u00a0'}
                      </span>
                      <span className="whitespace-pre font-display text-3xl leading-9">{seg.text}</span>
                    </span>
                  )
                })}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
