# Phase 9 prototype audit

Audited from the uploaded `chordhand-phase9-import.zip` before continuing the implementation.

## Already implemented

- One Vite, React and TypeScript app, plus a neighboring `ml/` training folder and Netlify configuration.
- Deep teal/cream visual tokens, responsive page shells, song library and route setup.
- Webcam capture, MediaPipe hand landmarks, skeleton overlay, normalized hand features, MLP inference and temporal smoothing.
- A browser-local sample recorder, JSON export, Python training script and plain-weight model loader.
- Song-specific gesture mapping, progression generation, chord validation, song state machine, keyboard fallback and MIDI renderer interface.
- ChordPro paste/file import, metadata, lyrics, sections, strumming pattern and local persistence.
- Tone.js plucked-string renderer, count-in, automatic strumming, chord diagrams, lyric view, queue and timeline.
- Netlify SPA redirects and camera/microphone permissions headers.

## Gaps found and addressed

- **Global six-chord allowlist:** parser and storage validation depended on a six-entry voicing table. Replaced that dependency with a global chord-name/harmony parser and generated guitar voicings, so Ab/Fm/Db/Eb import and play while each song still supports at most six unique mapped chords.
- **Gesture slot safety:** gesture 0 is explicitly reserved for mute; the importer reports songs with more than six unique chord gestures.
- **Empty Learn page:** replaced the placeholder with a separate real-guitar chord explorer and paced G–D–Em–C exercise.
- **Incomplete handoff documentation:** replaced the stale README with setup, import, training, deployment and known-limit instructions.
- **Missing model artifact:** confirmed the archive has no trained weights. The classifier already handles that honestly and provides keyboard play; users can record data and train a model rather than receiving fabricated weights.
- Added regression coverage for Ab/Fm/Db/Eb imports and the six-chord song limit.

## Remaining product work

- Microphone pitch feedback and session recording.
- Real-guitar camera fretboard calibration/position analysis; current Learn mode is a visual practice aid, not computer vision.
- Collect and evaluate representative gesture data, then include an appropriately validated model if distribution permits.
- MIDI output is an interface implementation; browser MIDI requires explicit device/permission handling and hardware validation.
- Verify the final visual match against the reference screenshot when available; it was not included in the archive.
