# Handoff: Embodied Handoff Perception

## Overview
A perception dashboard for an embodied-AI system that reads RGB video of a person
interacting with an object and, in real time, tracks 2D/3D body & hand pose, forecasts
the hand trajectory, recognizes the current action, and decides whether the person
intends to hand the object to a robot. The product is an internal robotics-lab tool: a
landing/overview page plus a four-screen workspace (video analysis, 3D pose viewer,
model inspector, dataset & evaluation) and a built-in implementation-handoff screen.

## About the Design Files
The files in this bundle are **design references created in HTML** — a prototype showing
the intended look and behavior, **not production code to copy directly.** The task is to
**recreate these designs in the target codebase's environment.** The recommended stack
(stated throughout the prototype) is **React + Vite + TypeScript** (frontend), **FastAPI +
Pydantic** (backend), and **PyTorch → ONNX** model stubs — but follow the project's
established patterns and libraries if it already has them. Build the frontend and a
**demo-mode** backend (canned/keyframed responses) first; drop real models in behind the
same API later with no frontend changes.

> `HANDOFF.md` (in this folder) is the authoritative spec: routes, component list, state
> table, the `InferenceResult` TypeScript type + sample JSON, API endpoints, interaction
> and animation behavior, frontend/backend notes, and a suggested repo layout. This README
> summarizes it; read `HANDOFF.md` for the exact contract.

## Fidelity
**High-fidelity.** Final colors, typography, spacing, and interactions are specified. The
prototype is a single Design Component (`.dc.html`) that renders as a real app with working
navigation, a playing timeline, draggable scrubbers, and animated overlays. Recreate the
UI to match, using the codebase's component library where one exists.

> **Important — demo data:** every metric, score, and dataset count shown is **simulated /
> demo-mode** on a ~150-clip MVP set. They are targets/placeholders, not benchmarks.
> Preserve the on-screen DEMO MODE markers until the system produces real processed data.

## Screens / Views

### 1. Landing / Overview  (`/`)
- **Purpose:** communicate the value prop in ~5 seconds and route into the tool.
- **Layout:** centered max-width 1280px. Top header (logo + name left, "Model card" /
  "Launch dashboard →" buttons right). Below, a two-column grid (`1fr 1.15fr`, 54px gap):
  left = headline + paragraph + capability badges + 4 stat blocks + demo disclaimer;
  right = hero visualization card. Full-width 5-card "inference pipeline" ribbon underneath.
