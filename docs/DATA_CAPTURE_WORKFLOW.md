# Data capture workflow

Record/collect the self-recorded MVP clips and turn them into a trainable dataset.
**Clips stay on your machine** — nothing is uploaded by the app.

## Option A — in-app builder (`/capture`)

Open the app → **Data capture**. It runs fully in the browser:

- pick a **class** and fill metadata (`subject_id`, `camera_view`, `object`, `lighting`, `notes`)
- **record** with the webcam or **upload** a clip
- recorded clips **download to disk**; per-class progress tracks toward ~25/class
- export **manifest.csv** / **capture.jsonl** of what you collected

Suggested filenames already encode subject + view, e.g. `s01_handoff_front_001.webm`.
Move the downloaded clips into the folder layout below.

## Option B — record manually

Any camera works. Follow the capture protocol (rig, lighting, distances) in
[dataset_collection_guide.md](dataset_collection_guide.md). Name files
`s<NN>_<label>_<view>_<seq>.mp4` so `subject_id` is parsed automatically.

## Folder layout

```
backend/data/raw/
├─ idle/        s01_idle_front_001.mp4 …
├─ walking/     s02_walking_front_001.mp4 …
├─ reaching/    …
├─ grasping/    …
├─ placing/     …
├─ pointing/    …
└─ handoff/     s03_handoff_oblique_007.mp4 …
```

`backend/data/raw/` is **git-ignored** — clips are never committed.

## CLI pipeline

```bash
cd backend && source .venv/bin/activate

# (optional) real keypoints need MediaPipe + OpenCV; otherwise a synthetic
# fallback is written so the loop still runs:
# pip install -r requirements-ml.txt

python scripts/create_dataset_manifest.py --videos data/raw --out data/manifest.csv
python scripts/extract_keypoints.py        --manifest data/manifest.csv --out data/keypoints
python scripts/split_dataset.py            --manifest data/manifest.csv --out data/splits --by-subject
python scripts/validate_dataset.py         --manifest data/manifest.csv --keypoints data/keypoints --check-files
```

`create_dataset_manifest.py` records: `clip_id, path, label, subject_id, fps, n_frames,
duration_s, split`. `validate_dataset.py` checks columns, label vocab (7 classes + the
`unlabeled` bucket), keypoint shapes (17 body / 21 hand), split coverage, and **by-subject
leakage** (no subject in two splits).

## Notes

- **fps/num_frames**: read by OpenCV from real files. The browser builder can't read true
  fps, so it assumes 30 and estimates `num_frames = duration × 30` — the CLI manifest from
  real files is authoritative.
- **Keypoints without MediaPipe**: `extract_keypoints.py` writes deterministic *synthetic*
  keypoints (label-agnostic) so splitting/validation/training run; install
  `requirements-ml.txt` for real keypoints before trusting metrics.

Next: train baselines → [TRAINING_BASELINES.md](TRAINING_BASELINES.md).
