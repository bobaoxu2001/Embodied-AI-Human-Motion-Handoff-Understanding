// Static demo content transcribed verbatim from the Claude Design prototype
// (Embodied Handoff Perception.dc.html). Every number here is *simulated* on a
// ~150-clip MVP set — targets/placeholders, not production benchmarks.

import type { Segment } from "../types";

export const TOTAL_FRAMES = 320;
export const FPS = 30;

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
