# Architecture

This document explains how the system is put together and how to evolve it from the
shipped demo into a real ML service. The UI/interaction contract is defined by the
Claude Design handoff in `design_handoff_embodied_handoff_perception/HANDOFF.md`; this
doc covers the runtime architecture.

## Design principles

1. **Demo-first, contract-stable.** The frontend and backend agree on one payload —
   `InferenceResult` — whether it comes from canned demo values or real models. You can
   build, screenshot, and demo the whole product before any model is trained.
2. **Graceful degradation.** Heavy dependencies (torch, mediapipe, opencv) are optional.
   The service detects what's installed (`app/runtime.py`) and falls back to deterministic
   demo output. The frontend falls back to a local demo engine if the backend is offline.
3. **One source of truth per concern.** Pose interpolation lives in one engine on each
   side (`frontend/src/lib/demoEngine.ts`, `backend/app/demo.py`) computed from the same
   keyframes, so the two halves stay visually identical.

## Inference pipeline (5 stages)

| # | Stage | Model (stub) | Input → Output |
|---|---|---|---|
| 01 | Pose extraction | HRNet-W32 + hand detector / MediaPipe | RGB frame → 17 body + 42 hand 2D keypoints |
| 02 | 2D→3D lifting | Temporal lifting transformer | 2D sequence → root-relative 3D joints (mm) |
| 03 | Action recognition | Pose-TCN (causal) | 3D pose window → 6 actions |
| 04 | Trajectory forecast | Seq2seq GRU decoder | wrist history → 1.0s future path (30 steps) |
| 05 | Handoff intent | Fusion MLP head | pose+motion features → intent + confidence |

Stage interfaces: `backend/app/pipeline/`. PyTorch architectures: `backend/ml/models/`.
Each stage class (`Stage` in `pipeline/base.py`) has a `demo` flag and `_run_real` hook;
in demo mode `run()` passes through the deterministic demo output.

## Backend (FastAPI)

```
backend/app/
├─ main.py        # routes, CORS, in-memory analysis store, pipeline wiring
├─ schemas.py     # Pydantic models == the API contract (mirrors HANDOFF.md §6)
├─ demo.py        # deterministic per-frame InferenceResult (no ML deps)
├─ runtime.py     # capability detection: has_torch/mediapipe/opencv, device, demo_mode
└─ pipeline/
   ├─ base.py     # Stage interface + demo fallback
   ├─ stages.py   # the 5 concrete stages
   └─ keypoints.py# MediaPipe wrapper (graceful if absent)
```

- **State store.** Analyses are kept in an in-memory dict — fine for an MVP/demo. For
  production, swap for Redis/Postgres and persist decoded-frame caches.
- **`demo_mode()`** returns `True` unless torch is installed *and* ONNX weights exist in
  `backend/ml/weights/`. Dropping weights in flips the service to real inference.

## Frontend (React + Vite + TS + Tailwind)

```
frontend/src/
├─ App.tsx                 # React Router: landing outside the shell, 5 routes inside
├─ state/playback.tsx      # shared frame/playing/camera context + 90ms frame ticker
├─ hooks/useScrub.ts       # the single draggable-scrub primitive (HANDOFF §4)
├─ lib/demoEngine.ts       # per-frame derivation (port of the prototype's renderVals)
├─ lib/api.ts              # REST client with graceful fallback
├─ data/demo.ts            # static demo content transcribed from the prototype
├─ components/             # AppShell, Sidebar, TopBar, SkeletonOverlay, ScrubBar, …
└─ routes/                 # Overview, VideoAnalysis, PoseViewer3D, ModelInspector,
                           # DatasetEval, Handoff
```

- **Overlays** are absolutely-positioned SVG sharing the video container in a normalized
  640×400 viewBox; normalized `[0,1]` backend coords scale to it.
- **Playback** ticks a frame counter; in production bind to `<video>.currentTime` or a
  WebSocket frame index. The scrubber sets the frame and pauses playback; every derived
  value (timecode, action, confidence, robot card, playhead) follows from `frame`.

## Going from demo → real models

1. `pip install -r backend/requirements-ml.txt` (torch, onnxruntime, opencv, mediapipe).
2. Collect & label clips ([docs/DATASET.md](DATASET.md)); extract keypoints
   (`scripts/extract_keypoints.py`).
3. **Train** the learned stages with [`ml/train.py`](../backend/ml/train.py)
   (`--model {lifting,action,trajectory,intent}`). The architectures are real
   `nn.Module`s; `trajectory` (self-supervised) and `action` (manifest labels) train end
   to end from keypoints alone, `lifting`/`intent` take extra 3D / intent labels. Saves
   `ml/checkpoints/<model>.pt`.
4. **Export:** `python ml/export_onnx.py --out ml/weights` loads those checkpoints and
   emits `<stage>.onnx` graphs (opset 17, optional int8).
5. **Inference is already wired:** `Stage` ([pipeline/base.py](../backend/app/pipeline/base.py))
   runs the matching ONNX graph via onnxruntime when `demo=False` and the weights exist —
   no per-stage code to write. Heavy imports stay inside the real path so demo mode keeps
   zero ML deps.
6. Restart — `runtime.demo_mode()` is now `False`; the API contract is unchanged, so **no
   frontend changes** are needed.

## Realtime streaming (`/ws/stream`)

The WebSocket endpoint (`app/streaming.py`) pushes one `InferenceResult` per frame
at the clip FPS — true realtime instead of per-frame REST polling. It accepts
`play` / `pause` / `seek` / `config` control messages; the frontend `useStream`
hook (`frontend/src/hooks/useStream.ts`) consumes it and the *Video analysis*
page shows a live stream card. If the socket is unreachable (e.g. the static
Vercel deploy) the UI stays on its local demo engine — same graceful-degradation
contract as the REST client.

## Future work

- Real training + int8 ONNX export; replace simulated metrics with measured ones.
- Multi-person tracking + re-identification to fix association id-switches.
- Egocentric / first-person extension (Ego4D-style).
- Robot-in-the-loop evaluation of the emitted `robot_action` commands.
- Dockerized multi-stage image with ONNX Runtime + CPU fallback.
