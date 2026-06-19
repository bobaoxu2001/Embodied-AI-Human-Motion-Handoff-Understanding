# Embodied AI — Human Motion & Handoff Understanding

[![CI](https://github.com/bobaoxu2001/Embodied-AI-Human-Motion-Handoff-Understanding/actions/workflows/ci.yml/badge.svg)](https://github.com/bobaoxu2001/Embodied-AI-Human-Motion-Handoff-Understanding/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**Real-time 3D human pose tracking and handoff-intent recognition for human–robot interaction.**

A full-stack perception system that reads RGB video of a person interacting with an
object and, frame by frame, tracks 2D/3D body & hand pose, recognizes the current
action, forecasts the hand's future trajectory, and decides whether the person intends
to **hand the object to a robot** — emitting a concrete robot action (e.g. *extend
gripper · open*).

Built as a portfolio project for a **Machine Learning Engineer Intern (robotics / embodied AI)** role.
It ships as a **fully working demo** today and is wired so real PyTorch models drop in
behind the same API with **no frontend changes**.

> **Demo mode:** every metric, score, and dataset count shown is *simulated* on a
> ~150-clip MVP set — targets/placeholders, not production benchmarks. The on-screen
> `DEMO MODE` markers stay until the system produces real processed data. See
> [docs/DEMO_MODE.md](docs/DEMO_MODE.md).

---

## What it does (5 screens)

| Screen | Route | Purpose |
|---|---|---|
| **Overview** | `/` | Landing / value prop, live hero visualization |
| **Video analysis** | `/analyze` | Play a clip with skeleton/hand/bbox/trajectory overlays + live per-frame inference cards, draggable timeline, scenario selector, and **upload your own video for real client-side pose inference** (MediaPipe, in-browser) |
| **3D pose viewer** | `/pose` | Reconstructed 3D skeleton, camera orbit controls, frame scrubber |
| **Model inspector** | `/inspector` | Architecture graph, metrics, deployment status, latency budget |
| **Model card** | `/model-card` | Per-model architecture, training config, intended use, limitations — also at [docs/MODEL_CARD.md](docs/MODEL_CARD.md) and `GET /api/model/card` |
| **Dataset & evaluation** | `/dataset` | Data sources, capture protocol, by-subject split, class distribution, failure cases |
| **Implementation handoff** | `/handoff` | The build contract mirrored on-screen |

The dark "robotics-lab" UI is a faithful build of the **Claude Design handoff** preserved
in [`design_handoff_embodied_handoff_perception/`](design_handoff_embodied_handoff_perception/)
(`HANDOFF.md` is the authoritative spec).

---

## Architecture

```
                            RGB video / uploaded clip
                                      │
        ┌─────────────────────────────┼──────────────────────────────┐
        │                      FastAPI backend                         │
        │                                                              │
        │   01 Pose extraction     HRNet-W32 + MediaPipe hands         │
        │        │  17 body + 42 hand 2D keypoints                     │
        │   02 2D→3D lifting       Temporal lifting transformer        │
        │        │  root-relative 3D joints (mm)                       │
        │   03 Action recognition  Pose-TCN (causal)  → 6 actions      │
        │   04 Trajectory forecast Seq2seq GRU        → 1.0s hand path │
        │   05 Handoff intent      Fusion MLP         → intent + conf  │
        │        │                                                     │
        │   demo-mode stubs return deterministic, contract-shaped      │
        │   results until real weights exist (app/pipeline + app/demo) │
        └──────────────────────────────┬───────────────────────────────┘
                                       │  InferenceResult JSON (per frame)
                            ┌──────────┴───────────┐
                            │   React + Vite + TS  │
                            │  Tailwind dark UI     │
                            │  SVG pose overlays    │
                            │  draggable scrubbers  │
                            └──────────────────────┘
```

- **Frontend:** React + Vite + TypeScript + Tailwind. SVG overlays in a normalized
  640×400 viewBox; one `useScrub` hook powers every draggable timeline; a shared
  playback context drives all per-frame derived values.
- **Backend:** FastAPI + Pydantic. The `InferenceResult` schema mirrors the design
  contract exactly. Each pipeline stage sits behind an interface with a demo-mode
  fallback, so the service runs with **zero ML dependencies**.
- **ML:** PyTorch model **stubs** (real, trainable `nn.Module` architectures) for the
  four learned stages + an ONNX export script + a MediaPipe keypoint wrapper. All torch
  imports are guarded so the demo runs without torch installed.

Full detail: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## Quickstart

Requirements: **Node ≥ 18** and **Python ≥ 3.8**. No GPU required; demo mode needs no ML libraries.

### 1) Backend (demo mode)

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
# → http://127.0.0.1:8000/api/health   (interactive docs at /docs)
```

### 2) Frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173   (proxies /api to the backend on :8000)
```

Open the app, click **Launch dashboard →**, and scrub the timeline. The frontend works
**even if the backend is down** — it falls back to a built-in demo engine. On the
*Video analysis* page, **upload your own video** to run **real 2D body & hand pose
inference in the browser** (MediaPipe / WASM — the video never leaves your device); the
overlay and action/handoff cards then reflect the real detection (action & intent are
honest heuristics over the real pose, labelled as such). This runs on the static
deployment too, with no backend required.

### 3) Demo mode is the default

You don't have to do anything special — both halves run in demo mode out of the box and
return deterministic, realistic results. To wire up real models:

```bash
pip install -r backend/requirements-ml.txt
python backend/ml/train.py --model trajectory   # also: action / lifting / intent
python backend/ml/export_onnx.py --out ml/weights
```

`ml/train.py` trains the real `nn.Module`s on extracted keypoints; `export_onnx.py` loads
the checkpoints and emits ONNX graphs. The pipeline stages then run those graphs via
onnxruntime automatically (`backend/app/pipeline/base.py`), `runtime.demo_mode()` flips to
`False`, and the API contract is unchanged. See [docs/DEMO_MODE.md](docs/DEMO_MODE.md) and
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#going-from-demo--real-models).

---

## API

| Method | Path | Purpose |
|---|---|---|
| `GET`  | `/api/health` | liveness + device + capability flags (torch/mediapipe) |
| `POST` | `/api/analyze-video` | upload a clip (or none) → `{ analysis_id, fps, n_frames, … }` |
| `GET`  | `/api/analysis/{id}` | full analysis: meta + segments + sample frame |
| `GET`  | `/api/analysis/{id}/frames/{n}` | one frame → `InferenceResult` |
| `GET`  | `/api/model/meta` | architecture + metrics + latency budget |
| `GET`  | `/api/model/card` | structured model card (per-model arch, training, limits) |
| `WS`   | `/ws/stream` | realtime per-frame `InferenceResult` stream (play/pause/seek/config) |

The `InferenceResult` payload (per-frame action, handoff intent, 2D/3D pose, object,
trajectory, robot action) is identical in the Pydantic schema and the TypeScript type —
see `backend/app/schemas.py` and `frontend/src/types.ts`.

---

## Dataset strategy

Honest summary of what data is where. Full detail:
[dataset_research.md](docs/dataset_research.md) (comparison table),
[dataset_collection_guide.md](docs/dataset_collection_guide.md) (how to collect),
[data_license_notes.md](docs/data_license_notes.md) (licenses & policy).

- **Included in this repo:** code, docs, and a tiny **example manifest**
  (`backend/data/examples/manifest.example.csv`). **No raw videos or large arrays** are
  committed (see `.gitignore`).
- **Simulated (demo mode):** all on-screen metrics and the per-frame inference are
  **demo-mode simulated**; `extract_keypoints.py` falls back to **synthetic keypoints**
  when MediaPipe/OpenCV aren't installed. Labelled `DEMO MODE` throughout.
- **Real, today:** uploading a video on *Video analysis* runs **real client-side MediaPipe**
  2D body+hand pose **in your browser** (no backend, no upload).
- **Self-recorded MVP (planned primary set):** 120–180 short clips across
  `idle · walking · reaching · grasping · placing · pointing · handoff` — video-level labels
  first, segment-level later. Capture protocol + pipeline:
  [dataset_collection_guide.md](docs/dataset_collection_guide.md).
- **Public datasets (planned extension, download separately):** none are redistributed
  here. Use official sources only, subset/metadata-first:

  ```bash
  # print official links + license + registration; prepare folders (no bulk download)
  python backend/scripts/download_public_dataset_metadata.py --dataset all --dry-run
  python backend/scripts/download_public_dataset_metadata.py --dataset h3wb --metadata-only
  ```

  Recommended roles: **H3WB / Human3.6M** → 2D→3D lifting (train/benchmark);
  **HOI4D / DexYCB / EPIC-KITCHENS** → human-object interaction (pretrain/subset);
  **Ego4D / Something-Something V2 / NTU RGB+D** → video-understanding references;
  **HOH** → human→robot handover benchmark/inspiration; **InterHand2.6M** → hand-pose
  pretrain. Framing is *"inspired by HOI4D/Ego4D-style tasks"* / *"planned extension"* —
  not *"trained on"*.

---

## Next: From Demo Mode to Real MVP

A practical, honest path from the simulated demo to **measured** baselines on a
**self-recorded** set. Full detail: [REAL_DATA_MVP_PLAN.md](docs/REAL_DATA_MVP_PLAN.md),
[DATA_CAPTURE_WORKFLOW.md](docs/DATA_CAPTURE_WORKFLOW.md),
[TRAINING_BASELINES.md](docs/TRAINING_BASELINES.md). The *Dataset* and *Model inspector*
pages show a live **real-data readiness** checklist.

**1) Record a 40–60 clip pilot** (≈6–8 per class, grow to 120–180 later) across
`idle · walking · reaching · grasping · placing · pointing · handoff`. Use the in-app
**Data capture** page (`/capture`) — webcam/upload, **local only, nothing uploaded** — or
record manually as `s01_handoff_front_001.mp4` under `backend/data/raw/<label>/`.

**2–4) Build the dataset** (standard library; install `requirements-ml.txt` for real keypoints):

