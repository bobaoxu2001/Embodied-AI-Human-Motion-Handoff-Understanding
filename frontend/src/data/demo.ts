// Static demo content transcribed verbatim from the Claude Design prototype
// (Embodied Handoff Perception.dc.html). Every number here is *simulated* on a
// ~150-clip MVP set — targets/placeholders, not production benchmarks.

import type { Segment } from "../types";

export const TOTAL_FRAMES = 320;
export const FPS = 30;

// Single source of truth for the dataset-scale numbers shown across the UI.
// When the dataset grows or a public set is swapped in, update these here (and
// the matching prose in docs/) so the homepage / inspector / dataset pages stay
// consistent and honest. `mode` flips the on-screen qualifier.
export const DATASET_STATS = {
  clips: 150,
  segments: 566,
  mode: "demo" as "demo" | "production",
  qualifier: "simulated metrics on a ~150-clip MVP set — not production benchmarks",
};

export const SEGMENTS: Segment[] = [
  { key: "idle", label: "Idle", start: 0, end: 46, conf: 0.99, color: "#8893a3", bg: "#11151c" },
  { key: "reaching", label: "Reaching", start: 46, end: 120, conf: 0.91, color: "#4d9fff", bg: "#0e1826" },
  { key: "grasping", label: "Grasping", start: 120, end: 164, conf: 0.88, color: "#9b7cff", bg: "#14112a" },
  { key: "handoff", label: "Handoff", start: 164, end: 232, conf: 0.94, color: "#3ddc97", bg: "#0c1812" },
  { key: "placing", label: "Placing", start: 232, end: 280, conf: 0.86, color: "#ff8a3d", bg: "#1a1208" },
  { key: "idle2", label: "Idle", start: 280, end: 320, conf: 0.98, color: "#8893a3", bg: "#11151c" },
];

// Sparse wrist keyframes; the engine lerps between them every frame (HANDOFF §5).
export const WRIST_KF = [
  { f: 0, x: 316, y: 206 },
  { f: 46, x: 330, y: 202 },
  { f: 120, x: 404, y: 182 },
  { f: 164, x: 404, y: 182 },
  { f: 232, x: 520, y: 198 },
  { f: 280, x: 470, y: 250 },
  { f: 319, x: 322, y: 208 },
];

export const HANDOFF_BASE: Record<string, number> = {
  idle: 0.08,
  reaching: 0.55,
  grasping: 0.72,
  handoff: 0.94,
  placing: 0.21,
  idle2: 0.05,
};

export const ROBOT_MAP: Record<string, [string, string]> = {
  idle: ["Hold position", "standby · gripper closed"],
  reaching: ["Pre-position gripper", "align to predicted target"],
  grasping: ["Track object pose", "maintain approach vector"],
  handoff: ["Extend gripper · open", "compliance mode · ready"],
  placing: ["Retract · standby", "clear workspace"],
  idle2: ["Hold position", "standby · gripper closed"],
};

// ---- Scenarios (#3): same motion, different semantics / decisions ----
// The wrist keyframes (motion) are shared; each scenario varies segment
// confidences, the handoff-intent curve, the emitted robot action, the object,
// and a status note — so the UI shows recognition + decision under harder cases.

export interface Scenario {
  id: string;
  label: string;
  desc: string;
  badge: string;
  badgeColor: string;
  object: string;
  note: string;
  segments: Segment[];
  handoffBase: Record<string, number>;
  robotMap: Record<string, [string, string]>;
}

function segs(overrides: Record<string, Partial<Segment>>): Segment[] {
  return SEGMENTS.map((s) => ({ ...s, ...(overrides[s.key] || {}) }));
}

