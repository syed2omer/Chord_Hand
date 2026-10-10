export type GestureClass =
  | 'GESTURE_0' | 'GESTURE_1' | 'GESTURE_2' | 'GESTURE_3' | 'GESTURE_4' | 'GESTURE_5'
  | 'GESTURE_THUMB' | 'UNKNOWN'

/** Order matters: it is the model's output order. Keep in sync with ml/train_gesture.py. */
export const GESTURE_CLASSES: GestureClass[] = [
  'GESTURE_0', 'GESTURE_1', 'GESTURE_2', 'GESTURE_3', 'GESTURE_4', 'GESTURE_5', 'GESTURE_THUMB', 'UNKNOWN',
]

export const GESTURE_HELP: Record<GestureClass, { title: string; how: string }> = {
  GESTURE_0: { title: 'Fist', how: 'Close your hand into a fist, thumb across the fingers.' },
  GESTURE_1: { title: '1 finger', how: 'Raise only your index finger. Other fingers and thumb curled in.' },
  GESTURE_2: { title: '2 fingers', how: 'Raise index and middle fingers. Others curled in.' },
  GESTURE_3: { title: '3 fingers', how: 'Raise index, middle and ring fingers. Pinky and thumb curled in.' },
  GESTURE_4: { title: '4 fingers', how: 'Raise all four fingers with your thumb tucked across your palm.' },
  GESTURE_5: { title: '5 fingers', how: 'Open palm, all five fingers spread.' },
  GESTURE_THUMB: { title: 'Thumb', how: 'Only your thumb out, like a thumbs-up or a hitchhiker. Fingers curled.' },
  UNKNOWN: { title: 'Everything else', how: 'Relaxed hand, half-formed shapes, pointing sideways, moving between gestures. This teaches the model when to say “not sure”.' },
}