- **Hero card:** 16/10 frame with a monospace status strip ("cam_00 · rgb · 1280×720 ·
  30fps" / "inference: demo-mode"), an `<image-slot>` for a real frame, an SVG overlay
  (blue skeleton, purple hand landmarks, amber dashed object bbox, green dashed predicted
  trajectory with a target reticle), an animated scanline, and a green handoff-decision card.
- **Stats:** 30 fps · 33 ms p50 · 89.2% intent acc · 52 mm traj ADE, with a
  "demo-mode · simulated inference on a 150-clip MVP set" caption.

### 2. Video analysis  (`/analyze`)
- **Purpose:** play a clip with overlays and read live per-frame inference.
- **Layout:** two-column grid (`1.55fr 1fr`). Left = video panel (status strip, overlay
  SVG, transport bar with play/pause + draggable seek + timecode). Right = stacked cards:
  Current action (label + confidence + action chips), Handoff intent (large confidence
  number + bar, glowing), Future hand target (xyz + ADE/FDE/horizon), Suggested robot action.
- **Below:** full-width segmented action timeline (idle / reaching / grasping / handoff /
  placing / idle), the active segment glows, a white playhead tracks playback; draggable to seek.

### 3. 3D pose viewer  (`/pose`)
- **Purpose:** inspect the reconstructed 3D skeleton.
- **Layout:** two-column (`1.6fr 1fr`). Left = dark canvas with floor grid, ground shadow,
  3D skeleton (front bones bright, back bones dim), active wrist + hand keypoints, past
  (solid) and predicted (dashed) wrist trajectory, XYZ axis gizmo. Right = camera controls
  (azimuth/elevation sliders + front/side/top preset buttons), frame scrubber (draggable),
  and a legend.

### 4. Model inspector  (`/inspector`)
- **Purpose:** show architecture, metrics, deployment, latency.
- **Layout:** demo-mode caption; 6-up metric grid; horizontal 5-card architecture graph
  (Pose extraction → 2D→3D lifting → Action recognition → Trajectory forecast → Handoff
  intent, each with a stage number, tag pill, model name, I/O line); then a two-column row
  of Production deployment (FastAPI / Docker / ONNX Runtime / CPU-GPU with status dots) and
  Latency budget (per-stage bars summing to 33 ms · 30 fps).

### 5. Dataset & evaluation  (`/dataset`)
- **Purpose:** describe data sources and evaluation.
- **Layout:** 4-up data-source cards (Self-recorded "primary" 150 clips; HOI4D "inspired
  by"; H3WB/Human3.6M "benchmark"; Ego4D "planned"). Below, two columns: action class
  distribution bar chart (566 segments · 150 clips · demo split) and failure-cases list
  (occlusion, fast hand motion, poor lighting, multiple people, unusual angles) with
  severity dots.

### 6. Implementation handoff  (in-app `/handoff`)
- Mirrors `HANDOFF.md` on screen: conversion-target banner, 4-chip stack strip, component
  list, page routes, state variables, API endpoints, sample JSON, asset notes, animation &
  interaction behavior, and frontend/backend notes.

## Interactions & Behavior
- **Navigation:** landing "Launch dashboard" and pipeline cards enter the workspace; the
  sidebar switches screens; the logo returns to landing. (In React: React Router, routes above.)
- **Playback:** a frame counter (0–319 @ 30 fps) advances on a timer and drives every
  derived value. Production: bind to `<video>.currentTime` or a WebSocket frame index.
- **Draggable timeline/scrubbers:** pointer-drag on the transport bar, action timeline, or
  3D scrubber sets the frame directly and pauses playback; playhead, timecode, current
  action, handoff confidence, and robot-action card all follow. Implement once as a
  `useScrub(ref, onSeek)` hook (pointerdown → map clientX to fraction → track on `window`).
- **Simulated pose interpolation:** wrist/elbow/object/forecast points lerp between
  keyframes each frame (+ tiny jitter) so the figure reaches → grasps → hands off → places.
  Production: interpolate between real backend frames; do not snap.
- **Decorative animation:** confidence-bar width transition; pulse, glow, scanline, dashed
  trajectory flow. Safe to drop for static screenshots.

## State Management
| Name | Type | Notes |
|---|---|---|
| `frame` | `number` | current frame index 0..N |
| `playing` | `boolean` | playback transport state |
| `route` | `string` | active screen (react-router) |
| `sessionId` | `string` | uploaded clip session id |
| `inference` | `InferenceResult` | per-frame backend payload (type in HANDOFF.md §6) |
| `timeline` | `Segment[]` | action segments + confidences |
| `camera` | `{ az: number, el: number }` | 3D viewer orbit angles |
| `wsStatus` | `"online" \| "offline"` | stream socket health |

Data fetching: `useInference(sessionId)` — REST per-frame now, WebSocket subscription later.
API contract and the `InferenceResult` JSON/TS type are in `HANDOFF.md` §6–§7.

## Design Tokens
- **Colors:** bg `#070a0e`; panel `#0b0f15`; deep panel `#0a0d12`; borders `#141a23` /
  `#1c2533` / `#18222e`; text `#e8ecf2`; muted `#9aa4b2` / `#8a93a3`; faint `#5c6675`.
  Signal blue `#4d9fff` (pose/primary); green `#3ddc97` (handoff/success); purple `#9b7cff`
  / `#c98bff` (action/hands); alert amber `#ff8a3d`; error red `#ff5a4d`.
- **Typography:** UI = **Space Grotesk** (400–700); labels/numbers/code = **JetBrains Mono**.
  Headline 46px/1.08, letter-spacing −.025em; screen title 19px; metric numbers 24–38px;
  body 12.5–17px; mono labels 9.5–11px, letter-spacing .08–.12em, uppercase.
- **Radius:** cards 11–14px; chips/buttons 5–8px; pills 20px.
- **Spacing:** card padding 14–18px; grid/column gaps 12–18px; section gaps 18–24px.
- **Shadows:** hero `0 30px 80px -30px #000`; active timeline segment uses inset glow;
  intent card uses a soft green glow keyframe.

## Assets
- No external images. CV visualizations are inline SVG (recreate as SVG/Canvas).
- `<image-slot>` placeholders (`image-slot.js`) let a user drop a real RGB frame behind the
  overlay — replace with a `<video>`/`<canvas>` in production.
- Fonts load from Google Fonts (Space Grotesk, JetBrains Mono).

## Files
- `Embodied Handoff Perception.dc.html` — the full prototype (all 6 screens + logic).
- `image-slot.js` — drag-and-drop image placeholder web component.
- `support.js` — runtime for the prototype (reference only; not needed in the real app).
- `HANDOFF.md` — authoritative spec (routes, components, state, types, API, behaviors, repo layout).

To view the prototype: open `Embodied Handoff Perception.dc.html` in a browser (the three
files must sit in the same folder).
