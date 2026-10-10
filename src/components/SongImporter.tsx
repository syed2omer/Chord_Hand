import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LIMITS, parseChordPro, type ParseIssue } from '../features/songs/ChordProParser'
import { useSongs } from '../features/songs/useSongs'
import { GESTURE_LABEL, GESTURE_ORDER } from '../features/songs/schema'

const MAX_FILE_BYTES = 200_000
const EXTENSIONS = ['.pro', '.cho', '.crd', '.chopro', '.chordpro', '.txt']

// Public-domain hymn, written in ChordPro so people can see the format.
const EXAMPLE = `{title: Amazing Grace}
{artist: Traditional}
{key: G}
{tempo: 84}
{time: 3/4}
{strum: D - D U D U}

{start_of_verse: Verse 1}
A-[G]mazing grace, how [C]sweet the [G]sound
That saved a [Em]wretch like [D]me
I [G]once was lost, but [C]now am [G]found
Was [Em]blind, but [D]now I [G]see
{end_of_verse}
`

function Issues({ title, items, tone }: { title: string; items: ParseIssue[]; tone: 'err' | 'warn' }) {
  if (!items.length) return null
  return (
    <div role={tone === 'err' ? 'alert' : 'status'} className={`mt-4 rounded-xl border px-4 py-3 ${tone === 'err' ? 'border-err' : 'border-gold/40'}`}>
      <p className={`text-sm font-medium ${tone === 'err' ? 'text-err' : 'text-gold'}`}>{title}</p>
      <ul className="mt-1 list-disc pl-5 text-sm text-cream-dim">
        {items.map((it, i) => <li key={i}>{it.line ? `Line ${it.line}: ` : ''}{it.message}</li>)}
      </ul>
    </div>
  )
}

export default function SongImporter() {
  const [text, setText] = useState('')
  const [fileError, setFileError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const { saveImported } = useSongs()
  const navigate = useNavigate()

  const result = useMemo(() => (text.trim() ? parseChordPro(text) : null), [text])
  const song = result?.song

  async function onFile(file: File | undefined) {
    setFileError(null)
    if (!file) return
    const ok = EXTENSIONS.some((e) => file.name.toLowerCase().endsWith(e))
    if (!ok) return setFileError(`That file type isn’t supported. Use one of: ${EXTENSIONS.join(', ')}.`)
    if (file.size > MAX_FILE_BYTES) return setFileError(`That file is too big. The limit is ${Math.round(MAX_FILE_BYTES / 1000)} KB.`)
    try { setText(await file.text()) } catch { setFileError('That file couldn’t be read. Try pasting the text instead.') }
    if (fileRef.current) fileRef.current.value = ''
  }

  function add() {
    if (!song) return
    const err = saveImported(song)
    if (err) return setSaveError(err)
    navigate(`/play/${song.id}`)
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section aria-label="Chord sheet" className="rounded-2xl border border-cream/10 bg-teal-card p-6">
        <label htmlFor="sheet" className="text-sm text-cream-dim">Paste a ChordPro chord sheet</label>
        <textarea id="sheet" value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} rows={18}
          maxLength={LIMITS.maxChars} placeholder={'{title: My Song}\n{artist: Me}\n{tempo: 90}\n\n[C]Words go [G]here'}
          className="mt-2 w-full rounded-xl border border-cream/20 bg-teal-deep p-3 font-mono text-sm placeholder:text-cream-dim" />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="cursor-pointer rounded-full border border-cream/25 px-4 py-2 text-sm hover:bg-teal-raised">
            Choose a file
            <input ref={fileRef} type="file" accept={EXTENSIONS.join(',')} className="sr-only" onChange={(e) => void onFile(e.target.files?.[0])} />
          </label>
          <button onClick={() => setText(EXAMPLE)} className="rounded-full border border-cream/25 px-4 py-2 text-sm hover:bg-teal-raised">Load an example</button>
          {text && <button onClick={() => setText('')} className="rounded-full px-3 py-2 text-sm text-cream-dim hover:text-cream">Clear</button>}
        </div>
        {fileError && <p role="alert" className="mt-3 text-sm text-err">{fileError}</p>}
        <p className="mt-4 text-xs text-cream-dim">
          Only import lyrics and chords you own or have permission to use. Chord Hand never fetches lyrics from the internet,
          and imported songs stay on this device.
        </p>
        <details className="mt-4 text-sm text-cream-dim">
          <summary className="cursor-pointer text-cream">ChordPro quick reference</summary>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Put chords in brackets, right before the syllable: <code className="text-cream">[G]Hello [D]world</code></li>
            <li><code className="text-cream">{'{title: …}  {artist: …}  {key: …}  {tempo: 90}  {time: 4/4}'}</code></li>
            <li><code className="text-cream">{'{strum: D - D U - U}'}</code> sets the strumming pattern (D down, U up, - rest)</li>
            <li><code className="text-cream">{'{gestures: 1=C 2=G 3=Am 4=F}'}</code> chooses which gesture plays which chord. Without it, gestures are assigned in order of first appearance.</li>
            <li><code className="text-cream">{'{start_of_verse: Verse 1}'}</code> or <code className="text-cream">{'{comment: Chorus}'}</code> start a section</li>
          <li>Major and minor chords are supported across all 12 roots (including flats such as Ab and Db), plus common 7, maj7, m7, sus2, sus4, dim, aug, 6, m6 and add9 chords. Each song can map up to six unique chords to gestures.</li>
          </ul>
        </details>
      </section>

      <section aria-label="Preview" className="rounded-2xl border border-cream/10 bg-teal-card p-6">
        {!result && <p className="text-cream-dim">Your song will be previewed here as soon as you paste or load a chord sheet.</p>}
        {result && (
          <>
            {song ? (
              <>
                <h2 className="font-display text-4xl leading-tight">{song.title}</h2>
                <p className="text-cream-dim">{song.artist}, key of {song.key}, {song.tempo} BPM, {song.timeSignature}</p>
                <p className="mt-3 text-sm text-cream-dim">Strumming: <span className="font-mono text-cream">{song.strummingPattern.steps.join(' ')}</span></p>
                <table className="mt-4 w-full text-left text-sm">
                  <caption className="sr-only">Gesture for each chord in this song</caption>
                  <thead className="text-cream-dim"><tr><th className="py-1 font-normal">Gesture</th><th className="font-normal">Chord</th></tr></thead>
                  <tbody>
                    {GESTURE_ORDER.filter((g) => song.gestureMapping[g]).map((g) => (
                      <tr key={g} className="border-t border-cream/10">
                        <th scope="row" className="py-1.5 font-normal">{GESTURE_LABEL[g]}</th>
                        <td className="font-display text-2xl">{song.gestureMapping[g] === 'MUTE' ? 'Mute' : song.gestureMapping[g]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            ) : (
              <p className="text-err">This chord sheet can’t be imported yet. Fix the problems below.</p>
            )}
            <Issues title={`${result.errors.length} problem${result.errors.length === 1 ? '' : 's'} to fix`} items={result.errors} tone="err" />
            <Issues title="Worth knowing" items={result.warnings} tone="warn" />
            {saveError && <p role="alert" className="mt-4 text-sm text-err">{saveError}</p>}
            <button onClick={add} disabled={!song}
              className="mt-5 rounded-full bg-gold px-6 py-2.5 font-medium text-fret hover:brightness-110 disabled:opacity-40">Add to my songs</button>
          </>
        )}
      </section>
    </div>
  )
}
