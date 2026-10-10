"""
Train the Chord Hand gesture classifier from a dataset exported by the /train page.

    python ml/train_gesture.py chordhand-dataset.json

Outputs:
    public/models/gesture/model.json   weights the browser loads (a small MLP, no TensorFlow.js needed)
    ml/out/confusion_matrix.png        test-set confusion matrix
    ml/out/report.txt                  accuracy and per-class metrics
"""
from __future__ import annotations

import argparse
import json
import random
from pathlib import Path

import numpy as np

CLASSES = ["GESTURE_0", "GESTURE_1", "GESTURE_2", "GESTURE_3", "GESTURE_4", "GESTURE_5", "GESTURE_THUMB", "UNKNOWN"]
FEATURE_VERSION = 1
ROOT = Path(__file__).resolve().parent.parent
# The browser export rounds both raw landmarks and normalized features to 5 decimal places.
# Re-normalizing rounded landmarks can amplify that tiny quantization near the wrist/palm axis.
MAX_EXPORT_ROUNDING_ERROR = 2e-3


# --- Port of src/features/gesture/normalize.ts. Keep the two in sync. -------------------------

def prep(raw: np.ndarray, hands: np.ndarray, aspects: np.ndarray) -> np.ndarray:
    """raw (N,63) -> wrist-centred, aspect-corrected, left hands mirrored: (N,21,3)."""
    pts = raw.reshape(-1, 21, 3).astype(np.float64).copy()
    pts[:, :, 0] *= aspects[:, None]
    pts[:, :, 2] *= aspects[:, None]
    pts -= pts[:, 0:1, :]
    left = hands == "Left"
    pts[left, :, 0] *= -1
    return pts


def canon(pts: np.ndarray) -> np.ndarray:
    """(N,21,3) -> (N,63): rotate middle knuckle upright, divide by palm size."""
    m = pts[:, 9, :2]
    scale = np.maximum(np.hypot(m[:, 0], m[:, 1]), 1e-6)
    d = -np.pi / 2 - np.arctan2(m[:, 1], m[:, 0])
    c, s = np.cos(d)[:, None], np.sin(d)[:, None]
    x, y, z = pts[:, :, 0], pts[:, :, 1], pts[:, :, 2]
    xr = (x * c - y * s) / scale[:, None]
    yr = (x * s + y * c) / scale[:, None]
    zr = z / scale[:, None]
    return np.stack([xr, yr, zr], axis=2).reshape(len(pts), 63)


# --- Augmentation: things normalisation does NOT already remove --------------------------------

def augment(pts: np.ndarray, rng: np.random.Generator, copies: int) -> np.ndarray:
    """Random 3D tilt (pitch/yaw up to 25 degrees) plus per-joint jitter. Returns (N*copies,63)."""
    out = []
    for _ in range(copies):
        n = len(pts)
        a = np.deg2rad(rng.uniform(-25, 25, n))  # pitch, about x
        b = np.deg2rad(rng.uniform(-25, 25, n))  # yaw, about y
        ca, sa, cb, sb = np.cos(a), np.sin(a), np.cos(b), np.sin(b)
        rx = np.zeros((n, 3, 3)); ry = np.zeros((n, 3, 3))
        rx[:, 0, 0] = 1; rx[:, 1, 1] = ca; rx[:, 1, 2] = -sa; rx[:, 2, 1] = sa; rx[:, 2, 2] = ca
        ry[:, 1, 1] = 1; ry[:, 0, 0] = cb; ry[:, 0, 2] = sb; ry[:, 2, 0] = -sb; ry[:, 2, 2] = cb
        tilted = np.einsum("nij,nkj->nki", rx @ ry, pts)
        palm = np.hypot(pts[:, 9, 0], pts[:, 9, 1])[:, None, None]
        tilted = tilted + rng.normal(0, 0.02, tilted.shape) * palm
        out.append(canon(tilted))
    return np.concatenate(out)


# --- Splitting by take, so near-identical consecutive frames never leak across splits -----------

def split_by_take(labels: np.ndarray, takes: np.ndarray, seed: int, ratios=(0.7, 0.15, 0.15)):
    rng = random.Random(seed)
    train, val, test = [], [], []
    warned = []
    for cls in sorted(set(labels)):
        idx = np.where(labels == cls)[0]
        cls_takes = sorted(set(takes[idx]))
        rng.shuffle(cls_takes)
        if len(cls_takes) < 3:
            warned.append(cls)
            idx = list(idx); rng.shuffle(idx)
            a, b = int(len(idx) * ratios[0]), int(len(idx) * (ratios[0] + ratios[1]))
            train += idx[:a]; val += idx[a:b]; test += idx[b:]
            continue
        n = len(cls_takes)
        n_val = max(1, round(n * ratios[1])); n_test = max(1, round(n * ratios[2]))
        t_test, t_val, t_train = set(cls_takes[:n_test]), set(cls_takes[n_test:n_test + n_val]), set(cls_takes[n_test + n_val:])
        for i in idx:
            (test if takes[i] in t_test else val if takes[i] in t_val else train).append(i)
    return np.array(train), np.array(val), np.array(test), warned