export const SCENARIOS: Scenario[] = [
  {
    id: "success",
    label: "Successful handoff",
    desc: "clean reach → grasp → handoff; intent fires, robot extends gripper",
    badge: "nominal",
    badgeColor: "#3ddc97",
    object: "cup",
    note: "",
    segments: SEGMENTS,
    handoffBase: HANDOFF_BASE,
    robotMap: ROBOT_MAP,
  },
  {
    id: "failed",
    label: "Failed handoff",
    desc: "object not released; intent never confidently fires, robot aborts",
    badge: "aborted",
    badgeColor: "#ff5a4d",
    object: "cup",
    note: "handoff aborted — object not released; robot holds then retracts",
    segments: segs({
      grasping: { conf: 0.7 },
      handoff: { label: "Handoff?", conf: 0.61, color: "#ff8a3d", bg: "#1a1208" },
      placing: { label: "Retract", conf: 0.74, color: "#ff5a4d", bg: "#1a0e0e" },
    }),
    handoffBase: {
      idle: 0.08, reaching: 0.5, grasping: 0.66, handoff: 0.62, placing: 0.18, idle2: 0.05,
    },
    robotMap: {
      ...ROBOT_MAP,
      handoff: ["Hold · re-evaluate", "object not released · abort"],
      placing: ["Retract · standby", "handoff aborted"],
    },
  },
  {
    id: "two_person",
    label: "Two-person scene",
    desc: "association ambiguity / id-switch risk; intent confidence reduced",
    badge: "ambiguous",
    badgeColor: "#ffd24d",
    object: "cup",
    note: "2 people detected — association ambiguity / id-switch risk; verify target",
    segments: segs({
      reaching: { conf: 0.82 },
      grasping: { conf: 0.8 },
      handoff: { conf: 0.79 },
    }),
    handoffBase: {
      idle: 0.08, reaching: 0.52, grasping: 0.7, handoff: 0.83, placing: 0.2, idle2: 0.05,
    },
    robotMap: {
      ...ROBOT_MAP,
      handoff: ["Extend gripper · open", "verify target identity first"],
    },
  },
  {
    id: "distractor",
    label: "Distractor object",
    desc: "second object in scene; target disambiguated by grasp",
    badge: "disambiguated",
    badgeColor: "#4d9fff",
    object: "cup (+1 distractor)",
    note: "distractor object present — intent dips at grasp, target resolved",
    segments: segs({
      reaching: { conf: 0.8 },
      grasping: { conf: 0.74, color: "#ffd24d", bg: "#1a1608" },
    }),
    handoffBase: {
      idle: 0.08, reaching: 0.42, grasping: 0.5, handoff: 0.9, placing: 0.2, idle2: 0.05,
    },
    robotMap: {
      ...ROBOT_MAP,
      grasping: ["Track object pose", "disambiguate target · 2 objects"],
    },
  },
];

export function getScenario(id: string): Scenario {
  return SCENARIOS.find((s) => s.id === id) ?? SCENARIOS[0];
}

export const METRICS = [
  { label: "throughput", value: "30.0", unit: "/s", sub: "gpu · demo-mode", color: "#e8ecf2" },
  { label: "latency", value: "33", unit: "ms", sub: "p50 · 48 p95", color: "#e8ecf2" },
  { label: "model size", value: "41", unit: "MB", sub: "onnx · int8", color: "#e8ecf2" },
  { label: "traj error", value: "52", unit: "mm", sub: "ade · 96 fde", color: "#e8ecf2" },
  { label: "intent acc", value: "89.2", unit: "%", sub: "demo split · sim", color: "#3ddc97" },
  { label: "action top-1", value: "84.5", unit: "%", sub: "6 classes · sim", color: "#4d9fff" },
];

export const ARCH_CARDS = [
  { n: "01", title: "Pose extraction", model: "HRNet-W32 + hand detector", io: "rgb frame → 17 body + 42 hand kpts", tag: "2D", accent: "#4d9fff", border: "#1c2c44", bg: "#0a111c" },
  { n: "02", title: "2D→3D lifting", model: "Temporal lifting transformer", io: "2D seq → 3D joints (root-rel)", tag: "2D→3D", accent: "#4d9fff", border: "#1c2c44", bg: "#0a111c" },
  { n: "03", title: "Action recognition", model: "Pose-TCN · causal", io: "3D pose window → 6 actions", tag: "temporal", accent: "#9b7cff", border: "#2a2348", bg: "#0e0b1a" },
  { n: "04", title: "Trajectory forecast", model: "Seq2seq GRU decoder", io: "wrist history → 1.0s future path", tag: "forecast", accent: "#3ddc97", border: "#1c4533", bg: "#0a140e" },
  { n: "05", title: "Handoff intent", model: "Fusion MLP head", io: "pose+motion feats → intent + conf", tag: "decision", accent: "#3ddc97", border: "#1c4533", bg: "#0a140e" },
];

