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

## Capture protocol

A repeatable rig so clips are comparable and 3D supervision is recoverable:

```
            (ceiling light + softbox, diffuse, ~600 lux)
                          ▲
      cam_01 (front)      │
        ◉  ───────────────┼───────────────  ◉  cam_02 (oblique 45°)
        │                 │                 │
        │           ┌───────────┐           │
   ~2.0 m           │  person   │  ←→ robot/receiver
        │           └───────────┘           │
        │                 │
        └────────  ◉  cam_03 (side, optional)
                  (tripod, 1.1 m height)
```

- **Cameras:** 2–3 GoPro/webcam units, **time-synchronized** (clap/flash at clip start),
  1280×720 @ 30 fps, fixed exposure/white-balance, **intrinsics + extrinsics calibrated**
  once per session (checkerboard) so multi-view triangulation gives 3D keypoint targets.
- **Geometry:** subject ~2.0 m from `cam_01`; `cam_02` at ~45° oblique; optional `cam_03`
  side view. Heights ~1.1 m. The handoff target (robot gripper / receiver hand) is in
  frame for at least one camera throughout.
- **Lighting:** diffuse, ~600 lux, no hard backlight; one "poor lighting" session is
  recorded on purpose for the robustness slice.
- **Diversity to vary:** ≥4 subjects, both hands, 4 object classes (cup, bottle, tool,
  box), 2 distances, and deliberate hard cases (occlusion, fast motion, two people,
  distractor object) for the failure-mode evaluation.
- **Consent:** each subject signs an informed-consent form for research/portfolio use;
  recordings can be face-blurred on request (faces are not the learning signal).

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

## Annotation

- **Tooling.** Action segments are labeled with a lightweight frame-range tool (e.g.
  [CVAT](https://www.cvat.ai/) or [Label Studio](https://labelstud.io/) video timeline);
  one annotator labels, a second reviews a 10% sample for agreement.
- **Segment-level action labels.** A clip is a sequence of segments; the demo set has
  **566 segments across 150 clips**. Annotate start/end frames per action segment
  (`idle / reaching / grasping / placing / pointing / handoff`).
- **Handoff intent** is a binary per-frame (or per-segment) flag — positive during the
  reaching→handoff window when the person clearly intends to transfer the object;
  negative for `placing` (puts down, not handing over) so the classes are separable.
- **2D keypoints** come from MediaPipe/HRNet (auto), spot-corrected on hard frames.
- **3D supervision** for lifting comes from multi-view triangulation of the calibrated
  cameras, or public mocap (Human3.6M / H3WB) — no manual 3D labeling.

## Train / val / test split

- **Split by subject, not by clip.** All clips of a given person go entirely into one of
  train/val/test. A random per-clip split would let the model memorize a subject's
  appearance/motion and **leak** identity across splits, inflating metrics. Per-subject
  splitting measures generalization to *new people*.
- **Ratios** ~0.7 / 0.15 / 0.15, deterministic via `--seed`; the helper stratifies so each
  split still covers all six action classes and all object types where possible.
- **Held-out hard cases.** The occlusion / fast-motion / poor-lighting / two-person /
  distractor sessions are kept in test (or a separate robustness set) so the failure-mode
  numbers reflect unseen difficulty, not training-set memorization.

> `scripts/split_dataset.py` currently does a stratified-by-label split; switch the
> grouping key to `subject_id` (add it to the manifest) to enforce the by-subject rule
> above before training on real clips.

## Annotation outputs consumed downstream

- `data/manifest.csv` — clip index + split assignment.
- `data/keypoints/<clip_id>.json` — per-frame `{body[17], hand_right[21]}` keypoints.
- `data/splits/{train,val,test}.txt` — clip-id lists.

These feed model training (`backend/ml/models/`) and the evaluation scripts
(`backend/eval/`).
