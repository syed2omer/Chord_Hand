# ml/

Trains the gesture classifier from data recorded in the app.

1. Run the app, open **Train model**, and record every gesture (both hands, a few distances, several takes each).
2. Press **Export dataset**. The browser downloads `chordhand-dataset.json` (usually into your Downloads folder).
3. From the project root, create a virtual environment in a short Windows path. TensorFlow contains deeply nested header filenames; installing it into a long user-site path can fail unless Windows long paths are enabled.

   ```powershell
   py -3.11 -m venv C:\chordhand-venv
   C:\chordhand-venv\Scripts\python.exe -m pip install --upgrade pip
   C:\chordhand-venv\Scripts\python.exe -m pip install -r ml/requirements.txt
   ```

4. Train using the actual path to the exported dataset. For the default Downloads location:

   ```powershell
   C:\chordhand-venv\Scripts\python.exe ml/train_gesture.py "$env:USERPROFILE\Downloads\chordhand-dataset.json"
   ```

   If the file was saved elsewhere, replace that path with its real location. To check the Downloads folder:

   ```powershell
   Get-ChildItem "$env:USERPROFILE\Downloads\chordhand-dataset*.json"
   ```

   `path/to/chordhand-dataset.json` is only an example placeholder; do not type it literally. `python -m pip` also avoids the Windows warning about pip-installed scripts missing from `PATH`.

The script splits by recording take (so near-identical frames never leak into the test set), augments training data
with 3D tilt and jitter, trains a small MLP, prints accuracy and a confusion matrix, and writes
`public/models/gesture/model.json`, which the app loads. Reports go to `ml/out/`.

The model is exported as plain weights (`chordhand-mlp-v1`) and run with a few lines of TypeScript, which avoids the
fragile Keras-to-TensorFlow.js converter.

`train_gesture.py` re-implements `src/features/gesture/normalize.ts` and refuses to train if the two disagree.
The browser export rounds values to five decimal places; the trainer allows only the small numerical difference
that rounding can introduce and still stops for a larger feature mismatch.
Classes: GESTURE_0 to GESTURE_5, GESTURE_THUMB, UNKNOWN.
