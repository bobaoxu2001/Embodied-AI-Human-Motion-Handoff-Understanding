#!/usr/bin/env python3
"""Action recognition evaluation: top-1 accuracy, per-class recall, confusion matrix.

Reads a predictions file (CSV or JSON lines with `pred` and `target` fields) or
generates a synthetic demo set with --demo. Pure standard library.

Usage:
    python action_accuracy.py --demo
    python action_accuracy.py --preds preds.csv          # cols: clip_id,target,pred
"""

import argparse
import csv
import json
import random
from collections import defaultdict
from pathlib import Path

ACTIONS = ["idle", "reaching", "grasping", "placing", "pointing", "handoff"]


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
        target = rng.choice(ACTIONS)
        if rng.random() < 0.845:
            pred = target
        else:
            pred = rng.choice([a for a in ACTIONS if a != target])
        pairs.append((target, pred))
    return pairs


def evaluate(pairs):
    n = len(pairs)
    correct = sum(1 for t, p in pairs if t == p)
    per_class_total = defaultdict(int)
    per_class_correct = defaultdict(int)
    confusion = {a: defaultdict(int) for a in ACTIONS}
    for t, p in pairs:
        per_class_total[t] += 1
        if t == p:
            per_class_correct[t] += 1
        confusion[t][p] += 1
    return {
        "n": n,
        "top1": correct / n if n else 0.0,
        "per_class": {
            a: (per_class_correct[a] / per_class_total[a] if per_class_total[a] else 0.0)
            for a in ACTIONS
        },
        "support": dict(per_class_total),
        "confusion": confusion,
    }


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--preds", type=str, default=None)
    ap.add_argument("--demo", action="store_true")
    args = ap.parse_args()

    if args.demo or not args.preds:
        pairs = demo_preds()
        print("[demo] synthetic predictions (no --preds given)\n")
    else:
        pairs = load_preds(Path(args.preds))

    res = evaluate(pairs)
    print(f"samples         : {res['n']}")
    print(f"top-1 accuracy  : {res['top1'] * 100:.1f}%")
    print("\nper-class recall:")
    for a in ACTIONS:
        print(f"  {a:10s} {res['per_class'][a] * 100:5.1f}%   (n={res['support'].get(a, 0)})")
    print("\nconfusion (rows=target, cols=pred):")
    header = "          " + "".join(f"{a[:5]:>7}" for a in ACTIONS)
    print(header)
    for t in ACTIONS:
        row = "".join(f"{res['confusion'][t][p]:>7}" for p in ACTIONS)
        print(f"  {t:8s}{row}")


if __name__ == "__main__":
    main()
