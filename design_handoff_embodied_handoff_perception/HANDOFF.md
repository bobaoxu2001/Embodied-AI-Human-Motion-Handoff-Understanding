# Implementation Handoff — Embodied Handoff Perception

This document maps the prototype (`Embodied Handoff Perception.dc.html`) onto a real
**React + Vite + TypeScript** frontend, a **FastAPI** backend, and **PyTorch** model
stubs. Build the frontend and a **demo-mode** backend first (canned/keyframed outputs),
then drop real models in behind the same API — no frontend changes required.

All metrics and data in the prototype are **simulated** on a ~150-clip MVP set. Treat
them as targets/placeholders, not benchmarks.

---

## 1. Page routes
| Path         | Component       | Purpose                     |
|--------------|-----------------|-----------------------------|
| `/`          | `Overview`      | landing / value prop        |
| `/analyze`   | `VideoAnalysis` | live inference dashboard     |
| `/pose`      | `PoseViewer3D`  | 3D reconstruction           |
| `/inspector` | `ModelInspector`| architecture + metrics      |
| `/dataset`   | `DatasetEval`   | data + evaluation           |

Use React Router. One `<AppShell>` renders a persistent `<Sidebar>` + `<TopBar>` with a
`<RouteOutlet>` for the active screen. The landing page (`/`) renders without the shell.

## 2. Component list
- **App shell:** `AppShell`, `Sidebar`, `TopBar`, `RouteOutlet`
- **Landing:** `LandingHero`, `PipelineRibbon`, `BadgeRow`
- **Video analysis:** `VideoPanel`, `SkeletonOverlay`, `HandLandmarks`, `ObjectBBox`, `TrajectoryPath`, `DecisionCard`, `TransportBar`
- **Inference cards:** `ActionCard`, `IntentCard`, `TargetCard`, `RobotActionCard`
- **Timeline:** `ActionTimeline`, `TimelineSegment`, `Playhead`, `ScrubTrack`
- **3D viewer:** `PoseViewer3D`, `CameraControls`, `FrameScrubber`, `JointLegend`
- **Inspector:** `MetricGrid`, `ArchCard`, `DeploymentStatus`, `LatencyBudget`
- **Dataset:** `DatasetSourceCard`, `ClassDistribution`, `FailureCases`

## 3. State variables
| Name        | Type                    | Notes                              |
|-------------|-------------------------|------------------------------------|
| `frame`     | `number`                | current frame index `0..N`         |
| `playing`   | `boolean`               | playback transport state           |
| `route`     | `string`                | active screen (react-router)       |
| `sessionId` | `string`                | uploaded clip session id           |
| `inference` | `InferenceResult`       | per-frame backend payload          |
| `timeline`  | `Segment[]`             | action segments + confidences      |
| `camera`    | `{ az: number, el: number }` | 3D viewer orbit angles        |
| `wsStatus`  | `"online" \| "offline"` | stream socket health               |

## 4. Draggable timeline behavior
- Pointer-drag on the transport bar, the segmented action timeline, or the 3D frame
  scrubber sets `frame` directly (clamp to `0..N-1`) and pauses playback.
- The playhead, timecode, current action label, handoff confidence, future target and
  robot-action card are all **derived from `frame`** — update `frame`, everything follows.
- Implement once as a `useScrub(ref, onSeek)` hook: on pointerdown, map clientX→fraction
  against `getBoundingClientRect()`, then track pointermove/up on `window`.

## 5. Simulated pose interpolation behavior
- The prototype lerps wrist / elbow / object / forecast points between keyframes every
  frame, plus tiny sinusoidal jitter, so the skeleton "reaches → grasps → hands off →
  places" smoothly. This is a **mock** stand-in for real per-frame pose.
- In production: request `InferenceResult` per frame (or stream it) and **interpolate
  between successive frames** rather than snapping — keep the same lerp idea for smoothness
  between sparse keyframes / dropped frames.

## 6. Sample backend JSON response
`GET /api/v1/sessions/{id}/frames/{n}` → `InferenceResult`:

```json
{
  "session_id": "clp_7f3a",
  "demo_mode": true,
  "frame": 142,
  "timestamp_s": 4.73,
  "fps": 30.0,
  "latency_ms": 33,
  "action": {
    "label": "handoff",
    "confidence": 0.94,
    "scores": { "idle": 0.01, "reaching": 0.02, "grasping": 0.03, "handoff": 0.94 }
  },
  "handoff_intent": { "detected": true, "confidence": 0.94 },
  "pose_2d": {
    "body":       [[0.41, 0.32, 0.99], "...17 [x,y,score], normalized"],
    "hand_right": [[0.63, 0.45, 0.97], "...21 [x,y,score], normalized"]
  },
  "pose_3d": {
    "root":      [0.0, 0.0, 0.0],
    "joints_mm": [[-42, 110, 35], "...17 [x,y,z] in mm, root-relative"]
  },
  "object": { "label": "cup", "confidence": 0.97, "bbox": [0.61, 0.37, 0.10, 0.16] },
  "trajectory": {
    "horizon_s": 1.0,
    "history":  [[0.55, 0.46], "..."],
    "forecast": [[0.70, 0.44], "...30 steps"],
    "ade_mm": 52, "fde_mm": 96
  },
  "robot_action": {
    "command": "extend_gripper",
    "params": { "open": true, "approach": [0.62, 0.41, 0.30] },
    "priority": "high"
  }
}
```

