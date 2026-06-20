# Dataset download manual

How to **manually** download each supported dataset (official sources, licenses accepted)
and produce the small **metadata index** the adapters convert. This repo never
redistributes data; everything lands under `backend/data/external/<name>/` (git-ignored).

General flow for any dataset `<name>`:

```bash
cd backend && source .venv/bin/activate
# 1) see the official link + license + expected layout (writes nothing)
python scripts/prepare_public_dataset.py --dataset <name> --root data/external/<name> \
    --out data/manifests/<name>_manifest.csv --dry-run
# 2) download from the official page into data/external/<name>/ (accept the license)
# 3) create an index file (index.jsonl or index.csv) at the dataset root (see below)
# 4) build the normalized manifest
python scripts/prepare_public_dataset.py --dataset <name> --root data/external/<name> \
    --out data/manifests/<name>_manifest.csv
```

The index needs at least `sample_id` + `subject_id`; add `action_label`, `intent_label`,
`video_path`, `annotation_path`, `object_name`, `camera_view`, `fps`, `num_frames` when you
have them. Adapters fill dataset defaults (e.g. HOH → `action_label=handoff`,
`intent_label=handoff`). Tiny example indices: `backend/tests/fixtures/public_datasets/`.

---

## HOH — Human-Object-Human Handover
- Official: https://tars-home.github.io/hohdataset/ · paper: arXiv:2310.00723
- Access: request via the project page; multi-view RGB-D + skeletons + grasp/object metadata.
- Index: one row per handover interaction. `sample_id`, `subject_id` (giver or pair id),
  `object_name`, `camera_view`, `fps`, `num_frames`. Intent/action default to **handoff**.

## H2O — Visual Human-human Object Handover (ICCV 2021)
- Official: https://sites.google.com/view/handover-h2o/home · paper: arXiv:2104.11466
- Access: per project page; ~18K RGB clips, 15 people, 30 objects.
- Index: one row per clip. `sample_id`, `subject_id` (giver), `object_name`, `fps`,
  `num_frames`. Intent/action default to **handoff**.

## HOI4D (CVPR 2022)
- Official: https://hoi4d.github.io/
- Access: request form; egocentric RGB-D + 3D hand/object pose + action segments.
- Index: one row per clip/segment. `sample_id`, `subject_id`, `action_label` (from HOI4D's
  action annotation), `object_name`, `fps`, `num_frames`. `intent_label` left empty.

## DexYCB (CVPR 2021)
- Official: https://dex-ycb.github.io/ · toolkit: https://github.com/NVlabs/dex-ycb-toolkit
- Access: download form (CC BY-NC 4.0). Subject dirs are `<date>-subject-NN/`.
- Index: one row per sequence. `sample_id`, `subject_id` (e.g. `subject-01`), `object_name`,
  `fps`, `num_frames`, `action_label=grasping`. `intent_label` empty.

## HOT3D / HOT3D-Clips (recommended for hand-object)
- Official toolkit: https://github.com/facebookresearch/hot3d · project: https://facebookresearch.github.io/hot3d/
- Egocentric multi-view (Project Aria + Quest 3), ~833 min, 19 subjects, 33 rigid objects,
  with **3D hand + object pose/shape**. License-gated (Meta HOT3D License Agreement).
- **You do NOT need the full dataset.** Download **one sequence** (or a few HOT3D-Clips):

  ```bash
  # (A) full sequences — accept the license to get Hot3DAria_download_urls.json, then:
  python3 dataset_downloader_base_main.py \
      -c Hot3DAria_download_urls.json -o ../dataset \
      --sequence_name P0003_c701bd11 --data_types all

  # (B) HOT3D-Clips (curated WebDataset subset, 150 frames / 5 s, 3832 clips:
  #     2804 train / 1028 test; 1983 Aria / 1849 Quest3) — hosted on Hugging Face at
  #     bop-benchmark/hot3d  (folders: train_aria/ train_quest3/ test_aria/ test_quest3/).
  #     Grab a SMALL subset, e.g. the test_aria folder (may require `huggingface-cli login`):
  huggingface-cli download bop-benchmark/hot3d --repo-type dataset \
      --include "test_aria/*" --local-dir data/external/hot3d/clips
  # (full HOT3D Aria is also mirrored at the projectaria/hot3d HF dataset)
  ```
  Place results under `backend/data/external/hot3d/` (`sequences/` and/or `clips/`).
- Index: one row per clip/sequence. `sample_id` (clip uid / sequence name), `subject_id`
  (e.g. `P0003`), `object_name`, `camera_view` (`aria`/`quest`), `fps`, `num_frames`
  (clips = 150). `action_label`/`intent_label` left empty (tracking, not handover).
- Keypoints: project the dataset's 3D hand keypoints into our `body`/`hand_right` layout
  (a per-format TODO), or run `extract_keypoints.py` over the egocentric RGB.

> **Honest project note:** *"For demo, we use 1 HOT3D training sequence or a small number
> of HOT3D-Clips. The full HOT3D dataset is not required."*

## H3WB / Human3.6M
- Official (annotations): https://github.com/wholebody3d/wholebody3d · paper: arXiv:2211.15692
- Images require a Human3.6M academic account: http://vision.imar.ro/human3.6m/
- For the **lifting baseline**: produce keypoints JSON where each frame has both `body`
  (2D) and `body_3d` (`[17][x,y,z]`); the adapter/your converter writes these. Then
  `python ml/train.py --model lifting --manifest data/manifests/h3wb_manifest.csv --keypoints data/keypoints`.
- Index: `sample_id`, `subject_id`, `annotation_path`, `num_frames`. `has_3d_pose=1`.

## InterHand2.6M (ECCV 2020)
- Official: https://mks0601.github.io/InterHand2.6M/ (CC BY-NC 4.0)
- Index: `sample_id`, `subject_id`, `annotation_path`. Used for hand-pose pretraining.

## EPIC-KITCHENS-100 / Something-Something V2 (fallback)
- EPIC: https://epic-kitchens.github.io/ (annotations on GitHub; media via data.bris).
- Sth-Sth V2: https://20bn.com/datasets/something-something/v2 (Qualcomm account).
- Not wired as first-class adapters (action-recognition fallback only). Use them as generic
  action sources; map their labels to `action_label` in an index and reuse the action
  baseline. Keep usage subset-only and cite the license.

---

**Reminders:** accept each license before downloading; keep raw data under
`data/external/<name>/` (git-ignored); cite the dataset paper; do **not** claim training
until you have actually run `ml/train.py` + `eval/*.py` on the prepared manifest.
