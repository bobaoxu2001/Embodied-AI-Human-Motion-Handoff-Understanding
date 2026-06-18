#!/usr/bin/env python3
"""Stratified train/val/test split of the dataset manifest.

Splits per-label so each class is represented in every split, writes the chosen
split back into the manifest's `split` column, and emits plain-text id lists
under an output dir. Deterministic given --seed. Standard library only.

Usage:
    python split_dataset.py --manifest data/manifest.csv --out data/splits \
        --ratios 0.7 0.15 0.15 --seed 42
"""

import argparse
import csv
import random
from collections import defaultdict
from pathlib import Path


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--manifest", type=str, default="data/manifest.csv")
    ap.add_argument("--out", type=str, default="data/splits")
    ap.add_argument("--ratios", type=float, nargs=3, default=[0.7, 0.15, 0.15],
                    metavar=("TRAIN", "VAL", "TEST"))
    ap.add_argument("--seed", type=int, default=42)
    args = ap.parse_args()

    if abs(sum(args.ratios) - 1.0) > 1e-6:
        raise SystemExit(f"ratios must sum to 1.0, got {args.ratios}")

    man = Path(args.manifest)
    if not man.exists():
        raise SystemExit(f"manifest not found: {man} (run create_dataset_manifest.py)")

    with man.open() as f:
        reader = csv.DictReader(f)
        fields = reader.fieldnames or []
        rows = list(reader)

    by_label = defaultdict(list)
    for r in rows:
        by_label[r.get("label", "unlabeled")].append(r)

    rng = random.Random(args.seed)
    tr_r, va_r, _te_r = args.ratios
    assigned = {"train": [], "val": [], "test": []}

    for label, group in by_label.items():
        rng.shuffle(group)
        n = len(group)
        n_tr = int(round(n * tr_r))
        n_va = int(round(n * va_r))
        n_tr = min(n_tr, n)
        n_va = min(n_va, n - n_tr)
        n_te = n - n_tr - n_va
        # For classes with enough samples, guarantee val and test each get ≥1.
        if n >= 3:
            if n_va == 0 and n_tr > 1:
                n_va, n_tr = 1, n_tr - 1
            if n_te == 0 and n_tr > 1:
                n_te, n_tr = 1, n_tr - 1
        for i, r in enumerate(group):
            split = "train" if i < n_tr else "val" if i < n_tr + n_va else "test"
            r["split"] = split
            assigned[split].append(r["clip_id"])

    # rewrite manifest with updated split column
    with man.open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        w.writerows(rows)

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)
    for split, ids in assigned.items():
        (out_dir / f"{split}.txt").write_text("\n".join(ids) + ("\n" if ids else ""))

    print(f"split {len(rows)} clips (seed={args.seed}):")
    for split in ("train", "val", "test"):
        print(f"  {split:5s}: {len(assigned[split])}")
    print(f"wrote id lists → {out_dir}, updated split column in {man}")


if __name__ == "__main__":
    main()