export const DEPLOY = [
  { label: "FastAPI", sub: "REST + WebSocket stream", status: "online", color: "#3ddc97" },
  { label: "Docker", sub: "multi-stage · 380 MB image", status: "built", color: "#4d9fff" },
  { label: "ONNX Runtime", sub: "graph-optimized · int8", status: "online", color: "#3ddc97" },
  { label: "CPU / GPU inference", sub: "cuda 12 · cpu fallback", status: "gpu active", color: "#3ddc97" },
];

export const LATENCY = [
  { label: "Pose extraction", ms: "13.2", pct: 40, color: "#4d9fff" },
  { label: "2D→3D lifting", ms: "6.1", pct: 18, color: "#4d9fff" },
  { label: "Action recognition", ms: "5.4", pct: 16, color: "#9b7cff" },
  { label: "Trajectory forecast", ms: "4.9", pct: 15, color: "#3ddc97" },
  { label: "Intent classifier", ms: "3.4", pct: 11, color: "#3ddc97" },
];

export const DATASET_SOURCES = [
  { title: "Self-recorded handoffs", sub: "controlled lab · 3 cameras · MVP set", clips: "150 clips", tag: "primary", glyph: "REC", accent: "#3ddc97", border: "#1c4533", iconBg: "#0c1812" },
  { title: "HOI4D-inspired HOI", sub: "human-object interaction priors", clips: "pretrain subset", tag: "inspired by", accent: "#4d9fff", border: "#1c2c44", iconBg: "#0e1826", glyph: "HOI" },
  { title: "H3WB / Human3.6M", sub: "2D→3D pose lifting supervision", clips: "optional benchmark", tag: "benchmark", accent: "#9b7cff", border: "#2a2348", iconBg: "#14112a", glyph: "3D" },
  { title: "Ego4D-inspired egocentric", sub: "first-person video understanding", clips: "planned extension", tag: "planned", accent: "#ff8a3d", border: "#3a2a14", iconBg: "#1a1208", glyph: "EGO" },
];

// Public-dataset route (no self-recording). Status labels are honest: every set
// requires manual download under its own license; nothing is redistributed.
export const PUBLIC_DATASETS = [
  { name: "HOH / H2O", role: "handover benchmark (positive handoff intent)", accent: "#3ddc97",
    tags: ["requires manual download", "registration / EULA", "not redistributed"] },
  { name: "HOT3D / HOT3D-Clips", role: "egocentric hand-object 3D (recommended)", accent: "#3ddc97",
    tags: ["requires manual download", "Meta license", "subset OK (1 seq / few clips)", "not redistributed"] },
  { name: "HOI4D / DexYCB", role: "hand-object interaction (pretrain / features)", accent: "#9b7cff",
    tags: ["requires manual download", "registration / EULA", "metadata-only integration", "not redistributed"] },
  { name: "H3WB / Human3.6M", role: "2D→3D pose lifting", accent: "#4d9fff",
    tags: ["requires manual download", "registration / EULA", "not redistributed"] },
  { name: "InterHand2.6M", role: "hand-pose pretraining", accent: "#4d9fff",
    tags: ["requires manual download", "CC BY-NC", "not redistributed"] },
  { name: "EPIC-KITCHENS / Sth-Sth V2", role: "action recognition fallback", accent: "#ff8a3d",
    tags: ["requires manual download", "CC BY-NC / academic", "not redistributed"] },
];

export const CAPTURE_PROTOCOL = [
  { k: "Cameras", v: "2–3 units · time-synced · 1280×720 @ 30fps · calibrated intrinsics+extrinsics" },
  { k: "Geometry", v: "front + 45° oblique (+ optional side) · subject ~2.0 m · height ~1.1 m" },
  { k: "Lighting", v: "diffuse ~600 lux · one low-light session for the robustness slice" },
  { k: "Diversity", v: "≥4 subjects · both hands · 4 objects (cup/bottle/tool/box) · 2 distances" },
  { k: "3D labels", v: "multi-view triangulation (no manual 3D) · or Human3.6M / H3WB" },
  { k: "Consent", v: "informed consent per subject · face-blur on request" },
];

export const SPLIT_INFO = [
  { label: "train", pct: 70, color: "#4d9fff", note: "≈105 clips" },
  { label: "val", pct: 15, color: "#9b7cff", note: "≈22 clips" },
  { label: "test", pct: 15, color: "#3ddc97", note: "≈23 clips · holds hard cases" },
];

