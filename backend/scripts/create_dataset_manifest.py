#!/usr/bin/env python3
"""Build a dataset manifest from a directory of handoff video clips.

Convention: clips live under a root dir, optionally grouped by action label:

    data/raw/handoff/clip001.mp4
    data/raw/reaching/clip002.mp4
    data/raw/clip003.mp4            # label inferred as "unlabeled"

Outputs a CSV manifest: clip_id, path, label, fps, n_frames, duration_s, split.
OpenCV is used for video metadata when available; otherwise those fields are 0
and can be filled later. Runs on the standard library alone.

Usage:
    python create_dataset_manifest.py --videos data/raw --out data/manifest.csv
    python create_dataset_manifest.py --demo --out data/manifest.csv   # synth rows
"""

import argparse
import csv
import os
from pathlib import Path

import re

VIDEO_EXTS = {".mp4", ".mov", ".avi", ".mkv", ".webm"}
# The shipped demo model is 6-class; the collection taxonomy adds `walking`
# (see docs/dataset_collection_guide.md). Synthetic rows use the 6 model classes.
MODEL_ACTIONS = ["idle", "reaching", "grasping", "placing", "pointing", "handoff"]
COLLECTION_ACTIONS = ["idle", "walking", "reaching", "grasping", "placing", "pointing", "handoff"]
SUBJECT_RE = re.compile(r"^(s\d+|subject\d+|p\d+)", re.IGNORECASE)


def _subject_of(stem: str) -> str:
    """Infer subject_id from a filename like 's01_handoff_003' → 's01' (else 'unknown')."""
    m = SUBJECT_RE.match(stem)
    return m.group(1).lower() if m else "unknown"


def _probe(path: Path):
    """Return (fps, n_frames, duration_s) via OpenCV if installed, else zeros."""
    try:
        import cv2  # type: ignore

        cap = cv2.VideoCapture(str(path))
        fps = cap.get(cv2.CAP_PROP_FPS) or 0.0
        n = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
        cap.release()
        dur = round(n / fps, 2) if fps else 0.0
        return round(fps, 2), n, dur
    except Exception:
        return 0.0, 0, 0.0


def scan(videos_root: Path):
    rows = []
    for path in sorted(videos_root.rglob("*")):
        if path.suffix.lower() not in VIDEO_EXTS:
            continue
        rel = path.relative_to(videos_root)
        parent = rel.parts[0] if len(rel.parts) > 1 else "unlabeled"
        label = parent if parent in COLLECTION_ACTIONS else "unlabeled"
        fps, n_frames, dur = _probe(path)
        rows.append(
            {
                "clip_id": path.stem,
                "path": str(path),
                "label": label,
                "subject_id": _subject_of(path.stem),
                "fps": fps,
                "n_frames": n_frames,
                "duration_s": dur,
                "split": "unassigned",
            }
        )
    return rows


def synth_rows(n: int = 30):
    rows = []
    for i in range(n):
        label = MODEL_ACTIONS[i % len(MODEL_ACTIONS)]
        rows.append(
            {
                "clip_id": f"demo_{i:03d}",
                "path": f"data/raw/{label}/demo_{i:03d}.mp4",
                "label": label,
                "subject_id": f"s{i % 4:02d}",  # 4 synthetic subjects for by-subject demo
                "fps": 30.0,
                "n_frames": 320,
                "duration_s": 10.67,
                "split": "unassigned",
            }
        )
    return rows


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--videos", type=str, default="data/raw")
    ap.add_argument("--out", type=str, default="data/manifest.csv")
    ap.add_argument("--demo", action="store_true", help="emit synthetic rows")
    args = ap.parse_args()

    if args.demo:
        rows = synth_rows()
    else:
        root = Path(args.videos)
        if not root.exists():
            raise SystemExit(f"videos dir not found: {root} (try --demo)")
        rows = scan(root)

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    fields = ["clip_id", "path", "label", "subject_id", "fps", "n_frames", "duration_s", "split"]
    with out.open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        w.writerows(rows)

    labeled = sum(1 for r in rows if r["label"] != "unlabeled")
    print(f"wrote {len(rows)} clips → {out} ({labeled} labeled)")


if __name__ == "__main__":
    main()
