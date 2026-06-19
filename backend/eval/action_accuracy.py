#!/usr/bin/env python3
"""Action recognition evaluation: top-1 accuracy, per-class recall, confusion matrix.

Three input modes:
  * --demo                          synthetic predictions (stdlib)
  * --preds preds.csv               cols: clip_id,target,pred
  * --manifest .. --keypoints .. --weights ..   MEASURED on a trained baseline

Measured mode loads a baseline action checkpoint (ml/baseline.py), predicts on the
chosen split's clips, and reports real metrics. Pure standard library.

Usage:
    python action_accuracy.py --demo
    python action_accuracy.py --manifest data/manifest.csv --keypoints data/keypoints \\
        --weights ml/weights/action_baseline.pt --split test
"""

import argparse
import csv
import json
import random
import sys
from collections import defaultdict
from pathlib import Path

DEMO_ACTIONS = ["idle", "reaching", "grasping", "placing", "pointing", "handoff"]
BACKEND = Path(__file__).resolve().parent.parent


def load_preds(path: Path):
    pairs = []
    if path.suffix == ".json":
        for line in path.read_text().splitlines():
            if line.strip():
                d = json.loads(line)
                pairs.append((d["target"], d["pred"]))
    else:
        with path.open() as f:
            for r in csv.DictReader(f):
                pairs.append((r["target"], r["pred"]))
    return pairs


def demo_preds(n=566, seed=42):
    """Synthetic preds at ~84.5% top-1 to match the demo metric."""
    rng = random.Random(seed)
    pairs = []
    for _ in range(n):
        target = rng.choice(DEMO_ACTIONS)
        pred = target if rng.random() < 0.845 else rng.choice(
            [a for a in DEMO_ACTIONS if a != target])
        pairs.append((target, pred))
    return pairs


def measured_pairs(manifest, keypoints, weights, split):
    """Run a trained baseline on the split clips → (target, pred) pairs + class list."""
    sys.path.insert(0, str(BACKEND))
    from ml import baseline as B

    ckpt = B.load_ckpt(weights)
    if ckpt.get("model") != "action":
        raise SystemExit(f"--weights is not an action checkpoint ({ckpt.get('model')}).")
    rows = B.rows_for_split(B.read_manifest(manifest), split)
    pairs = []
    for r in rows:
        frames = B.load_frames(keypoints, r["clip_id"])
        if not frames or r.get("label") not in ckpt["actions"]:
            continue
        pairs.append((r["label"], B.predict_action(ckpt, B.clip_feature(frames))))
    if not pairs:
        raise SystemExit("no labelled clips with keypoints in this split.")
    return pairs, ckpt["actions"]


def evaluate(pairs, actions):
    n = len(pairs)
    correct = sum(1 for t, p in pairs if t == p)
    total = defaultdict(int)
    hit = defaultdict(int)
    confusion = {a: defaultdict(int) for a in actions}
    for t, p in pairs:
        total[t] += 1
        if t == p:
            hit[t] += 1
        if t in confusion:
            confusion[t][p] += 1
    return {
        "n": n,
        "top1": correct / n if n else 0.0,
        "per_class": {a: (hit[a] / total[a] if total[a] else 0.0) for a in actions},
        "support": dict(total),
        "confusion": confusion,
    }


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--preds", type=str, default=None)
    ap.add_argument("--manifest", type=str, default=None)
    ap.add_argument("--keypoints", type=str, default=None)
    ap.add_argument("--weights", type=str, default=None)
    ap.add_argument("--split", type=str, default="test")
    ap.add_argument("--demo", action="store_true")
    args = ap.parse_args()

    if args.weights and args.manifest and args.keypoints:
        pairs, actions = measured_pairs(args.manifest, args.keypoints, args.weights, args.split)
        print(f"[measured] baseline on split='{args.split}'\n")
    elif args.preds and not args.demo:
        pairs, actions = load_preds(Path(args.preds)), DEMO_ACTIONS
    else:
        pairs, actions = demo_preds(), DEMO_ACTIONS
        print("[demo] synthetic predictions\n")

    res = evaluate(pairs, actions)
    print(f"samples         : {res['n']}")
    print(f"top-1 accuracy  : {res['top1'] * 100:.1f}%")
    print("\nper-class recall:")
    for a in actions:
        print(f"  {a:10s} {res['per_class'][a] * 100:5.1f}%   (n={res['support'].get(a, 0)})")
    print("\nconfusion (rows=target, cols=pred):")
    print("          " + "".join(f"{a[:5]:>7}" for a in actions))
    for t in actions:
        row = "".join(f"{res['confusion'][t][p]:>7}" for p in actions)
        print(f"  {t:8s}{row}")


if __name__ == "__main__":
    main()
