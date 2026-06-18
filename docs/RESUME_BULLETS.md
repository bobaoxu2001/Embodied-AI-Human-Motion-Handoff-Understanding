# Résumé bullets

Drop-in bullets for an ML Engineer Intern (robotics / embodied AI) application. Pick 2–4.
Phrased honestly — the system ships in demo mode; metrics are simulated targets on a
~150-clip MVP set until real models are trained.

## Concise (pick a few)

- Built a full-stack **embodied-AI perception system** (React + TypeScript + FastAPI +
  PyTorch) that tracks 2D/3D human & hand pose from RGB video and predicts **human→robot
  handoff intent** in real time, designed to a 33 ms / 30 fps latency budget.
- Designed a **5-stage inference pipeline** — pose extraction → 2D→3D lifting (temporal
  transformer) → action recognition (causal Pose-TCN) → hand-trajectory forecasting
  (seq2seq GRU) → handoff-intent classification (fusion MLP) — each behind a clean
  interface with a demo-mode fallback.
- Architected a **demo-mode-first** service: a deterministic engine serves the exact
  `InferenceResult` API contract with zero ML dependencies, so real models drop in behind
  the same API with **no frontend changes**.
- Implemented the perception **dashboard UI** (React + Vite + Tailwind): draggable
  timeline scrubber, animated SVG pose/hand/trajectory overlays, and a 3D pose viewer,
  all driven from a single per-frame state via a reusable `useScrub` hook.
- Wrote the **dataset + evaluation tooling** (manifest build, MediaPipe keypoint
  extraction with graceful fallback, stratified split, validation) and metrics for
  **action accuracy, handoff precision/recall/F1, trajectory ADE/FDE, and latency/FPS**.
- Engineered for **graceful degradation**: optional torch/MediaPipe/OpenCV detected at
  runtime; CPU fallback; frontend falls back to a local engine if the backend is offline.

## Slightly longer (single strong bullet)

- Built **Embodied AI — Human Motion & Handoff Understanding**, an end-to-end perception
  system (React/TS frontend, FastAPI/Pydantic backend, PyTorch model stubs) that reads RGB
  video to track 3D body & hand pose, recognize 6 manipulation actions, forecast a 1.0 s
  hand trajectory, and decide human→robot handoff intent — shipping as a runnable demo with
  a deterministic backend that mirrors the production `InferenceResult` contract, plus
  dataset pipelines and evaluation (action top-1, handoff P/R/F1, trajectory ADE/FDE,
  latency/FPS). *Metrics are simulated targets on a ~150-clip MVP set.*

## Talking points (for interviews)

- **Why demo mode?** Lets you build/verify the product and API contract before models
  exist; de-risks integration; makes the repo runnable by anyone in minutes.
- **Streaming latency budget:** causal TCN for action recognition + per-stage latency
  budget (13.2/6.1/5.4/4.9/3.4 ms) targeting 30 fps end-to-end.
- **Robustness:** documented failure modes (occlusion, fast motion, lighting, multi-person,
  unusual angles) and a roadmap to address them.
- **Honesty:** every simulated number is labeled `DEMO MODE` on-screen and in docs.
