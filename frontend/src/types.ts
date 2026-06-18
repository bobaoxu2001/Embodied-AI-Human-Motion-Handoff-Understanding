// Mirrors the InferenceResult contract in the Claude Design handoff (HANDOFF.md §6).
// The FastAPI backend returns this exact shape from /api/analysis/{id}.

export type ActionLabel =
  | "idle"
  | "reaching"
  | "grasping"
  | "placing"
  | "pointing"
  | "handoff";

export interface InferenceResult {
  session_id: string;
  demo_mode: boolean;
  frame: number;
  timestamp_s: number;
  fps: number;
  latency_ms: number;
  action: {
    label: ActionLabel;
    confidence: number;
    scores: Partial<Record<ActionLabel, number>>;
  };
  handoff_intent: { detected: boolean; confidence: number };
  pose_2d: { body: number[][]; hand_right: number[][]; hand_left?: number[][] };
  pose_3d: { root: [number, number, number]; joints_mm: number[][] };
  object: { label: string; confidence: number; bbox: [number, number, number, number] };
  trajectory: {
    horizon_s: number;
    history: number[][];
    forecast: number[][];
    ade_mm: number;
    fde_mm: number;
  };
  robot_action: {
    command: string;
    params: Record<string, unknown>;
    priority: "low" | "med" | "high";
  };
}

export interface Segment {
  key: string;
  label: string;
  start: number;
  end: number;
  conf: number;
  color: string;
  bg: string;
}

export interface AnalysisMeta {
  analysis_id: string;
  demo_mode: boolean;
  source: string;
  fps: number;
  n_frames: number;
  duration_s: number;
  device: string;
}

export interface AnalysisResponse {
  meta: AnalysisMeta;
  segments: Segment[];
  // The backend streams per-frame results; the demo returns a sparse set of
  // keyframes the client interpolates between (HANDOFF.md §5).
  sample_frame?: InferenceResult;
}
