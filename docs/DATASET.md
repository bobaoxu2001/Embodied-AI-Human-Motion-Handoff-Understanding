# Dataset collection guide

How to go from raw handoff videos to a trainable dataset. The tooling under
`backend/scripts/` runs on the standard library; OpenCV/MediaPipe are used when
installed and otherwise gracefully replaced with deterministic synthetic data so the
whole pipeline is exercisable today.

## Target data

The MVP target is **~150 self-recorded handoff clips** in a controlled lab setting:

- **Subjects/objects:** a few people handing common objects (cup, bottle, tool, box).
- **Cameras:** 2–3 viewpoints (front + oblique) at 1280×720, 30 fps.
- **Clip length:** ~5–11 s, each containing a full *idle → reaching → grasping → handoff
  → placing → idle* cycle where applicable.
- **Actions (6):** `idle`, `reaching`, `grasping`, `placing`, `pointing`, `handoff`.

Complementary public data (see the *Dataset & evaluation* screen): HOI4D-inspired
human-object interaction priors, H3WB/Human3.6M for 2D→3D lifting supervision, and an
Ego4D-inspired egocentric extension (planned).

## Recommended layout

Group clips by action label (the manifest builder infers the label from the folder):

```
backend/data/raw/
├─ idle/        clip_0001.mp4 …
├─ reaching/    clip_0010.mp4 …
├─ grasping/    …
├─ placing/     …
├─ pointing/    …
└─ handoff/     …
```

## Pipeline

```bash
cd backend && source .venv/bin/activate

# 1) Build a manifest (clip_id, path, label, fps, n_frames, duration, split).
#    OpenCV fills video metadata when available.
python scripts/create_dataset_manifest.py --videos data/raw --out data/manifest.csv

# 2) Extract 2D body + hand keypoints (MediaPipe if installed; synthetic fallback).
python scripts/extract_keypoints.py --manifest data/manifest.csv --out data/keypoints

# 3) Stratified train/val/test split (per-label; deterministic via --seed).
python scripts/split_dataset.py --manifest data/manifest.csv --out data/splits \
    --ratios 0.7 0.15 0.15 --seed 42

# 4) Validate integrity: columns, labels, keypoint shapes/coverage, split sanity.
python scripts/validate_dataset.py --manifest data/manifest.csv \
    --keypoints data/keypoints --check-files
```

Don't have clips yet? Generate a synthetic manifest to see the flow:

```bash
python scripts/create_dataset_manifest.py --demo --out data/manifest.csv
```

## Labeling notes

- **Segment-level action labels.** A clip is a sequence of segments; the demo set has
  566 segments across 150 clips. Annotate start/end frames per action segment.
- **Handoff intent** is a binary per-frame (or per-segment) flag — positive during the
  reaching→handoff window when the person clearly intends to transfer the object.
- **3D supervision** for lifting can come from multi-view triangulation or public
  mocap datasets (Human3.6M / H3WB) rather than per-clip 3D labels.

## Annotation outputs consumed downstream

- `data/manifest.csv` — clip index + split assignment.
- `data/keypoints/<clip_id>.json` — per-frame `{body[17], hand_right[21]}` keypoints.
- `data/splits/{train,val,test}.txt` — clip-id lists.

These feed model training (`backend/ml/models/`) and the evaluation scripts
(`backend/eval/`).