export const CLASS_DIST = [
  { label: "idle", count: 88, color: "#5c6675" },
  { label: "reaching", count: 142, color: "#4d9fff" },
  { label: "grasping", count: 96, color: "#9b7cff" },
  { label: "placing", count: 74, color: "#ff8a3d" },
  { label: "pointing", count: 38, color: "#ffd24d" },
  { label: "handoff", count: 128, color: "#3ddc97" },
];

export const FAILURE_CASES = [
  { title: "Occlusion", note: "object / self-occlusion drops hand kpts", rate: "−8.2% recall", sevColor: "#ff5a4d" },
  { title: "Fast hand motion", note: "motion blur beyond 0.4 px/ms", rate: "+12mm FDE", sevColor: "#ff8a3d" },
  { title: "Poor lighting", note: "low-light sensor noise", rate: "−6.1% recall", sevColor: "#ff8a3d" },
  { title: "Multiple people", note: "association ambiguity · id switches", rate: "high", sevColor: "#ff5a4d" },
  { title: "Unusual camera angles", note: "top-down / extreme oblique", rate: "low", sevColor: "#3ddc97" },
];

// ---- Implementation handoff page content ----
export const COMPONENT_GROUPS = [
  { group: "App shell", items: ["AppShell", "Sidebar", "TopBar", "RouteOutlet"] },
  { group: "Landing", items: ["LandingHero", "PipelineRibbon", "BadgeRow"] },
  { group: "Video analysis", items: ["VideoPanel", "SkeletonOverlay", "HandLandmarks", "ObjectBBox", "TrajectoryPath", "DecisionCard", "TransportBar"] },
  { group: "Inference cards", items: ["ActionCard", "IntentCard", "TargetCard", "RobotActionCard"] },
  { group: "Timeline", items: ["ActionTimeline", "TimelineSegment", "Playhead", "ScrubTrack"] },
  { group: "3D viewer", items: ["PoseViewer3D", "CameraControls", "FrameScrubber", "JointLegend"] },
  { group: "Inspector", items: ["MetricGrid", "ArchCard", "DeploymentStatus", "LatencyBudget"] },
  { group: "Dataset", items: ["DatasetSourceCard", "ClassDistribution", "FailureCases"] },
];

export const ROUTES_INFO = [
  { path: "/", comp: "Overview", note: "landing / value prop" },
  { path: "/analyze", comp: "VideoAnalysis", note: "live inference dashboard" },
  { path: "/pose", comp: "PoseViewer3D", note: "3D reconstruction" },
  { path: "/inspector", comp: "ModelInspector", note: "architecture + metrics" },
  { path: "/dataset", comp: "DatasetEval", note: "data + evaluation" },
];

export const STATE_VARS = [
  { name: "frame", type: "number", note: "current frame index 0..N" },
  { name: "playing", type: "boolean", note: "playback transport state" },
  { name: "route", type: "string", note: "active screen (react-router)" },
  { name: "sessionId", type: "string", note: "uploaded clip session id" },
  { name: "inference", type: "InferenceResult", note: "per-frame backend payload" },
  { name: "timeline", type: "Segment[]", note: "action segments + confidences" },
  { name: "camera", type: "{ az, el }", note: "3D viewer orbit angles" },
  { name: "wsStatus", type: '"online" | "offline"', note: "stream socket health" },
];

export const ENDPOINTS = [
  { m: "POST", mColor: "#4d9fff", path: "/api/analyze-video", note: "upload video → { analysis_id, fps, n_frames }" },
  { m: "GET", mColor: "#3ddc97", path: "/api/analysis/{id}", note: "full analysis + per-frame InferenceResult" },
  { m: "GET", mColor: "#3ddc97", path: "/api/analysis/{id}/frames/{n}", note: "inference for one frame → InferenceResult" },
  { m: "GET", mColor: "#3ddc97", path: "/api/model/meta", note: "architecture, metrics, model version" },
  { m: "GET", mColor: "#3ddc97", path: "/api/health", note: "liveness + device (cpu / gpu)" },
];

