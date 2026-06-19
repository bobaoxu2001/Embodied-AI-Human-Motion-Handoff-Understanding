"""Stdlib baseline models for the self-recorded MVP — **no torch / numpy required**.

These are honest *baselines* over pooled keypoint features so the whole
train→eval loop runs on a tiny local dataset with zero ML dependencies (and in
CI). For the deeper GRU/TCN models use `train.py --backend torch`
(needs `requirements-ml.txt`).

- **action**  : multinomial logistic regression (softmax) over per-clip pooled
                keypoint features → one of 7 classes.
- **intent**  : binary logistic regression (handoff vs non-handoff) over the same
                features (incl. wrist-motion stats).
- **trajectory**: constant-velocity heuristic (no training) → ADE / FDE. Labelled
                as a heuristic, not a learned model.

Checkpoints are JSON (portable, git-ignored under ml/weights/).
"""

import csv
import json
import math
from pathlib import Path
from typing import Dict, List, Optional, Tuple

# 7-class collection taxonomy (see docs/dataset_collection_guide.md).
ACTIONS = ["idle", "walking", "reaching", "grasping", "placing", "pointing", "handoff"]
R_WRIST = 10  # index of the right wrist in the 17-joint body layout


# --------------------------------------------------------------------------- #
# IO
# --------------------------------------------------------------------------- #
def read_manifest(path) -> List[dict]:
    with open(path, newline="") as f:
        return list(csv.DictReader(f))


def load_frames(keypoints_dir, clip_id: str) -> Optional[List[dict]]:
    p = Path(keypoints_dir) / f"{clip_id}.json"
    if not p.exists():
        return None
    try:
        return json.loads(p.read_text())["frames"]
    except Exception:
        return None


def rows_for_split(rows: List[dict], split: Optional[str]) -> List[dict]:
    if not split:
        return rows
    sel = [r for r in rows if r.get("split") == split]
    return sel or rows  # fall back to all rows if the split is empty/unassigned


# --------------------------------------------------------------------------- #
# features — fixed-length per-clip vector (robust to clip length)
# --------------------------------------------------------------------------- #
def _wrist(frame) -> Tuple[float, float]:
    b = frame["body"]
    if len(b) > R_WRIST:
        return b[R_WRIST][0], b[R_WRIST][1]
    return 0.0, 0.0


def clip_feature(frames: List[dict]) -> List[float]:
    """Pool a variable-length clip into a fixed 74-d feature vector."""
    n = max(1, len(frames))
    n_joints = 17
    sx = [0.0] * n_joints
    sy = [0.0] * n_joints
    sx2 = [0.0] * n_joints
    sy2 = [0.0] * n_joints
    for fr in frames:
        body = fr["body"]
        for j in range(n_joints):
            x, y = (body[j][0], body[j][1]) if j < len(body) else (0.0, 0.0)
            sx[j] += x
            sy[j] += y
            sx2[j] += x * x
            sy2[j] += y * y
    mean_x = [sx[j] / n for j in range(n_joints)]
    mean_y = [sy[j] / n for j in range(n_joints)]
    std_x = [math.sqrt(max(0.0, sx2[j] / n - mean_x[j] ** 2)) for j in range(n_joints)]
    std_y = [math.sqrt(max(0.0, sy2[j] / n - mean_y[j] ** 2)) for j in range(n_joints)]

    # wrist motion
    speeds, path_len = [], 0.0
    prev = None
    for fr in frames:
        w = _wrist(fr)
        if prev is not None:
            d = math.hypot(w[0] - prev[0], w[1] - prev[1])
            speeds.append(d)
            path_len += d
        prev = w
    mean_speed = sum(speeds) / len(speeds) if speeds else 0.0
    max_speed = max(speeds) if speeds else 0.0
    w0, wl = _wrist(frames[0]), _wrist(frames[-1])
    net_disp = math.hypot(wl[0] - w0[0], wl[1] - w0[1])

    # hand presence + spread
    present, spreads = 0, []
    for fr in frames:
        hand = fr.get("hand_right") or []
        if hand:
            present += 1
            wx, wy = hand[0][0], hand[0][1]
            spreads.append(sum(math.hypot(p[0] - wx, p[1] - wy) for p in hand) / len(hand))
    hand_ratio = present / n
    hand_spread = sum(spreads) / len(spreads) if spreads else 0.0

    return (
        mean_x + mean_y + std_x + std_y
        + [mean_speed, max_speed, path_len, net_disp, hand_ratio, hand_spread]
    )  # 17*4 + 6 = 74


def build_clip_dataset(rows, keypoints_dir, require_label=True):
    """Return (feats, labels, clip_ids) for clips that have keypoints."""
    feats, labels, ids = [], [], []
    for r in rows:
        frames = load_frames(keypoints_dir, r["clip_id"])
        if not frames:
            continue
        lab = r.get("label", "unlabeled")
        if require_label and lab not in ACTIONS:
            continue
        feats.append(clip_feature(frames))
        labels.append(lab)
        ids.append(r["clip_id"])
    return feats, labels, ids


# --------------------------------------------------------------------------- #
# standardization + linear algebra (pure python)
# --------------------------------------------------------------------------- #
def fit_standardizer(feats: List[List[float]]):
    n = len(feats)
    d = len(feats[0])
    mean = [sum(f[i] for f in feats) / n for i in range(d)]
    std = [
        math.sqrt(max(1e-8, sum((f[i] - mean[i]) ** 2 for f in feats) / n))
        for i in range(d)
    ]
    return mean, std


