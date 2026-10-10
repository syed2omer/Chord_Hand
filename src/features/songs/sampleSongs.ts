import type { Song } from './schema'

// Both songs are traditional / public domain. Imported songs use ChordPro (Phase 9).
export const SAMPLE_SONGS: Song[] = [
  {
    schemaVersion: 1,
    id: 'amazing-grace',
    title: 'Amazing Grace',
    artist: 'Traditional',
    key: 'G',
    tempo: 84,
    timeSignature: '3/4',
    beatsPerChord: 3,
    difficulty: 'Beginner',
    gestureMapping: {
      GESTURE_0: 'MUTE',
      GESTURE_1: 'G',
      GESTURE_2: 'C',
      GESTURE_3: 'D',
      GESTURE_4: 'Em',
    },
    strummingPattern: { steps: ['D', '-', 'D', 'U', 'D', 'U'] },
    sections: [
      {
        name: 'Verse 1',
        lines: [
          { segments: [{ text: 'A-' }, { chord: 'G', text: 'mazing grace, how ' }, { chord: 'C', text: 'sweet the ' }, { chord: 'G', text: 'sound' }] },
          { segments: [{ text: 'That saved a ' }, { chord: 'Em', text: 'wretch like ' }, { chord: 'D', text: 'me' }] },
          { segments: [{ text: 'I ' }, { chord: 'G', text: 'once was lost, but ' }, { chord: 'C', text: 'now am ' }, { chord: 'G', text: 'found' }] },
          { segments: [{ text: 'Was ' }, { chord: 'Em', text: 'blind, but ' }, { chord: 'D', text: 'now I ' }, { chord: 'G', text: 'see' }] },
        ],
      },
    ],
  },
  {
    schemaVersion: 1,
    id: 'when-the-saints',
    title: 'When the Saints Go Marching In',
    artist: 'Traditional',
    key: 'C',
    tempo: 100,
    timeSignature: '4/4',
    beatsPerChord: 4,
    difficulty: 'Beginner',
    gestureMapping: {
      GESTURE_0: 'MUTE',
      GESTURE_1: 'C',
      GESTURE_2: 'F',
      GESTURE_3: 'G',
    },
    strummingPattern: { steps: ['D', '-', 'D', 'U', '-', 'U', 'D', 'U'] },
    sections: [
      {
        name: 'Chorus',
        lines: [
          { segments: [{ text: 'Oh, when the ' }, { chord: 'C', text: 'saints go marching in' }] },
          { segments: [{ text: 'Oh, when the saints go marching in' }] },
          { segments: [{ text: 'Oh, ' }, { chord: 'F', text: 'Lord, I want to be in that ' }, { chord: 'C', text: 'number' }] },
          { segments: [{ text: 'When the ' }, { chord: 'G', text: 'saints go ' }, { chord: 'C', text: 'marching in' }] },
        ],
      },
    ],
  },
  {
    schemaVersion: 1,
    id: 'perfect',
    title: 'Perfect',
    artist: 'Ed Sheeran',
    key: 'C',
    tempo: 63,
    timeSignature: '12/8',
    beatsPerChord: 4,
    stepsPerBeat: 3,
    difficulty: 'Beginner',
    // Simplified chord version in C. Lyrics are copyrighted, so they are not included.
    lyricsNotIncluded: true,
    gestureMapping: {
      GESTURE_0: 'MUTE',
      GESTURE_1: 'C',
      GESTURE_2: 'G',
      GESTURE_3: 'Am',
      GESTURE_4: 'F',
    },
    strummingPattern: { steps: ['D', '-', 'D', 'U', '-', 'U'] },
    sections: [
      {
        name: 'Verse chords',
        lines: [
          { segments: [{ chord: 'C', text: 'Your lyrics go here   ' }, { chord: 'Am', text: '      ' }, { chord: 'F', text: '      ' }, { chord: 'G', text: '      ' }] },
          { segments: [{ chord: 'C', text: '      ' }, { chord: 'Am', text: '      ' }, { chord: 'F', text: '      ' }, { chord: 'G', text: '      ' }] },
        ],
      },
      {
        name: 'Chorus chords',
        lines: [
          { segments: [{ chord: 'F', text: '      ' }, { chord: 'C', text: '      ' }, { chord: 'G', text: '      ' }, { chord: 'Am', text: '      ' }] },
          { segments: [{ chord: 'F', text: '      ' }, { chord: 'C', text: '      ' }, { chord: 'G', text: '      ' }, { chord: 'C', text: '      ' }] },
        ],
      },
    ],
  },
]

export const getSong = (id: string) => SAMPLE_SONGS.find((s) => s.id === id)
