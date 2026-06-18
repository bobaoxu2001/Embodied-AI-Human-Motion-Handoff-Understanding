# Demo mode

This project ships **fully working in demo mode**. Demo mode means the system produces
**deterministic, realistic, contract-shaped** results without any trained models or ML
dependencies — so you can run, demo, and screenshot the entire product immediately.

## Why it exists

- **Recruiters/reviewers can run it in two minutes** — no GPU, no model downloads, no
  dataset. `pip install -r requirements.txt` (FastAPI only) and `npm install` is enough.
- **The UI is built and verified before models exist.** The same `InferenceResult`
  contract is served by demo stubs now and by real models later — no frontend rewrite.
- **It's honest.** Everything on screen is marked `DEMO MODE`, and every number is a
  *target/placeholder* simulated on a ~150-clip MVP set, not a benchmark.

## How it works

- **Backend** (`backend/app/demo.py`): a deterministic engine interpolates sparse wrist
  keyframes per frame and emits a complete `InferenceResult` (action + scores, handoff
  intent, 2D/3D pose, object bbox, trajectory history/forecast, robot action). Same input
  → same output, every time (covered by `tests/test_api.py`).
- **Frontend** (`frontend/src/lib/demoEngine.ts`): a TypeScript twin of the same logic,
  so the UI renders pixel-for-pixel with the design even with the backend offline.
- **Capability detection** (`backend/app/runtime.py`): probes for torch / mediapipe /
  opencv and the compute device. `demo_mode()` is `True` unless torch is installed **and**
  ONNX weights exist in `backend/ml/weights/`.

## Demo vs. real — what changes

| Concern | Demo mode (now) | Real mode (later) |
|---|---|---|
| Dependencies | FastAPI + Node only | + torch, onnxruntime, opencv, mediapipe |
| Pose/action/trajectory/intent | deterministic keyframe engine | trained models behind the same `Stage` interface |
| Keypoints | synthetic fallback | MediaPipe over decoded frames |
| Metrics | simulated targets | measured on held-out test split |
| API contract | `InferenceResult` | **identical** `InferenceResult` |
| Frontend | unchanged | **unchanged** |

## Turning demo mode off

1. `pip install -r backend/requirements-ml.txt`
2. Train models and export: `python backend/ml/export_onnx.py --out ml/weights`
3. Implement `_build_model` / `_run_real` on each stage in `backend/app/pipeline/stages.py`
4. Restart the backend — `runtime.demo_mode()` returns `False` automatically.

The on-screen `DEMO MODE` markers should remain until the system is actually serving real
processed data.