```bash
cd backend && source .venv/bin/activate
python scripts/create_dataset_manifest.py --videos data/raw --out data/manifest.csv
python scripts/extract_keypoints.py        --manifest data/manifest.csv --out data/keypoints
python scripts/split_dataset.py            --manifest data/manifest.csv --out data/splits --by-subject
python scripts/validate_dataset.py         --manifest data/manifest.csv --keypoints data/keypoints --check-files
```

**5) Train baselines** (default backend is **stdlib, no torch** — runs on tiny data):

```bash
python ml/train.py --model action --manifest data/manifest.csv --keypoints data/keypoints --out ml/weights/action_baseline.pt
python ml/train.py --model intent --manifest data/manifest.csv --keypoints data/keypoints --out ml/weights/intent_baseline.pt
```

**6) Evaluate (measured)**:

```bash
python eval/action_accuracy.py    --manifest data/manifest.csv --keypoints data/keypoints --weights ml/weights/action_baseline.pt --split test
python eval/handoff_prf.py        --manifest data/manifest.csv --keypoints data/keypoints --weights ml/weights/intent_baseline.pt --split test
python eval/trajectory_ade_fde.py --manifest data/manifest.csv --keypoints data/keypoints --split test
```

**Interpreting results (honest):** action = softmax-regression baseline, intent =
logistic-regression baseline, trajectory = **constant-velocity heuristic**. On tiny or
synthetic-keypoint data the numbers are weak by design — a useful baseline should beat the
**majority class** on a real **by-subject** test split. Report accuracy **with** per-class
recall + confusion. Don't invent millimetres for trajectory without a real calibration.

