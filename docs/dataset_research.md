# Dataset research

Public datasets evaluated for **Embodied Handoff Perception**. The goal is to source
data for: 3D human pose, hand/body pose, video understanding, human–object interaction
(HOI), hand-trajectory forecasting, and human→robot handoff intent.

> **Honesty note.** This project currently ships **demo-mode simulated inference** plus a
> small **self-recorded MVP dataset** plan ([dataset_collection_guide.md](dataset_collection_guide.md))
> and **client-side MediaPipe** real pose on uploaded video. The datasets below are
> **planned extensions / inspiration / benchmarks** — none are redistributed in this repo,
> and the project does **not** claim to be trained on them. Always confirm the current
> license on the **official page** before downloading; the summaries here can go stale.

## How to read the "usefulness" column

- **train** — directly trainable for one of our learned stages.
- **pretrain** — useful for pretraining / representation learning, then fine-tune on MVP.
- **benchmark** — for measuring a stage against a standard split.
- **inspiration** — informs task design / taxonomy; not necessarily ingested.

## Comparison table

| Dataset | Official URL | Modality | Relevant task(s) | Size | License / access | Registration | Processing difficulty | Usefulness here | Recommended usage |
|---|---|---|---|---|---|---|---|---|---|
| **HOT3D / HOT3D-Clips** | https://github.com/facebookresearch/hot3d | Egocentric multi-view (Aria/Quest) RGB; 3D hand + object pose/shape | Hand-object 3D tracking, hand pose, HOI | ~833 min, 19 subj, 33 obj; Clips ~3832×150f | HOT3D License Agreement (Meta), research | Yes (license; clips on HF) | Medium (Clips subset is easy: WebDataset) | ★★★★★ egocentric hand-object 3D | pretrain / subset experiments |
| **HOI4D** | https://hoi4d.github.io/ | RGB-D egocentric, 3D hand pose, object pose, segmentation, meshes | HOI, hand pose, action segmentation | ~2.4M RGB-D frames / 4000 seqs | Academic/research (verify on site) | Yes (form) | High (RGB-D + meshes) | ★★★★ HOI + hand-object priors | pretrain / inspiration / subset experiments |
| **Ego4D / Ego-Exo4D** | https://ego4d-data.org/ · https://ego-exo4d-data.org/ | Egocentric (multimodal) video; Ego-Exo4D adds exocentric | Video understanding, hand-object, forecasting | Thousands of hours (TB) | Ego4D License Agreement (sign → ~48h → AWS creds) | Yes (license agreement) | Very high (huge) | ★★★ egocentric video understanding | inspiration / benchmark (small subset only) |
| **Human3.6M** | http://vision.imar.ro/human3.6m/ | RGB + 3D mocap (17 joints) | 2D→3D pose lifting | Large (TB) | **Academic use only** EULA | Yes (academic email) | Medium | ★★★★ pose-lifting supervision | train (lifting) / benchmark |
| **H3WB (WholeBody3D)** | https://github.com/wholebody3d/wholebody3d | 2D/3D whole-body keypoints (133: body/feet/face/hands) on 100K images | Whole-body 2D→3D lifting | 100K images (annotations small) | Annotations on GitHub; **images require Human3.6M license** | Via Human3.6M | Low–Medium (annotations are JSON) | ★★★★ whole-body lifting incl. hands | train (lifting) / benchmark |
| **InterHand2.6M** | https://mks0601.github.io/InterHand2.6M/ · https://github.com/facebookresearch/InterHand2.6M | RGB, 3D interacting-hand pose | 3D hand pose | ~2.6M images | **CC BY-NC 4.0** | Agreement/form | Medium | ★★★ hand-pose realism | pretrain (hand pose) |
| **DexYCB** | https://dex-ycb.github.io/ | RGB-D, hand pose, object 6DoF | Hand-object grasp, object pose | ~119 GB | **CC BY-NC 4.0** | Yes (download form) | Medium–High (large RGB-D) | ★★★★ grasp/hand-object | pretrain / subset experiments |
| **Something-Something V2** | https://20bn.com/datasets/something-something/v2 (Qualcomm) | RGB video | Temporal action recognition | 220,847 clips (~19.4 GB) | Qualcomm academic license | Yes (account) | Medium | ★★★ object-manipulation actions | pretrain / inspiration (action) |
| **EPIC-KITCHENS-100** | https://epic-kitchens.github.io/ | Egocentric RGB (+flow) | Action recognition, hand-object, anticipation | ~100 hours (large) | **CC BY-NC 4.0** | data.bris / academic torrents | High (large egocentric) | ★★★ egocentric hand-object | inspiration / subset experiments |
| **NTU RGB+D (60/120)** | https://rose1.ntu.edu.sg/dataset/actionRecognition/ | RGB, depth, IR, 3D skeleton (25 joints) | Skeleton action recognition | ~1.3 TB / 56,880 samples | ROSE Lab academic agreement | Yes (request) | High (very large) | ★★ skeleton-action reference | inspiration / benchmark |
| **HOH (Human-Object-Human Handover)** | https://tars-home.github.io/hohdataset/ | Multi-view RGB-D, skeletons, point clouds, grasp/handedness, comfort | **Handover** parameter estimation, grasp, giver/receiver | 2,720 interactions, 136 objects, 40 participants | Research (verify on site) | Yes (likely) | Medium–High | ★★★★★ closest to our handoff task | inspiration / subset experiments / benchmark |

