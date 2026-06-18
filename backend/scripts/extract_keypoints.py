#!/usr/bin/env python3
"""Extract 2D body + hand keypoints for every clip in a manifest.

Uses MediaPipe + OpenCV when installed (real extraction); otherwise writes
deterministic synthetic keypoints so the rest of the pipeline (splitting,
validation, training scaffolds) can be exercised end-to-end without the ML
stack. One JSON file per clip is written to the output dir.

Output JSON per clip:
    { "clip_id", "fps", "n_frames", "synthetic": bool,
      "frames": [ { "body": [[x,y,score]*17], "hand_right": [[x,y,score]*21] }, ... ] }

Usage:
    python extract_keypoints.py --manifest data/manifest.csv --out data/keypoints
"""

import argparse
import csv
import json
import math
from pathlib import Path


def _synthetic_frames(n_frames: int):
    """Deterministic keypoints (mirrors the demo engine's wrist sweep)."""
    frames = []
    n = max(1, n_frames)
    for f in range(n):
        t = f / n
        wx = 0.49 + 0.32 * t
        wy = 0.51 - 0.06 * math.sin(t * math.pi)
        body = [[0.39 + 0.002 * i, 0.2 + 0.04 * i, 0.97] for i in range(17)]
        body[10] = [round(wx, 4), round(wy, 4), 0.96]  # right wrist
        hand = [[round(wx, 4), round(wy, 4), 0.95]]
        for k in range(1, 21):
            ang = -0.6 + (k / 20) * 1.4
            hand.append(
                [round(wx + math.cos(ang) * 0.02, 4), round(wy + math.sin(ang) * 0.02, 4), 0.93]
            )
        frames.append({"body": body, "hand_right": hand})
    return frames


def _real_frames(path: str):
    """Run MediaPipe over a real clip. Returns None if unavailable/failed."""
    try:
        import cv2  # type: ignore

        import sys

        sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
        from app.pipeline.keypoints import KeypointExtractor

        kp = KeypointExtractor()
        if not kp.available:
            return None
        cap = cv2.VideoCapture(path)
        frames = []
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            body, hand = kp.extract(rgb)
            frames.append({"body": body, "hand_right": hand or []})
        cap.release()
        kp.close()
        return frames or None
    except Exception:
        return None


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--manifest", type=str, default="data/manifest.csv")
    ap.add_argument("--out", type=str, default="data/keypoints")
    ap.add_argument("--force-synthetic", action="store_true")
    args = ap.parse_args()

    man = Path(args.manifest)
    if not man.exists():
        raise SystemExit(f"manifest not found: {man} (run create_dataset_manifest.py)")

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    with man.open() as f:
        rows = list(csv.DictReader(f))

    n_real = n_synth = 0
    for r in rows:
        n_frames = int(r.get("n_frames") or 0) or 320
        frames = None
        if not args.force_synthetic:
            frames = _real_frames(r["path"])
        synthetic = frames is None
        if synthetic:
            frames = _synthetic_frames(n_frames)
            n_synth += 1
        else:
            n_real += 1
        doc = {
            "clip_id": r["clip_id"],
            "fps": float(r.get("fps") or 30.0),
            "n_frames": len(frames),
            "synthetic": synthetic,
            "frames": frames,
        }
        (out_dir / f"{r['clip_id']}.json").write_text(json.dumps(doc))

    print(f"extracted keypoints for {len(rows)} clips → {out_dir}")
    print(f"  real (mediapipe): {n_real}   synthetic (fallback): {n_synth}")


if __name__ == "__main__":
    main()
