import { FEATURE_SIZE, FEATURE_VERSION } from './normalize'
import { GESTURE_CLASSES, type GestureClass } from './gestureTypes'

export interface MlpLayer { activation: 'relu' | 'softmax' | 'linear'; W: number[][]; b: number[] }
export interface MlpModel {
  format: 'chordhand-mlp-v1'
  featureVersion: number
  inputSize: number
  classes: string[]
  layers: MlpLayer[]
  testAccuracy?: number
}
export interface Prediction { label: GestureClass; confidence: number; probs: number[] }

export class ModelMissingError extends Error {}
export class ModelInvalidError extends Error {}

function validate(m: MlpModel): MlpModel {
  if (m?.format !== 'chordhand-mlp-v1') throw new ModelInvalidError('Unknown model format.')
  if (m.featureVersion !== FEATURE_VERSION) throw new ModelInvalidError('Model was trained with different features. Retrain it.')
  if (m.inputSize !== FEATURE_SIZE) throw new ModelInvalidError('Model input size does not match.')
  if (m.classes.join() !== GESTURE_CLASSES.join()) throw new ModelInvalidError('Model classes do not match the app.')
  let width = m.inputSize
  for (const l of m.layers) {
    if (l.W.length !== width || l.W.some((row) => row.length !== l.b.length)) throw new ModelInvalidError('Model layer shapes do not line up.')
    width = l.b.length
  }
  if (width !== GESTURE_CLASSES.length) throw new ModelInvalidError('Model output size does not match.')
  return m
}

/** Runs the exported MLP in plain TypeScript. It's ~10k multiplies per frame. */
export class GestureClassifier {
  private constructor(private model: MlpModel) {}

  static fromModel(m: MlpModel) { return new GestureClassifier(validate(m)) }

  static async load(url: string): Promise<GestureClassifier> {
    const res = await fetch(url)
    if (!res.ok) throw new ModelMissingError('No trained model found.')
    const text = await res.text()
    // A dev server answers unknown files with index.html; treat that as "no model".
    if (text.trimStart().startsWith('<')) throw new ModelMissingError('No trained model found.')
    let json: MlpModel
    try { json = JSON.parse(text) } catch { throw new ModelInvalidError('The model file is damaged.') }
    return GestureClassifier.fromModel(json)
  }

  get testAccuracy() { return this.model.testAccuracy }

  predict(features: number[]): Prediction {
    let x = features
    for (const layer of this.model.layers) {
      const out = layer.b.slice()
      for (let i = 0; i < x.length; i++) {
        const xi = x[i]
        if (xi === 0) continue
        const row = layer.W[i]
        for (let j = 0; j < out.length; j++) out[j] += xi * row[j]
      }
      if (layer.activation === 'relu') for (let j = 0; j < out.length; j++) out[j] = Math.max(0, out[j])
      else if (layer.activation === 'softmax') {
        const max = Math.max(...out)
        let sum = 0
        for (let j = 0; j < out.length; j++) { out[j] = Math.exp(out[j] - max); sum += out[j] }
        for (let j = 0; j < out.length; j++) out[j] /= sum
      }
      x = out
    }
    let best = 0
    for (let j = 1; j < x.length; j++) if (x[j] > x[best]) best = j
    return { label: GESTURE_CLASSES[best], confidence: x[best], probs: x }
  }
}