### TypeScript type
```ts
export interface InferenceResult {
  session_id: string;
  demo_mode: boolean;
  frame: number;
  timestamp_s: number;
  fps: number;
  latency_ms: number;
  action: { label: ActionLabel; confidence: number; scores: Record<ActionLabel, number> };
  handoff_intent: { detected: boolean; confidence: number };
  pose_2d: { body: number[][]; hand_right: number[][]; hand_left?: number[][] };
  pose_3d: { root: [number, number, number]; joints_mm: number[][] };
  object: { label: string; confidence: number; bbox: [number, number, number, number] };
  trajectory: { horizon_s: number; history: number[][]; forecast: number[][]; ade_mm: number; fde_mm: number };
  robot_action: { command: string; params: Record<string, unknown>; priority: "low" | "med" | "high" };
}
export type ActionLabel = "idle" | "reaching" | "grasping" | "placing" | "pointing" | "handoff";
```

## 7. API endpoint assumptions
| Method | Path                                   | Purpose                                          |
|--------|----------------------------------------|--------------------------------------------------|
| POST   | `/api/v1/sessions`                     | upload video → `{ session_id, fps, n_frames }`   |
| GET    | `/api/v1/sessions/{id}/frames/{n}`     | inference for one frame → `InferenceResult`      |
| WS     | `/ws/v1/stream`                        | realtime: push frames, receive `InferenceResult` |
| GET    | `/api/v1/model/meta`                   | architecture, metrics, model version             |
| GET    | `/api/v1/healthz`                      | liveness + device (cpu / gpu)                    |

## 8. Asset / image-slot notes
- Hero & video frames use `<image-slot>` placeholders — swap for a `<video>` element or a
  `<canvas>` drawing decoded RGB frames in production.
- Overlays are SVG in a normalized **640×400 viewBox**; backend pose coords are normalized
  `[0,1]` — multiply by rendered size. Keep the overlay SVG and the video in the same
  positioned container (`object-fit: cover`) so they scale together.
- Skeleton = 17 COCO body joints; hands = 21 keypoints each; object = one bbox + label + score.

## 9. Animation & interaction behavior
- Draggable timeline & scrubbers set `frame` directly and pause playback (see §4).
- Pose interpolation lerps between keyframes; interpolate real frames, do not snap (see §5).
- Playback ticks a frame counter — in production bind to `<video>.currentTime` or the WS frame index.
- Predicted trajectory is a cubic path through forecast points; dashed `stroke-dashoffset` animates flow.
- Decorative only: pulse, glow, scanline; confidence bar uses a CSS width transition.

## 10. Frontend implementation notes
- React + Vite + TypeScript; React Router for the 5 routes; one `<AppShell>` with persistent `<Sidebar>` + `<TopBar>`.
- Overlay is an absolutely-positioned `<svg>` sharing the video container — keep the 640×400 viewBox and scale normalized coords to it.
- Drive playback from `<video>.currentTime` via `requestAnimationFrame`; the scrubber sets `currentTime`, then re-reads inference for that frame.
- Co-locate inference state in a `useInference(sessionId)` hook — REST per-frame now, swap to a WebSocket subscription later.
- Design tokens: bg `#070a0e`, signal blue `#4d9fff`, green `#3ddc97`, alert amber `#ff8a3d`; mono labels in JetBrains Mono, UI in Space Grotesk.

## 11. Backend implementation notes
- FastAPI: `POST /sessions` (upload + decode), `GET /sessions/{id}/frames/{n}`, `WS /stream`; a Pydantic `InferenceResult` mirrors the JSON in §6.
- Wrap each pipeline stage behind an interface and ship **demo-mode stubs** that return canned / keyframed outputs first.
- PyTorch stubs: HRNet pose · 2D→3D lifting transformer · Pose-TCN action · GRU trajectory · MLP intent — load lazily, export to ONNX.
- Decode video with OpenCV / PyAV; cache per-frame results; return normalized 2D coords plus 3D joints in mm.
- Dockerize (multi-stage) and run ONNX Runtime with a CPU fallback so demos work without a GPU.

## 12. Suggested repo layout
```
embodied-handoff-perception/
├─ frontend/                # React + Vite + TS
│  ├─ src/routes/           # Overview, VideoAnalysis, PoseViewer3D, ModelInspector, DatasetEval
│  ├─ src/components/       # see component list (§2)
│  ├─ src/hooks/            # useInference, useScrub
│  └─ src/types.ts          # InferenceResult (§6)
├─ backend/                 # FastAPI
│  ├─ app/main.py           # routes (§7)
│  ├─ app/schemas.py        # Pydantic InferenceResult
│  ├─ app/pipeline/         # pose, lifting, action, trajectory, intent (interfaces + stubs)
│  └─ app/demo/             # demo-mode keyframed responses
├─ models/                  # PyTorch stubs + ONNX exports
├─ Dockerfile
└─ README.md
```
