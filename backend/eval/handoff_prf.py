#!/usr/bin/env python3
"""Handoff intent evaluation: precision / recall / F1 (+ accuracy) at a threshold.

Treats handoff-intent detection as binary classification. Reads a predictions
file (CSV: target,score) or generates a synthetic demo set with --demo. Sweeps
no thresholds by default; pass --threshold to change the operating point.

Usage:
    python handoff_prf.py --demo
    python handoff_prf.py --preds preds.csv --threshold 0.8   # cols: target,score
"""

import argparse
import csv
import random
from pathlib import Path


def load(path: Path):
    out = []
    with path.open() as f:
        for r in csv.DictReader(f):
            out.append((int(float(r["target"])), float(r["score"])))
    return out


def demo(n=400, seed=7):
    """Synthetic scores: positives centered high, negatives low → ~0.89 acc."""
    rng = random.Random(seed)
    data = []
    for _ in range(n):
        is_pos = rng.random() < 0.4
        if is_pos:
            score = min(0.999, max(0.0, rng.gauss(0.85, 0.12)))
        else:
            score = min(0.999, max(0.0, rng.gauss(0.20, 0.14)))
        data.append((1 if is_pos else 0, score))
    return data


def prf(data, threshold):
    tp = fp = tn = fn = 0
    for target, score in data:
        pred = 1 if score >= threshold else 0
        if pred == 1 and target == 1:
            tp += 1
        elif pred == 1 and target == 0:
            fp += 1
        elif pred == 0 and target == 0:
            tn += 1
        else:
            fn += 1
    precision = tp / (tp + fp) if (tp + fp) else 0.0
    recall = tp / (tp + fn) if (tp + fn) else 0.0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) else 0.0
    acc = (tp + tn) / len(data) if data else 0.0
    return precision, recall, f1, acc, (tp, fp, tn, fn)


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--preds", type=str, default=None)
    ap.add_argument("--threshold", type=float, default=0.8)
    ap.add_argument("--demo", action="store_true")
    args = ap.parse_args()

    if args.demo or not args.preds:
        data = demo()
        print("[demo] synthetic handoff scores (no --preds given)\n")
    else:
        data = load(Path(args.preds))

    p, r, f1, acc, (tp, fp, tn, fn) = prf(data, args.threshold)
    print(f"samples   : {len(data)}   threshold: {args.threshold}")
    print(f"precision : {p * 100:.1f}%")
    print(f"recall    : {r * 100:.1f}%")
    print(f"F1        : {f1 * 100:.1f}%")
    print(f"accuracy  : {acc * 100:.1f}%")
    print(f"counts    : tp={tp} fp={fp} tn={tn} fn={fn}")


if __name__ == "__main__":
    main()