export const ASSET_NOTES = [
  "Hero & video frames use a <video>/<canvas> slot in production; the demo draws a procedural lab background behind the overlay.",
  "Overlays are SVG in a normalized 640×400 viewBox; backend pose coords are normalized [0,1] — multiply by the rendered size.",
  "Skeleton = 17 COCO body joints; hands = 21 keypoints each; object = one bbox + label + score.",
  "Keep the overlay SVG and the video in the same positioned container so they scale together (object-fit: cover).",
];

export const ANIM_NOTES = [
  "Draggable timeline & scrubbers: pointer-drag sets the frame directly and pauses playback; everything derives from frame.",
  "Simulated pose interpolation: wrist / elbow / object / forecast lerp between keyframes every frame (mock) — swap for real per-frame backend pose.",
  "Playback ticks a frame counter; in production bind it to <video>.currentTime (or the WS frame index) instead of a timer.",
  "Predicted trajectory is a cubic path through forecast points; dashed stroke-dashoffset animates the flow.",
  "Decorative only — pulse, glow, scanline; the confidence bar uses a CSS width transition.",
];

export const FRONTEND_NOTES = [
  "React + Vite + TypeScript; React Router for the 5 routes; one <AppShell> with persistent <Sidebar> + <TopBar>.",
  "Overlay is an absolutely-positioned <svg> sharing the video container — keep the 640×400 viewBox and scale normalized coords to it.",
  "Drive playback from a frame ticker; the scrubber sets the frame via useScrub, then derives inference for that frame.",
  "Co-locate inference state in a useInference(analysisId) hook — REST per-frame now, swap to a WebSocket subscription later.",
  "Tokens: bg #070a0e, signal blue #4d9fff, green #3ddc97, alert amber #ff8a3d; mono labels in JetBrains Mono.",
];

export const BACKEND_NOTES = [
  "FastAPI: POST /analyze-video (upload + decode), GET /analysis/{id}, GET /analysis/{id}/frames/{n}; a Pydantic InferenceResult mirrors the JSON at left.",
  "Wrap each pipeline stage behind an interface and ship demo-mode stubs that return canned / keyframed outputs first.",
  "PyTorch stubs: HRNet pose · lifting transformer · Pose-TCN action · GRU trajectory · MLP intent — load lazily, export to ONNX.",
  "Decode video with OpenCV; MediaPipe keypoints when installed, graceful fallback otherwise; cache per-frame results.",
  "Dockerize and run ONNX Runtime with a CPU fallback so demos work without a GPU.",
];

// ---- Model card (mirrors docs/MODEL_CARD.md and GET /api/model/card) ----
export const REPO_URL =
  "https://github.com/bobaoxu2001/Embodied-AI-Human-Motion-Handoff-Understanding";

export interface CardModel {
  stage: string;
  name: string;
  type: string;
  input: string;
  output: string;
  params: string;
  config: string;
  loss: string;
  metric: string;
  accent: string;
  border: string;
  bg: string;
}

