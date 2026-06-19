# Dataset collection guide

How to go from nothing to a trainable dataset for **Embodied Handoff Perception** — a
**self-recorded MVP** first, then **public datasets as a planned extension**. The tooling
in `backend/scripts/` runs on the standard library; OpenCV/MediaPipe are used when
installed and otherwise replaced with deterministic synthetic data so the whole flow is
exercisable today.

> Companion docs: dataset comparison → [dataset_research.md](dataset_research.md);
> licenses → [data_license_notes.md](data_license_notes.md). This guide supersedes the
> shorter notes in [DATASET.md](DATASET.md).

---

## A) MVP dataset (self-recorded) — do this first

**Target: 120–180 short clips** in a controlled setting. Small enough for one person to
collect/label in a few sessions; large enough to train the small models here.

### Label taxonomy (7 collection classes)

`idle · walking · reaching · grasping · placing · pointing · handoff`

> **Model note (honest):** the shipped **demo model is 6-class** (no `walking`) — see
> `backend/ml/models/action.py` (`N_ACTIONS=6`) and `backend/ml/models/__init__.py`.
> `walking`/locomotion is included in the **collection** taxonomy so the data is richer;
> to train with it, bump the model to 7 classes (update `N_ACTIONS` and `ACTIONS`). The
> collection scripts accept all 7 labels; the demo synthetic manifest uses the 6 model
> classes.

### Labeling strategy (staged)

1. **Video-level labels first** — one dominant action per clip (folder = label). Fast to
   collect; immediately trains a clip classifier. This is what
   `create_dataset_manifest.py` infers from the folder name.
2. **Segment-level labels later** — annotate start/end frames per action segment within a
   clip (a clip is a sequence: *idle → reaching → grasping → handoff → placing → idle*).
   Enables the temporal action model + handoff-intent windows.

### Capture protocol

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

- **Cameras:** 2–3 units, **time-synchronized** (clap/flash at clip start), 1280×720 @
  30 fps, fixed exposure/white-balance. Calibrate intrinsics+extrinsics once per session
  (checkerboard) so multi-view triangulation can produce 3D keypoint targets.
- **Geometry:** subject ~2.0 m from `cam_01`; `cam_02` ~45° oblique; optional `cam_03`
  side. Keep the handoff target (gripper/receiver hand) in frame for ≥1 camera throughout.
- **Lighting:** diffuse ~600 lux, no hard backlight; record **one low-light session** for
  the robustness slice.
- **Diversity:** ≥4 subjects, both hands, 4 object classes (cup, bottle, tool, box), 2
  distances, plus deliberate hard cases (occlusion, fast motion, two people, distractor).
- **Consent:** each subject signs an informed-consent form for research/portfolio use;
  faces can be blurred on request (faces are not the learning signal).

### Recommended layout

Group clips by action label; encode subject in the filename for by-subject splitting:

```
backend/data/raw/
├─ idle/        s01_idle_001.mp4 …
├─ walking/     s02_walking_004.mp4 …
├─ reaching/    s01_reaching_010.mp4 …
├─ grasping/    …
├─ placing/     …
├─ pointing/    …
└─ handoff/     s03_handoff_021.mp4 …
```

`sNN_` at the start of the filename lets `create_dataset_manifest.py` record a
`subject_id`, which `validate_dataset.py` uses to enforce a **by-subject** split (no
identity leakage across train/val/test).

### Pipeline (build → extract → split → validate)

```bash
cd backend && source .venv/bin/activate

# 1) Manifest (clip_id, path, label, subject_id, fps, n_frames, duration_s, split).
python scripts/create_dataset_manifest.py --videos data/raw --out data/manifest.csv

# 2) Extract 2D body + hand keypoints (MediaPipe if installed; synthetic fallback).
python scripts/extract_keypoints.py --manifest data/manifest.csv --out data/keypoints

# 3) Split (per-label, or by-subject when subject_id is present + --by-subject).
python scripts/split_dataset.py --manifest data/manifest.csv --out data/splits \
    --ratios 0.7 0.15 0.15 --seed 42

# 4) Validate: columns, labels, keypoint shapes, split + by-subject leakage.
python scripts/validate_dataset.py --manifest data/manifest.csv \
    --keypoints data/keypoints --check-files
```

No clips yet? See the flow with synthetic data:

```bash
python scripts/create_dataset_manifest.py --demo --out data/manifest.csv
```

A tiny committed example lives at `backend/data/examples/manifest.example.csv`.

### Annotation outputs consumed downstream

- `data/manifest.csv` — clip index + `subject_id` + split.
- `data/keypoints/<clip_id>.json` — per-frame `{body[17], hand_right[21]}`.
- `data/splits/{train,val,test}.txt` — clip-id lists.

These feed training (`backend/ml/train.py`) and evaluation (`backend/eval/`).

---

## B) Public dataset usage (planned extension)

Use public data **only** where access/license allow, **subset-only**, **metadata-first**.
Full comparison + licenses: [dataset_research.md](dataset_research.md),
[data_license_notes.md](data_license_notes.md). Print official links and prepare folders:

```bash
python scripts/download_public_dataset_metadata.py --dataset all --dry-run
python scripts/download_public_dataset_metadata.py --dataset h3wb --metadata-only
```

Mapping to our stages:

| Need | Datasets | Usage |
|---|---|---|
| **2D→3D pose lifting** (Stage 02) | **H3WB / Human3.6M** | train / benchmark (academic license) |
| **Human-object interaction** (perception front-end) | **HOI4D / DexYCB / EPIC-KITCHENS** | pretrain / subset experiments |
| **Video understanding** (action context) | **Something-Something V2 / NTU RGB+D / Ego4D** | inspiration / subset references |
| **Handover** (intent, giver/receiver) | **HOH** | inspiration / benchmark |
| **Hand-pose realism** | **InterHand2.6M** | pretrain (hand pose) |

Guidelines:
- **Never** auto-download massive raw sets; use `--metadata-only` / `--dry-run`.
- Keep everything under `data/external/<dataset>/` (git-ignored).
- Record provenance in `data/external/<dataset>/SOURCE.md` (the script writes this).
- Honest framing in any write-up: *"inspired by HOI4D/Ego4D-style tasks"*,
  *"metadata-only integration"*, *"public dataset planned extension"* — not *"trained on"*
  unless you actually did.

---

## C) From data → real models

Once keypoints exist, train and export (requires `requirements-ml.txt`):

```bash
python ml/train.py --model trajectory   # also: action / lifting / intent
python ml/export_onnx.py --out ml/weights
```

`runtime.demo_mode()` flips to `False` automatically once ONNX weights exist; the API
contract is unchanged. See [ARCHITECTURE.md](ARCHITECTURE.md#going-from-demo--real-models).
