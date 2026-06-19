import { useEffect, useRef, useState } from "react";

// Real client-side inference: runs MediaPipe Pose + Hand landmark detection (WASM)
// in the browser on an uploaded <video>, every frame. No backend, no upload — the
// video never leaves the device, so this works on the static Vercel deploy too.
// The downstream action / handoff-intent values are honest *heuristics computed
// from the real pose* (the learned stages need trained weights); they are labelled
// as such in the UI.

const WASM_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";
const POSE_MODEL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";
const HAND_MODEL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

export type LiveStatus = "idle" | "loading" | "ready" | "error";

export interface LM {
  x: number;
  y: number;
  score: number;
}

export interface LivePoseResult {
  body: LM[]; // 33 BlazePose landmarks (normalized 0..1)
  hands: LM[][]; // up to 2 hands × 21
  videoW: number;
  videoH: number;
  action: string;
  actionConf: number;
  intentConf: number;
  intentDetected: boolean;
  fps: number;
}

// BlazePose indices
const R_SHO = 12;
const R_ELB = 14;
const R_WRI = 16;
const R_HIP = 24;

function dist(a: LM, b: LM): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function deriveActionIntent(
  body: LM[],
  prev: LM | null,
  fps: number
): { action: string; actionConf: number; intentConf: number } {
  const sho = body[R_SHO];
  const wri = body[R_WRI];
  const hip = body[R_HIP];
  if (!sho || !wri || !hip) {
    return { action: "idle", actionConf: 0.3, intentConf: 0 };
  }
  const torso = Math.max(0.05, dist(sho, hip));
  const extension = dist(wri, sho) / torso; // how far the arm reaches out
  const speed = prev ? dist(wri, prev) * fps : 0; // normalized units / sec
  const conf =
    (body[R_SHO].score + body[R_ELB].score + body[R_WRI].score) / 3;

  let action = "idle";
  if (extension < 0.7) action = "idle";
  else if (speed > 0.8) action = "reaching";
  else if (extension > 1.3) action = "handoff";
  else action = "grasping";

  const extNorm = Math.max(0, Math.min(1, (extension - 0.7) / 0.8));
  const steadiness = 1 - Math.min(1, speed) * 0.4;
  const intentConf = Math.max(0, Math.min(0.99, extNorm * steadiness));
  return { action, actionConf: Math.round(conf * 100) / 100, intentConf };
}

export function useLivePose(
  video: HTMLVideoElement | null,
  active: boolean
): { status: LiveStatus; result: LivePoseResult | null } {
  const [status, setStatus] = useState<LiveStatus>("idle");
  const [result, setResult] = useState<LivePoseResult | null>(null);
  const rafRef = useRef<number | null>(null);
  const prevWrist = useRef<LM | null>(null);
  const lastTime = useRef<number>(-1);
  const fpsEma = useRef<number>(30);
  const lastTs = useRef<number>(0);

  useEffect(() => {
    if (!active || !video) {
      setStatus("idle");
      return;
    }
    let cancelled = false;
    let pose: any = null;
    let hands: any = null;

    (async () => {
      setStatus("loading");
      try {
        const vision = await import("@mediapipe/tasks-vision");
        const resolver = await vision.FilesetResolver.forVisionTasks(WASM_URL);
        pose = await vision.PoseLandmarker.createFromOptions(resolver, {
          baseOptions: { modelAssetPath: POSE_MODEL, delegate: "GPU" },
          runningMode: "VIDEO",
          numPoses: 1,
        });
        hands = await vision.HandLandmarker.createFromOptions(resolver, {
          baseOptions: { modelAssetPath: HAND_MODEL, delegate: "GPU" },
          runningMode: "VIDEO",
          numHands: 2,
        });
        if (cancelled) {
          pose?.close();
          hands?.close();
          return;
        }
        setStatus("ready");
        loop();
      } catch (e) {
        if (!cancelled) setStatus("error");
      }
    })();

    function loop() {
      if (cancelled || !video) return;
      rafRef.current = requestAnimationFrame(loop);
      // only run detection on a fresh video frame
      if (video.readyState < 2 || video.currentTime === lastTime.current) return;
      lastTime.current = video.currentTime;

      const now = performance.now();
      const dt = now - lastTs.current;
      if (dt > 0 && dt < 1000) fpsEma.current = fpsEma.current * 0.8 + (1000 / dt) * 0.2;
      lastTs.current = now;

      try {
        const pr = pose.detectForVideo(video, now);
        const hr = hands.detectForVideo(video, now);
        const lms = pr.landmarks?.[0];
        if (!lms) return;
        const body: LM[] = lms.map((l: any) => ({
          x: l.x,
          y: l.y,
          score: l.visibility ?? 1,
        }));
        const handArr: LM[][] = (hr.landmarks ?? []).map((h: any) =>
          h.map((l: any) => ({ x: l.x, y: l.y, score: 1 }))
        );
        const di = deriveActionIntent(body, prevWrist.current, fpsEma.current);
        prevWrist.current = body[R_WRI] ?? null;
        setResult({
          body,
          hands: handArr,
          videoW: video.videoWidth || 1280,
          videoH: video.videoHeight || 720,
          action: di.action,
          actionConf: di.actionConf,
          intentConf: di.intentConf,
          intentDetected: di.intentConf >= 0.7,
          fps: Math.round(fpsEma.current),
        });
      } catch {
        /* transient detector error — skip this frame */
      }
    }

    return () => {
      cancelled = true;
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      prevWrist.current = null;
      lastTime.current = -1;
      try {
        pose?.close();
        hands?.close();
      } catch {
        /* ignore */
      }
    };
  }, [video, active]);

  return { status, result };
}
