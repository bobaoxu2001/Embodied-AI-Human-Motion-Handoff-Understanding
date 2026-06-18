#!/usr/bin/env python3
"""Validate a dataset: manifest integrity, keypoint coverage, split sanity.

Checks performed:
  - manifest exists and has the expected columns
  - every clip has keypoints (when --keypoints given) with consistent shapes
  - labels are within the known action vocabulary
  - splits cover all clips with no clip in two splits (no leakage)
  - class balance report

Exits non-zero if any hard error is found. Standard library only.

Usage:
    python validate_dataset.py --manifest data/manifest.csv --keypoints data/keypoints
"""

import argparse
import csv
import json
from collections import Counter
from pathlib import Path

ACTIONS = {"idle", "reaching", "grasping", "placing", "pointing", "handoff", "unlabeled"}
REQUIRED_COLS = {"clip_id", "path", "label", "split"}
N_BODY = 17
N_HAND = 21


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--manifest", type=str, default="data/manifest.csv")
    ap.add_argument("--keypoints", type=str, default=None)
    ap.add_argument("--check-files", action="store_true", help="verify video paths exist")
    args = ap.parse_args()

    errors, warnings = [], []
    man = Path(args.manifest)
    if not man.exists():
        raise SystemExit(f"ERROR: manifest not found: {man}")

    with man.open() as f:
        reader = csv.DictReader(f)
        cols = set(reader.fieldnames or [])
        rows = list(reader)

    missing_cols = REQUIRED_COLS - cols
    if missing_cols:
        errors.append(f"manifest missing columns: {sorted(missing_cols)}")

    ids = [r["clip_id"] for r in rows]
    dupes = [c for c, n in Counter(ids).items() if n > 1]
    if dupes:
        errors.append(f"duplicate clip_ids: {dupes[:5]}")

    for r in rows:
        if r.get("label") not in ACTIONS:
            warnings.append(f"{r['clip_id']}: unknown label '{r.get('label')}'")
        if args.check_files and not Path(r["path"]).exists():
            errors.append(f"{r['clip_id']}: video path missing: {r['path']}")

    # split coverage
    splits = Counter(r.get("split", "unassigned") for r in rows)
    if splits.get("unassigned", 0) == len(rows):
        warnings.append("no splits assigned yet (run split_dataset.py)")

    # keypoint coverage
    if args.keypoints:
        kp_dir = Path(args.keypoints)
        for r in rows:
            kp_file = kp_dir / f"{r['clip_id']}.json"
            if not kp_file.exists():
                errors.append(f"{r['clip_id']}: keypoints missing: {kp_file}")
                continue
            try:
                doc = json.loads(kp_file.read_text())
                fr = doc["frames"][0]
                if len(fr["body"]) != N_BODY:
                    warnings.append(f"{r['clip_id']}: body has {len(fr['body'])} kpts (want {N_BODY})")
                if fr.get("hand_right") and len(fr["hand_right"]) not in (0, N_HAND):
                    warnings.append(f"{r['clip_id']}: hand has {len(fr['hand_right'])} kpts (want {N_HAND})")
            except Exception as e:
                errors.append(f"{r['clip_id']}: bad keypoints json: {e}")

    # report
    print(f"clips: {len(rows)}")
    print("labels: " + ", ".join(f"{k}={v}" for k, v in sorted(Counter(r['label'] for r in rows).items())))
    print("splits: " + ", ".join(f"{k}={v}" for k, v in sorted(splits.items())))
    for w in warnings:
        print(f"  WARN  {w}")
    for e in errors:
        print(f"  ERROR {e}")

    if errors:
        raise SystemExit(f"\nFAILED with {len(errors)} error(s), {len(warnings)} warning(s)")
    print(f"\nOK — {len(warnings)} warning(s), 0 errors")


if __name__ == "__main__":
    main()
