# ChordHand

ChordHand is a hand-in-air virtual guitar and karaoke app. Choose a song, sing its lyrics, show the assigned hand gesture when a chord is due, and let the app strum it. A separate Learn page helps with a real guitar.

## Run locally

Requires Node.js 22.12+ (or 24+).

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. Camera and microphone access require localhost or HTTPS. To make a production build, run `npm run build`; `npm test` runs the project checks.

## Play songs

The Songs page includes public-domain traditional examples. Use **Import** to paste a ChordPro sheet or upload `.cho`, `.chopro`, `.chordpro`, `.pro`, `.crd` or `.txt`. Songs are saved in this browser only. ChordHand does not fetch lyrics from the internet.

Chord names are parsed independently from gestures. All chromatic major and minor chords (including Ab, Fm, Db and Eb) are supported, along with common seventh, suspended, diminished, augmented, sixth and add9 qualities. Each song can use up to six unique chord gestures; gesture 0 is reserved for mute. If no `{gestures: ...}` directive is given, chords are assigned in order of first appearance.

Example:

```text
{title: My Song}
{artist: Me}
{key: Ab}
{tempo: 90}
{time: 4/4}
{strum: D - D U - U}
{gestures: 1=Ab 2=Fm 3=Db 4=Eb}

{start_of_verse: Verse 1}
[Ab]Words go [Fm]here
[Db]Sing the [Eb]line
{end_of_verse}
```

When a chord has no hand-crafted fingering, ChordHand calculates a playable guitar shape from its chord tones. Chords beyond the implemented qualities are reported as unsupported with an actionable import error.

## Camera gestures and model training

MediaPipe tracks and draws hand landmarks. A small in-app classifier uses a model at `public/models/gesture/model.json`; the archive does not include trained weights because a useful model requires recorded gesture data. Until you train and add that model, the player clearly reports that camera gestures are unavailable and still supports keyboard controls (1–5, 0 for mute, T for thumb).

To train it, open **Train model**, record varied takes for every class with both hands, export the dataset, then follow the instructions in [`ml/README.md`](ml/README.md). Training requires Python and the packages in `ml/requirements.txt`. Review the printed metrics and confusion matrix before using a model. Do not treat a model trained on a small or unbalanced personal dataset as reliable for other people.

## Deployment

The app is a single Vite/React/TypeScript site with `ml/` beside it. `netlify.toml` builds `dist`, configures SPA routes, and grants same-origin camera/microphone permissions. Deploy the repository to Netlify with the default build settings. If deployed below a URL subpath, configure Vite's `base` accordingly.

## Included features

- ChordPro parsing, validation, preview, local song storage and editable per-song gesture mapping.
- Lyrics, section labels, progression queue, synchronized chord changes and automatic strumming.
- Tone.js/Web Audio guitar tones, count-in, session controls and MIDI renderer interface.
- MediaPipe hand tracking with a visible landmark overlay, MLP inference and gesture smoothing.
- Browser-local gesture dataset recorder and Python training/export pipeline.
- Real-guitar chord diagrams and a paced beginner chord-change exercise.

Pitch detection, session recording, automatic fretboard recognition and an included pretrained gesture model are not implemented. See [`docs/PHASE9_AUDIT.md`](docs/PHASE9_AUDIT.md) for the archive audit and continuation notes.