### Honorable mentions (found during research)
- **CORE4D** (https://arxiv.org/pdf/2406.19353) — 4D human-object-human collaborative object
  rearrangement; relevant to two-person handover dynamics.
- **Re:InterHand** (https://mks0601.github.io/ReInterHand/) — relighted 3D interacting hands.

## Most useful for *this* project (ranked)

1. **HOH** — the only listed set explicitly about **handovers** (giver/receiver, grasp,
   timing). Closest match to our handoff-intent goal; great for benchmark/inspiration.
2. **H3WB + Human3.6M** — the practical path to real **2D→3D whole-body pose lifting**
   (our Stage 02), including hands. H3WB annotations are light; images sit behind the
   Human3.6M academic EULA.
3. **HOT3D / HOT3D-Clips** — **egocentric hand-object 3D tracking** with hand + object
   pose; the closest public match to our perception front-end. HOT3D-Clips (WebDataset,
   150f/5s) makes a tiny subset easy: one sequence or a few clips suffices for a demo.
4. **HOI4D** — rich **RGB-D human-object interaction** with hand+object pose; strong for
   pretraining the perception front-end and for HOI inspiration.
4. **DexYCB** — **hand-object grasping** with object 6DoF; good for grasp/approach cues.
5. **Something-Something V2 / EPIC-KITCHENS / Ego4D** — **video-understanding** and
   egocentric **hand-object** references; use small subsets only (all are large).
6. **InterHand2.6M** — hand-pose realism pretraining. **NTU RGB+D** — skeleton-action
   reference (very large; inspiration/benchmark only).

## Practical takeaway

For an internship-scope MVP: **self-record** the primary set (see
[dataset_collection_guide.md](dataset_collection_guide.md)), use **H3WB/Human3.6M** for
lifting supervision, draw **HOI4D/DexYCB** subsets for hand-object pretraining, and treat
**HOH** as the handover benchmark/inspiration. Everything large stays
**metadata-only / subset-only**; nothing is redistributed here. License details:
[data_license_notes.md](data_license_notes.md).

---

## Sources

- [HOT3D — GitHub toolkit](https://github.com/facebookresearch/hot3d) (CVPR 2025) · [project page](https://facebookresearch.github.io/hot3d/) · HOT3D-Clips on Hugging Face: [bop-benchmark/hot3d](https://huggingface.co/datasets/bop-benchmark/hot3d) (full Aria: [projectaria/hot3d](https://huggingface.co/datasets/projectaria/hot3d))
- [HOI4D — project page](https://hoi4d.github.io/) · [paper (arXiv:2203.01577)](https://arxiv.org/abs/2203.01577)
- [Ego4D](https://ego4d-data.org/) · [Ego-Exo4D](https://ego-exo4d-data.org/) · [code](https://github.com/facebookresearch/Ego4d)
- [Human3.6M](http://vision.imar.ro/human3.6m/) · [EULA](http://vision.imar.ro/human3.6m/eula.php)
- [H3WB (WholeBody3D) — GitHub](https://github.com/wholebody3d/wholebody3d) · [paper (arXiv:2211.15692)](https://arxiv.org/abs/2211.15692)
- [InterHand2.6M — project](https://mks0601.github.io/InterHand2.6M/) · [GitHub](https://github.com/facebookresearch/InterHand2.6M)
- [DexYCB — project](https://dex-ycb.github.io/) · [toolkit](https://github.com/NVlabs/dex-ycb-toolkit)
- [Something-Something V2 (Qualcomm)](https://20bn.com/datasets/something-something/v2)
- [EPIC-KITCHENS-100](https://epic-kitchens.github.io/) · [annotations](https://github.com/epic-kitchens/epic-kitchens-100-annotations)
- [NTU RGB+D — ROSE Lab](https://rose1.ntu.edu.sg/dataset/actionRecognition/) · [info/code](https://github.com/shahroudy/NTURGB-D)
- [HOH — project](https://tars-home.github.io/hohdataset/) · [NeurIPS 2023](https://proceedings.neurips.cc/paper_files/paper/2023/hash/d8c6a37c4c94e9a63e53d296f1f668ae-Abstract-Datasets_and_Benchmarks.html) · [paper (arXiv:2310.00723)](https://arxiv.org/abs/2310.00723)
