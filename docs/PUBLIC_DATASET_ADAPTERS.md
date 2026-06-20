# Public dataset adapters

Convert **manually-downloaded** official datasets into this project's **normalized
manifest** so baselines can train on real data — **without recording your own clips** and
**without redistributing** any dataset.

> Companion docs: [NO_SELF_RECORDING_PLAN.md](NO_SELF_RECORDING_PLAN.md) (the strategy),
> [DATASET_DOWNLOAD_MANUAL.md](DATASET_DOWNLOAD_MANUAL.md) (per-dataset download + index
> mapping), [dataset_research.md](dataset_research.md) (comparison),
> [data_license_notes.md](data_license_notes.md) (licenses).

## What the adapters do (and don't)

Each adapter (`backend/datasets/<name>_adapter.py`) exposes the common interface:

```python
class DatasetAdapter:
    name: str
    def scan(root)                       -> DatasetSummary         # validate structure
    def build_manifest(root, out, split_strategy="subject")       # → normalized manifest
    def extract_or_link_annotations(root, out)                    # → keypoints (TODO/override)
```

They **do**: validate expected folders, print official URL + license, create the expected
tree + a `SOURCE.md`, and convert an available *metadata index* into the normalized
manifest. They **never**: download bulk data, scrape, commit data, or fabricate labels.
Missing data → a clear error or a `*.TODO.md` report.

## Supported datasets

| Adapter | Dataset | Role here | Intent mapping |
|---|---|---|---|
| `hoh` | [HOH](https://tars-home.github.io/hohdataset/) | handover benchmark | **handoff** (positive) |
| `h2o` | [H2O](https://sites.google.com/view/handover-h2o/home) | handover benchmark | **handoff** (positive) |
| `hot3d` | [HOT3D](https://github.com/facebookresearch/hot3d) | egocentric hand-object 3D (recommended) | unknown (not faked) |
| `hoi4d` | [HOI4D](https://hoi4d.github.io/) | hand-object pretrain / action | unknown (not faked) |
| `dexycb` | [DexYCB](https://dex-ycb.github.io/) | hand-object grasp features | unknown (not faked) |
| `h3wb` | [H3WB](https://github.com/wholebody3d/wholebody3d) | 2D→3D pose lifting | n/a |
| `interhand` | [InterHand2.6M](https://mks0601.github.io/InterHand2.6M/) | hand-pose pretrain | n/a |

**Honest intent rule:** handover datasets (HOH/H2O) map to **positive** handoff intent;
non-handover datasets leave `intent_label` **empty (unknown)** — they are *not* turned into
fake negatives. To train the intent baseline you therefore need **both** a handover source
(positives) and a non-handover source (negatives) — pair them explicitly.

## Normalized manifest

`backend/datasets/schema.py` defines one row per sample with: `sample_id, dataset_name,
video_path, annotation_path, label, action_label, intent_label, subject_id, object_id,
object_name, camera_view, start_time, end_time, fps, num_frames, has_rgb, has_depth,
has_2d_pose, has_3d_pose, has_hand_pose, has_object_pose, license_note, split`. It also
writes `clip_id` (= `sample_id`) and a populated `label` so the existing
training/eval/validate scripts read it unchanged.

## The metadata index

Adapters convert a small **index file** at the dataset root (first match wins):
`index.jsonl`, `index.csv`, `samples.jsonl`, `samples.csv`. Each record needs at least
`sample_id` + `subject_id`, plus any of `action_label`, `intent_label`, `video_path`,
`annotation_path`, `object_name`, `camera_view`, `fps`, `num_frames`. The dataset's own
metadata rarely matches this exactly, so [DATASET_DOWNLOAD_MANUAL.md](DATASET_DOWNLOAD_MANUAL.md)
shows how to produce the index per dataset. Tiny example indices live in
`backend/tests/fixtures/public_datasets/`.

## Commands

```bash
cd backend && source .venv/bin/activate

# inspect structure + expected tree (writes nothing)
python scripts/prepare_public_dataset.py --dataset hoh --root data/external/hoh \
    --out data/manifests/hoh_manifest.csv --dry-run

# build the normalized manifest from an index (subject split by default)
python scripts/prepare_public_dataset.py --dataset hoh --root data/external/hoh \
    --out data/manifests/hoh_manifest.csv

# then train/eval baselines on the normalized manifest (needs keypoints — see below)
python ml/train.py --model intent --manifest data/manifests/hoh_manifest.csv \
    --keypoints data/keypoints --out ml/weights/intent_baseline.pt
```

## Keypoints from public data

Training uses our keypoints JSON (`data/keypoints/<sample_id>.json`, 17 body + 21 hand).
Two routes:
- **From video**: run `extract_keypoints.py` over the dataset's RGB (MediaPipe).
- **From annotations**: `extract_or_link_annotations` converts a dataset's native pose
  annotations — this is a per-format **documented TODO** (override per adapter); for H3WB,
  write frames with a `body_3d` field to enable the lifting baseline.

If keypoints/annotations aren't present, the train scripts **fail with a clear message** —
they never train on fake data.

## Hand-object features (HOI4D / DexYCB)

`ml/baseline.hand_object_features(frame)` is a documented **placeholder** returning
`[hand_present, hand_spread, hand_obj_dist]` (distance computed only if a frame carries an
`object.center`). Extend it as you wire real hand/object pose from those datasets.
