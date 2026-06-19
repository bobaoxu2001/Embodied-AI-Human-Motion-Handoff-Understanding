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


def _clip_id(row) -> str:
    """Support both the self-recorded manifest (clip_id) and the normalized
    public-dataset manifest (sample_id)."""
    return row.get("clip_id") or row.get("sample_id") or ""


def _action_of(row) -> str:
    """Prefer action_label (normalized manifest), fall back to label."""
    return (row.get("action_label") or "").strip() or (row.get("label") or "unlabeled")


def build_clip_dataset(rows, keypoints_dir, require_label=True):
    """Return (feats, labels, clip_ids) for clips that have keypoints."""
    feats, labels, ids = [], [], []
    for r in rows:
        cid = _clip_id(r)
        frames = load_frames(keypoints_dir, cid)
        if not frames:
            continue
        lab = _action_of(r)
        if require_label and lab not in ACTIONS:
            continue
        feats.append(clip_feature(frames))
        labels.append(lab)
        ids.append(cid)
    return feats, labels, ids


def intent_target(row, has_intent_col: bool):
    """Return 1 (handoff) / 0 (non_handoff) / None (unknown → skip).

    With a normalized manifest (intent_label column present) we trust intent_label
    and SKIP unknowns — we never fabricate negatives for non-handover datasets. For
    the self-recorded manifest (no intent_label column) every action is usable:
    handoff = positive, everything else = negative.
    """
    if has_intent_col:
        il = (row.get("intent_label") or "").strip()
        if il == "handoff":
            return 1
        if il == "non_handoff":
            return 0
        return None  # unknown → skip
    return 1 if _action_of(row) == "handoff" else 0


def build_intent_dataset(rows, keypoints_dir):
    """Return (feats, y, ids) for intent training (handoff vs non_handoff)."""
    has_intent_col = any("intent_label" in r for r in rows)
    feats, y, ids = [], [], []
    for r in rows:
        cid = _clip_id(r)
        frames = load_frames(keypoints_dir, cid)
        if not frames:
            continue
        t = intent_target(r, has_intent_col)
        if t is None:
            continue
        feats.append(clip_feature(frames))
        y.append(t)
        ids.append(cid)
    return feats, y, ids


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
def train_intent(feats, y, epochs=400, lr=0.5, l2=1e-3):
    mean, std = fit_standardizer(feats)
    X = [standardize(f, mean, std) for f in feats]
    Y = [float(v) for v in y]
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
# pose lifting — linear 2D→3D baseline (needs 3D targets, e.g. H3WB)
# --------------------------------------------------------------------------- #
def build_lifting_dataset(rows, keypoints_dir):
    """Per-frame (2D[34], 3D[51]) pairs for frames that carry `body_3d` targets.

    Our keypoints JSON only has 2D by default; H3WB-style data provides 3D. The
    H3WB adapter / your converter should write frames with a `body_3d` field
    ([17][x,y,z]). If none are present, lifting training fails gracefully.
    """
    X, Y = [], []
    for r in rows:
        frames = load_frames(keypoints_dir, _clip_id(r))
        if not frames:
            continue
        for fr in frames:
            j3d = fr.get("body_3d")
            if not j3d or len(j3d) < 17:
                continue
            X.append([c for kp in fr["body"][:17] for c in kp[:2]])      # 34
            Y.append([c for kp in j3d[:17] for c in kp[:3]])             # 51
    return X, Y


def train_lifting(X, Y, epochs=200, lr=0.1, l2=1e-3):
    mean, std = fit_standardizer(X)
    Xs = [standardize(x, mean, std) for x in X]
    D, O, N = len(Xs[0]), len(Y[0]), len(Xs)
    W = [[0.0] * D for _ in range(O)]
    b = [0.0] * O
    for _ in range(epochs):
        gW = [[0.0] * D for _ in range(O)]
        gb = [0.0] * O
        for x, y in zip(Xs, Y):
            for o in range(O):
                pred = sum(W[o][i] * x[i] for i in range(D)) + b[o]
                err = pred - y[o]
                gb[o] += err
                for i in range(D):
                    gW[o][i] += err * x[i]
        for o in range(O):
            b[o] -= lr * gb[o] / N
            for i in range(D):
                W[o][i] -= lr * (gW[o][i] / N + l2 * W[o][i])
    return {"backend": "baseline", "model": "lifting", "kind": "linear_regression",
            "feat_mean": mean, "feat_std": std, "W": W, "b": b, "in_dim": D, "out_dim": O}


# --------------------------------------------------------------------------- #
# hand–object interaction feature placeholders (HOI4D / DexYCB)
# --------------------------------------------------------------------------- #
def hand_object_features(frame) -> List[float]:
    """Placeholder hand-object features: [hand_present, hand_spread, hand_obj_dist].

    `hand_obj_dist` is computed only if the frame carries an `object` field with a
    normalized `center` [x, y] (as HOI4D/DexYCB adapters could populate); otherwise
    it is 0.0. This is a documented placeholder for richer HOI features — see
    docs/PUBLIC_DATASET_ADAPTERS.md.
    """
    hand = frame.get("hand_right") or []
    present = 1.0 if hand else 0.0
    spread = 0.0
    if hand:
        wx, wy = hand[0][0], hand[0][1]
        spread = sum(math.hypot(p[0] - wx, p[1] - wy) for p in hand) / len(hand)
    dist = 0.0
    obj = frame.get("object")
    if obj and obj.get("center") and hand:
        cx, cy = obj["center"][0], obj["center"][1]
        dist = math.hypot(hand[0][0] - cx, hand[0][1] - cy)
    return [present, spread, dist]


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
