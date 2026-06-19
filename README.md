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