def load(path: Path):
    path = path.expanduser()
    if not path.is_file():
        raise SystemExit(
            f"Dataset file not found: {path.resolve()}\n"
            "Export chordhand-dataset.json from the app's Train model page, then pass its actual path.\n"
            'PowerShell example: python ml/train_gesture.py "$env:USERPROFILE\\Downloads\\chordhand-dataset.json"'
        )
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise SystemExit(f"Could not read dataset file {path}: {exc}") from exc
    if data.get("format") != "chordhand-dataset":
        raise SystemExit("That file is not a Chord Hand dataset. Export one from the /train page.")
    if data.get("featureVersion") != FEATURE_VERSION:
        raise SystemExit(f"Dataset feature version {data.get('featureVersion')} != {FEATURE_VERSION}. Re-record or update this script.")
    s = data["samples"]
    raw = np.array([x["landmarks"] for x in s], dtype=np.float64)
    feats = np.array([x["features"] for x in s], dtype=np.float64)
    hands = np.array([x["hand"] for x in s])
    aspects = np.array([x["aspect"] for x in s], dtype=np.float64)
    labels = np.array([x["label"] for x in s])
    takes = np.array([x["take"] for x in s])
    return raw, feats, hands, aspects, labels, takes


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("dataset", type=Path)
    ap.add_argument("--epochs", type=int, default=80)
    ap.add_argument("--aug", type=int, default=4, help="augmented copies per training sample")
    ap.add_argument("--seed", type=int, default=7)
    args = ap.parse_args()

    raw, feats, hands, aspects, labels, takes = load(args.dataset)
    pts = prep(raw, hands, aspects)

    # Guard against the browser and Python disagreeing about the maths. Exported values are
    # rounded to 5 decimals by dataset.ts, so allow their small propagated quantization error.
    err = np.abs(canon(pts) - feats).max()
    if err > MAX_EXPORT_ROUNDING_ERROR:
        raise SystemExit(
            f"Feature mismatch between browser and Python (max error {err:.4f}; "
            f"allowed export-rounding error {MAX_EXPORT_ROUNDING_ERROR:.4f}). "
            "Do not train; check that this dataset was exported by the same ChordHand project version."
        )
    if err > 1e-3:
        print(f"Note: feature difference {err:.4f} is within the expected error from 5-decimal dataset export rounding.")

    missing = [c for c in CLASSES if c not in set(labels)]
    if missing:
        raise SystemExit(f"No samples for: {', '.join(missing)}. Record them in /train first.")

    y = np.array([CLASSES.index(l) for l in labels])
    tr, va, te, warned = split_by_take(labels, takes, args.seed)
    if warned:
        print(f"WARNING: fewer than 3 takes for {warned}. Split by frame instead, so test accuracy will look better than it is.")
    print(f"train {len(tr)}  val {len(va)}  test {len(te)}")

    rng = np.random.default_rng(args.seed)
    x_tr = np.concatenate([canon(pts[tr]), augment(pts[tr], rng, args.aug)])
    y_tr = np.concatenate([y[tr]] * (1 + args.aug))
    x_va, y_va = canon(pts[va]), y[va]
    x_te, y_te = canon(pts[te]), y[te]

    import tensorflow as tf  # imported late so the data code above can be tested without it
    tf.keras.utils.set_random_seed(args.seed)
    model = tf.keras.Sequential([
        tf.keras.layers.Input(shape=(63,)),
        tf.keras.layers.Dense(64, activation="relu"),
        tf.keras.layers.Dropout(0.2),
        tf.keras.layers.Dense(32, activation="relu"),
        tf.keras.layers.Dense(len(CLASSES), activation="softmax"),
    ])
    model.compile(optimizer="adam", loss="sparse_categorical_crossentropy", metrics=["accuracy"])
    model.fit(
        x_tr, y_tr, validation_data=(x_va, y_va), epochs=args.epochs, batch_size=64, verbose=2,
        callbacks=[tf.keras.callbacks.EarlyStopping(patience=10, restore_best_weights=True)],
    )

    from sklearn.metrics import classification_report, confusion_matrix
    pred = model.predict(x_te, verbose=0).argmax(axis=1)
    acc = float((pred == y_te).mean())
    cm = confusion_matrix(y_te, pred, labels=range(len(CLASSES)))
    report = classification_report(y_te, pred, labels=range(len(CLASSES)), target_names=CLASSES, zero_division=0)
    print(f"\nTest accuracy: {acc:.3f}\n{report}\nConfusion matrix (rows = true, cols = predicted):\n{cm}")

    out = ROOT / "ml" / "out"; out.mkdir(parents=True, exist_ok=True)
    (out / "report.txt").write_text(f"test accuracy {acc:.4f}\n\n{report}\n{cm}\n")
    try:
        import matplotlib; matplotlib.use("Agg")
        import matplotlib.pyplot as plt
        fig, ax = plt.subplots(figsize=(7, 6))
        ax.imshow(cm, cmap="YlOrBr")
        ax.set_xticks(range(len(CLASSES)), CLASSES, rotation=45, ha="right"); ax.set_yticks(range(len(CLASSES)), CLASSES)
        for i in range(len(CLASSES)):
            for j in range(len(CLASSES)):
                ax.text(j, i, cm[i, j], ha="center", va="center")
        ax.set_xlabel("predicted"); ax.set_ylabel("true"); fig.tight_layout(); fig.savefig(out / "confusion_matrix.png", dpi=150)
    except ImportError:
        print("matplotlib not installed; skipped the confusion matrix image.")

    layers = []
    for layer in model.layers:
        if isinstance(layer, tf.keras.layers.Dense):
            w, b = layer.get_weights()
            layers.append({"activation": layer.activation.__name__, "W": np.round(w, 6).tolist(), "b": np.round(b, 6).tolist()})
    dest = ROOT / "public" / "models" / "gesture"; dest.mkdir(parents=True, exist_ok=True)
    (dest / "model.json").write_text(json.dumps({
        "format": "chordhand-mlp-v1", "featureVersion": FEATURE_VERSION, "inputSize": 63,
        "classes": CLASSES, "layers": layers, "testAccuracy": round(acc, 4),
    }))
    print(f"Saved {dest / 'model.json'}")


if __name__ == "__main__":
    main()