**What remains simulated** until you finish the checklist: the on-screen metrics, the
demo timeline, and the deterministic per-frame inference (all marked `DEMO MODE`). The
backend trained models are **not active** until ONNX weights exist; the live Vercel site is
**static frontend + browser MediaPipe + demo fallback** (no FastAPI) —
see [DEPLOYMENT_NOTES.md](docs/DEPLOYMENT_NOTES.md).

---

## Using Public Datasets Instead of Self-Recording

Prefer not to record your own clips? Train on **official public datasets** via the adapters
in `backend/datasets/`. Nothing is downloaded automatically and **no raw data is
redistributed** — you download manually under each dataset's license, then the adapter
converts its metadata into the project's normalized manifest. Full guides:
[NO_SELF_RECORDING_PLAN.md](docs/NO_SELF_RECORDING_PLAN.md),
[PUBLIC_DATASET_ADAPTERS.md](docs/PUBLIC_DATASET_ADAPTERS.md),
[DATASET_DOWNLOAD_MANUAL.md](docs/DATASET_DOWNLOAD_MANUAL.md).

**Recommended order**
1. **HOH** or **H2O** — handover / handoff intent (positive samples).
2. **H3WB / Human3.6M** — 2D→3D pose lifting.
3. **HOI4D / DexYCB** — hand-object pretraining (+ InterHand2.6M for hand pose).

**Prepare a dataset (after manual download into `data/external/<name>/`):**

