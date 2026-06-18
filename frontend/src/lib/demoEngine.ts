// Per-frame demo derivation. This is a faithful TypeScript port of the
// `renderVals()` logic in the Claude Design prototype, so the React app reaches
// pixel-for-pixel parity with the handoff: wrist/elbow/object/forecast points
// lerp between sparse keyframes each frame (+ tiny sinusoidal jitter) and every
// derived label/confidence follows the current `frame` (HANDOFF.md §4–§5).

import { FPS, getScenario, TOTAL_FRAMES, WRIST_KF } from "../data/demo";
import type { ActionLabel } from "../types";

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

type KF = { f: number; x: number; y: number };

function interpKF(kf: KF[], ff: number): { x: number; y: number } {
  if (ff <= kf[0].f) return { x: kf[0].x, y: kf[0].y };
  for (let i = 0; i < kf.length - 1; i++) {
    if (ff >= kf[i].f && ff <= kf[i + 1].f) {
      const t = (ff - kf[i].f) / (kf[i + 1].f - kf[i].f);
      return { x: lerp(kf[i].x, kf[i + 1].x, t), y: lerp(kf[i].y, kf[i + 1].y, t) };
    }
  }
  return { x: kf[kf.length - 1].x, y: kf[kf.length - 1].y };
}

const pad = (n: number) => String(n).padStart(4, "0");
const r1 = (n: number) => n.toFixed(1);

export interface Derived {
  frame: number;
  timecode: string;
  frameLabel: string;
  framePct: number;
  segmentKey: string;
  actionLabel: string;
  actionLabelLower: ActionLabel;
  actionColor: string;
  actionConf: string;
  handoffConf: number;
  handoffConfPct: number;
  handoffConfStr: string;
  intentDetected: boolean;
  intentStatus: string;
  intentStatusColor: string;
  robotAction: string;
  robotActionSub: string;
  futureTarget: string;
  activeChips: Record<string, boolean>;
  chipColor: string;
  objectLabel: string;
  scenarioId: string;
  scenarioNote: string;
  pose: {
    rwrist: { x: number; y: number };
    relbow: { x: number; y: number };
    obj: { x: number; y: number };
    future: { x: number; y: number };
    traj: string;
    bodyT: string;
  };
}

export function derive(frameInput: number, scenarioId = "success"): Derived {
  const f = Math.max(0, Math.min(TOTAL_FRAMES - 1, Math.round(frameInput)));

  const scenario = getScenario(scenarioId);
  const { segments, handoffBase, robotMap } = scenario;
  const cur = segments.find((d) => f >= d.start && f < d.end) || segments[0];
  const curLabelKey = cur.key === "idle2" ? "idle" : cur.key;

  const secs = f / FPS;
  const timecode =
    "00:" +
    String(Math.floor(secs)).padStart(2, "0") +
    "." +
    String(Math.floor((secs % 1) * 10));

  // handoff intent confidence: smooth, peaks during handoff
  const base = handoffBase[cur.key];
  const noise = Math.sin(f / 5) * 0.018;
  const hc = Math.max(0, Math.min(0.99, base + noise));
  const hi = hc >= 0.8;

  const [robotAction, robotActionSub] = robotMap[cur.key];

  // chip active states
  const activeChips: Record<string, boolean> = {};
  (["idle", "reaching", "grasping", "handoff", "placing"] as const).forEach((k) => {
    activeChips[k] = cur.key === k || (k === "idle" && cur.key === "idle2");
  });

  // ---- simulated per-frame pose interpolation ----
  const w0 = interpKF(WRIST_KF, f);
  const wx = w0.x + Math.sin(f / 4) * 1.2;
  const wy = w0.y + Math.cos(f / 3) * 1.0;
  const emx = (288 + wx) / 2;
  const emy = (134 + wy) / 2;
  const elbx = emx - 6;
  const elby = emy + 14;
  const objp = f < 116 ? { x: 396, y: 150 } : { x: wx - 8, y: wy - 30 };
  const fut = interpKF(WRIST_KF, Math.min(319, f + 34));
  const fxp = fut.x;
  const fyp = fut.y;
  const c1x = wx + (fxp - wx) * 0.4;
  const c1y = wy - 34;
  const c2x = wx + (fxp - wx) * 0.72;
  const c2y = fyp - 8;

  const futureTarget =
    "x " +
    (0.15 + (fxp / 640) * 0.95).toFixed(2) +
    " · y " +
    (0.1 + ((400 - fyp) / 400) * 0.7).toFixed(2) +
    " · z 0.30 m";

  return {
    frame: f,
    timecode,
    frameLabel: "frame " + pad(f) + "/0320",
    framePct: (f / TOTAL_FRAMES) * 100,
    segmentKey: cur.key,
    actionLabel: cur.label,
    actionLabelLower: curLabelKey as ActionLabel,
    actionColor: cur.color,
    actionConf: cur.conf.toFixed(2),
    handoffConf: hc,
    handoffConfPct: Math.round(hc * 100),
    handoffConfStr: hc.toFixed(2),
    intentDetected: hi,
    intentStatus: hi ? "INTENT DETECTED" : "monitoring",
    intentStatusColor: hi ? "#3ddc97" : "#5c6675",
    robotAction,
    robotActionSub,
    futureTarget,
    activeChips,
    chipColor: cur.color,
    objectLabel: scenario.object,
    scenarioId: scenario.id,
    scenarioNote: scenario.note,
    pose: {
      rwrist: { x: Number(r1(wx)), y: Number(r1(wy)) },
      relbow: { x: Number(r1(elbx)), y: Number(r1(elby)) },
      obj: { x: Number(r1(objp.x)), y: Number(r1(objp.y)) },
      future: { x: Number(r1(fxp)), y: Number(r1(fyp)) },
      traj:
        "M" +
        r1(wx) +
        " " +
        r1(wy) +
        " C " +
        r1(c1x) +
        " " +
        r1(c1y) +
        ", " +
        r1(c2x) +
        " " +
        r1(c2y) +
        ", " +
        r1(fxp) +
        " " +
        r1(fyp),
      bodyT: "translate(0 " + (Math.sin(f / 7) * 1.5).toFixed(2) + ")",
    },
  };
}