def standardize(f, mean, std):
    return [(f[i] - mean[i]) / std[i] for i in range(len(f))]


def _softmax(z):
    m = max(z)
    e = [math.exp(v - m) for v in z]
    s = sum(e)
    return [v / s for v in e]


# --------------------------------------------------------------------------- #
# action — multinomial logistic regression
# --------------------------------------------------------------------------- #
def train_action(feats, labels, epochs=300, lr=0.5, l2=1e-3, seed=0):
    classes = ACTIONS
    cidx = {c: i for i, c in enumerate(classes)}
    mean, std = fit_standardizer(feats)
    X = [standardize(f, mean, std) for f in feats]
    Y = [cidx[l] for l in labels]
    C, D, N = len(classes), len(X[0]), len(X)
    W = [[0.0] * D for _ in range(C)]
    b = [0.0] * C
    for _ in range(epochs):
        gW = [[0.0] * D for _ in range(C)]
        gb = [0.0] * C
        for x, y in zip(X, Y):
            z = [sum(W[c][i] * x[i] for i in range(D)) + b[c] for c in range(C)]
            p = _softmax(z)
            for c in range(C):
                err = p[c] - (1.0 if c == y else 0.0)
                gb[c] += err
                for i in range(D):
                    gW[c][i] += err * x[i]
        for c in range(C):
            b[c] -= lr * gb[c] / N
            for i in range(D):
                W[c][i] -= lr * (gW[c][i] / N + l2 * W[c][i])
    ckpt = {
        "backend": "baseline", "model": "action", "kind": "softmax_regression",
        "actions": classes, "feat_mean": mean, "feat_std": std, "W": W, "b": b,
    }
    ckpt["train_acc"] = sum(1 for x, y in zip(X, Y) if _argmax([
        sum(W[c][i] * x[i] for i in range(D)) + b[c] for c in range(C)]) == y) / N
    return ckpt


def _argmax(z):
    best, bi = z[0], 0
    for i, v in enumerate(z):
        if v > best:
            best, bi = v, i
    return bi


def predict_action(ckpt, feat) -> str:
    x = standardize(feat, ckpt["feat_mean"], ckpt["feat_std"])
    W, b, classes = ckpt["W"], ckpt["b"], ckpt["actions"]
    z = [sum(W[c][i] * x[i] for i in range(len(x))) + b[c] for c in range(len(classes))]
    return classes[_argmax(z)]


# --------------------------------------------------------------------------- #
# intent — binary logistic regression (handoff vs rest)
# --------------------------------------------------------------------------- #
def train_intent(feats, labels, epochs=400, lr=0.5, l2=1e-3):
    mean, std = fit_standardizer(feats)
    X = [standardize(f, mean, std) for f in feats]
    Y = [1.0 if l == "handoff" else 0.0 for l in labels]
    D, N = len(X[0]), len(X)
    w = [0.0] * D
    b = 0.0
    for _ in range(epochs):
        gw = [0.0] * D
        gb = 0.0
        for x, y in zip(X, Y):
            z = sum(w[i] * x[i] for i in range(D)) + b
            p = 1.0 / (1.0 + math.exp(-z))
            err = p - y
            gb += err
            for i in range(D):
                gw[i] += err * x[i]
        b -= lr * gb / N
        for i in range(D):
            w[i] -= lr * (gw[i] / N + l2 * w[i])
    return {
        "backend": "baseline", "model": "intent", "kind": "logistic_regression",
        "feat_mean": mean, "feat_std": std, "w": w, "b": b, "threshold": 0.5,
    }


def predict_intent_score(ckpt, feat) -> float:
    x = standardize(feat, ckpt["feat_mean"], ckpt["feat_std"])
    z = sum(ckpt["w"][i] * x[i] for i in range(len(x))) + ckpt["b"]
    return 1.0 / (1.0 + math.exp(-z))


# --------------------------------------------------------------------------- #
# trajectory — constant-velocity heuristic (no training)
# --------------------------------------------------------------------------- #
def trajectory_sequences(rows, keypoints_dir, t_in=10, horizon=30, step=5):
    """Build {pred, gt} wrist sequences using a constant-velocity predictor."""
    seqs = []
    for r in rows:
        frames = load_frames(keypoints_dir, r["clip_id"])
        if not frames:
            continue
        track = [list(_wrist(fr)) for fr in frames]
        for i in range(0, len(track) - t_in - horizon, step):
            hist = track[i : i + t_in]
            gt = track[i + t_in : i + t_in + horizon]
            vx = (hist[-1][0] - hist[0][0]) / max(1, len(hist) - 1)
            vy = (hist[-1][1] - hist[0][1]) / max(1, len(hist) - 1)
            last = hist[-1]
            pred = [[last[0] + vx * (k + 1), last[1] + vy * (k + 1)] for k in range(horizon)]
            seqs.append({"pred": pred, "gt": gt})
    return seqs


# --------------------------------------------------------------------------- #
# checkpoint IO
# --------------------------------------------------------------------------- #
def save_ckpt(ckpt: Dict, out) -> Path:
    out = Path(out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(ckpt))
    return out


def load_ckpt(path) -> Dict:
    return json.loads(Path(path).read_text())