```bash
cd backend && source .venv/bin/activate
# inspect structure + official link + license (writes nothing)
python scripts/prepare_public_dataset.py --dataset hoh   --root data/external/hoh   --out data/manifests/hoh_manifest.csv   --dry-run
# build the normalized manifest from your metadata index
python scripts/prepare_public_dataset.py --dataset hoh   --root data/external/hoh   --out data/manifests/hoh_manifest.csv
python scripts/prepare_public_dataset.py --dataset h3wb  --root data/external/h3wb  --out data/manifests/h3wb_manifest.csv  --metadata-only
python scripts/prepare_public_dataset.py --dataset hoi4d --root data/external/hoi4d --out data/manifests/hoi4d_manifest.csv --dry-run
```

**Then train/eval baselines on the normalized manifest** (needs keypoints — extract from
the dataset's RGB with `extract_keypoints.py`, or convert its pose annotations):

```bash
python ml/train.py --model intent --manifest data/manifests/hoh_manifest.csv --keypoints data/keypoints --out ml/weights/intent_baseline.pt
python eval/handoff_prf.py        --manifest data/manifests/hoh_manifest.csv --keypoints data/keypoints --weights ml/weights/intent_baseline.pt --split test
```

> **Honesty:** raw datasets are **not included**; each requires registration/EULA. Adapters
> map handover sets (HOH/H2O) to **positive** handoff intent and leave non-handover sets'
> intent **unknown** (never faked as negatives) — so intent training needs both a handover
> source and a non-handover source. **Do not claim training on any dataset until you have
> actually run the scripts** on the prepared manifest. Everything else remains demo-mode
> simulated.

---

## Dataset & evaluation tooling

Runnable end-to-end with the standard library (OpenCV/MediaPipe optional):

```bash
cd backend && source .venv/bin/activate

# build → extract → split → validate
python scripts/create_dataset_manifest.py --demo --out data/manifest.csv
python scripts/extract_keypoints.py        --manifest data/manifest.csv --out data/keypoints
python scripts/split_dataset.py            --manifest data/manifest.csv --out data/splits
python scripts/validate_dataset.py         --manifest data/manifest.csv --keypoints data/keypoints

# evaluation metrics (synthetic demo data with --demo)
python eval/action_accuracy.py    --demo    # top-1 acc, per-class recall, confusion matrix
python eval/handoff_prf.py        --demo    # precision / recall / F1
python eval/trajectory_ade_fde.py --demo    # ADE / FDE
python eval/runtime_bench.py      --demo    # latency / FPS / model size
```

Collecting your own clips: [docs/DATASET.md](docs/DATASET.md).

---

## Tests

```bash
cd backend && source .venv/bin/activate && pytest -q     # API + demo-engine tests (8)
cd frontend && npm test                                   # vitest demo-engine tests (11)
cd frontend && npm run build                              # type-check + production build
```

---

## Project layout

```
.
├─ design_handoff_embodied_handoff_perception/   # Claude Design handoff (source of truth — preserved)
├─ frontend/                 # React + Vite + TypeScript + Tailwind
│  └─ src/{routes,components,hooks,state,lib,data}
├─ backend/                  # FastAPI
│  ├─ app/{main,schemas,demo,runtime}.py
│  ├─ app/pipeline/          # stage interfaces + MediaPipe wrapper + demo stubs
│  ├─ ml/models/             # PyTorch models (lifting, action, trajectory, intent)
│  ├─ ml/train.py            # real training loops; ml/export_onnx.py → ONNX weights
│  ├─ scripts/               # dataset manifest / keypoints / split / validate
│  ├─ eval/                  # action, handoff PRF, trajectory ADE/FDE, runtime
│  └─ tests/
└─ docs/                     # architecture, dataset guide, demo-mode, resume bullets
```

---

## Failure cases & future work

Known limitations (also surfaced on the *Dataset & evaluation* screen):

- **Occlusion** of the hand/object drops keypoints (≈ −8% recall in eval).
- **Fast hand motion** / motion blur increases final-step trajectory error.
- **Poor lighting** raises sensor noise and lowers recall.
- **Multiple people** cause association ambiguity / id switches.
- **Unusual camera angles** (top-down, extreme oblique) degrade lifting.

Roadmap: real model training on collected clips → ONNX/int8 export → WebSocket streaming
inference → multi-person tracking → egocentric (Ego4D-style) extension → robot-in-the-loop
evaluation. More in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#future-work).

Résumé bullets for this project: [docs/RESUME_BULLETS.md](docs/RESUME_BULLETS.md).

---

## Credits

UI/UX from a **Claude Design** handoff package (preserved, unmodified, under
`design_handoff_embodied_handoff_perception/`). All ML metrics shown are simulated demo data.

---

## License

[MIT](LICENSE) © Allen Xu