export const MODEL_CARD = {
  task: "Human→robot handoff perception for HRI: RGB video → per-frame 3D pose, action, hand-trajectory forecast, and a binary handoff-intent decision — emitted as one contract-stable InferenceResult per frame.",
  license: "MIT",
  repo: REPO_URL,
  doc: "docs/MODEL_CARD.md",
  intendedUse: [
    "Research / portfolio demo of a real-time HRI handoff-perception pipeline.",
    "Reference for shipping a contract-stable perception service (demo → real models).",
  ],
  outOfScope: [
    "Safety-critical robot control without a human supervisor + independent safety layer.",
    "Surveillance, identification, or biometric profiling of individuals.",
    "Deployment outside the captured distribution without re-training.",
  ],
  data: [
    "~150 self-recorded handoff clips · controlled lab · 2–3 cameras · 1280×720 @ 30fps.",
    "Lifting supervision: multi-view triangulation and/or Human3.6M / H3WB.",
    "Optional HOI4D-inspired priors; planned Ego4D-style egocentric extension.",
    "Self-recorded with informed consent; public datasets under their own licenses.",
  ],
  training: [
    { k: "Optimizer", v: "AdamW · lr 1e-3 (cosine) · wd 1e-4" },
    { k: "Batch / epochs", v: "64 · 60 (early-stop on val)" },
    { k: "Window", v: "27 frames @ 30fps (lifting / action)" },
    { k: "Augmentation", v: "h-flip · keypoint jitter · temporal crop" },
    { k: "Split", v: "by subject (avoid identity leakage)" },
    { k: "Export", v: "ONNX opset 17 · optional int8" },
  ],
  models: [
    {
      stage: "02",
      name: "PoseLiftingNet",
      type: "Temporal Transformer encoder (centre-frame regression)",
      input: "[B, 27, 34] 2D keypoint window",
      output: "[B, 51] root-relative 3D joints (mm)",
      params: "~3.2M",
      config: "d_model=256 · heads=8 · layers=4 · GELU",
      loss: "MPJPE",
      metric: "MPJPE (mm) ↓",
      accent: "#4d9fff",
      border: "#1c2c44",
      bg: "#0a111c",
    },
    {
      stage: "03",
      name: "ActionTCN",
      type: "Causal dilated Temporal Conv Net (streaming)",
      input: "[B, T, 51] pose features",
      output: "[B, 6] action logits",
      params: "~0.6M",
      config: "ch=128 · dilations (1,2,4,8) · causal",
      loss: "class-weighted cross-entropy",
      metric: "top-1 84.5% · per-class recall",
      accent: "#9b7cff",
      border: "#2a2348",
      bg: "#0e0b1a",
    },
    {
      stage: "04",
      name: "TrajectoryGRU",
      type: "Seq2seq GRU (autoregressive decoder)",
      input: "[B, T_in, 2] wrist history",
      output: "[B, 30, 2] 1.0s future path",
      params: "~0.15M",
      config: "hidden=128 · 30-step roll-out",
      loss: "ADE + FDE",
      metric: "ADE 52mm · FDE 96mm",
      accent: "#3ddc97",
      border: "#1c4533",
      bg: "#0a140e",
    },
    {
      stage: "05",
      name: "IntentMLP",
      type: "Fusion MLP classification head",
      input: "[B, ~160] pose+motion+action feats",
      output: "[B] logit → P(handoff)",
      params: "~30K",
      config: "160→128→64→1 · ReLU · dropout 0.2 · thr 0.80",
      loss: "binary cross-entropy",
      metric: "intent acc 89.2% · P/R/F1",
      accent: "#3ddc97",
      border: "#1c4533",
      bg: "#0a140e",
    },
  ] as CardModel[],
  limitations: [
    { mode: "Occlusion (object/self)", effect: "drops hand keypoints (≈ −8% recall)" },
    { mode: "Fast hand motion / blur", effect: "larger final-step error (+~12mm FDE)" },
    { mode: "Poor lighting", effect: "sensor noise, lower recall (≈ −6%)" },
    { mode: "Multiple people", effect: "association ambiguity / id-switches" },
    { mode: "Unusual camera angles", effect: "top-down / oblique degrade lifting" },
    { mode: "Distractor objects", effect: "intent confidence drops; target ambiguity" },
  ],
};

export const STACK = [
  { k: "Frontend", v: "React + Vite + TypeScript", color: "#4d9fff" },
  { k: "Backend", v: "FastAPI + Pydantic", color: "#3ddc97" },
  { k: "ML", v: "PyTorch → ONNX (stubs)", color: "#9b7cff" },
  { k: "Mode", v: "demo-mode inference first", color: "#ff8a3d" },
];

export const JSON_SAMPLE = `{
  "session_id": "clp_7f3a",
  "demo_mode": true,
  "frame": 142,
  "timestamp_s": 4.73,
  "fps": 30.0,
  "latency_ms": 33,
  "action": {
    "label": "handoff",
    "confidence": 0.94,
    "scores": { "idle": 0.01, "reaching": 0.02,
                "grasping": 0.03, "handoff": 0.94 }
  },
  "handoff_intent": { "detected": true, "confidence": 0.94 },
  "pose_2d": {
    "body":       [[0.41, 0.32, 0.99], "...17 [x,y,score]"],
    "hand_right": [[0.63, 0.45, 0.97], "...21 [x,y,score]"]
  },
  "pose_3d": {
    "root":      [0.0, 0.0, 0.0],
    "joints_mm": [[-42, 110, 35], "...17 [x,y,z]"]
  },
  "object": { "label": "cup", "confidence": 0.97,
              "bbox": [0.61, 0.37, 0.10, 0.16] },
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
}`;
