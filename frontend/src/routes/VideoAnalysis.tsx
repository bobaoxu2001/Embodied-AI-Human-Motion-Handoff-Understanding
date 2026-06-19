import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { usePlayback } from "../state/playback";
import { derive } from "../lib/demoEngine";
import { ROBOT_MAP, SCENARIOS, TOTAL_FRAMES, getScenario } from "../data/demo";
import { SkeletonOverlay } from "../components/SkeletonOverlay";
import { LivePoseOverlay } from "../components/LivePoseOverlay";
import { LabBackground } from "../components/LabBackground";
import { ScrubBar } from "../components/ScrubBar";
import { PlayButton } from "../components/PlayButton";
import { useScrub } from "../hooks/useScrub";
import { useStream } from "../hooks/useStream";
import { useLivePose } from "../hooks/useLivePose";
import { api } from "../lib/api";

const ACT_COLOR: Record<string, string> = {
  idle: "#8893a3",
  reaching: "#4d9fff",
  grasping: "#9b7cff",
  handoff: "#3ddc97",
  placing: "#ff8a3d",
  pointing: "#ffd24d",
};
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

type UploadState = "demo" | "analyzing" | "analyzed" | "fallback";

const CHIP_KEYS = ["idle", "reaching", "grasping", "handoff", "placing"] as const;
const CHIP_LABEL: Record<string, string> = {
  idle: "idle",
  reaching: "reach",
  grasping: "grasp",
  handoff: "handoff",
  placing: "place",
};

export function VideoAnalysis() {
  const { frame, seekTo } = usePlayback();
  const [scenario, setScenario] = useState("success");
  const d = derive(frame, scenario);
  const segments = getScenario(scenario).segments;
  const stream = useStream();

  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState("handoff_clip_07.mp4");
  const [state, setState] = useState<UploadState>("demo");
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const location = useLocation();

  // Real client-side inference (MediaPipe, browser) runs on an uploaded video.
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);
  const live = useLivePose(videoEl, !!videoUrl);
  const lr = live.result;
  const realActive = !!videoUrl && live.status === "ready" && !!lr;

  // Opened from the homepage "Upload & analyze" CTA → pop the file picker.
  useEffect(() => {
    if ((location.state as { openUpload?: boolean } | null)?.openUpload) {
      inputRef.current?.click();
    }
  }, [location.state]);

  // Inference-card view values: real (from MediaPipe) when active, else demo.
  const actionLabel = realActive ? cap(lr!.action) : d.actionLabel;
  const actionColor = realActive ? ACT_COLOR[lr!.action] ?? "#cdd6e2" : d.actionColor;
  const actionConfStr = realActive ? lr!.actionConf.toFixed(2) : d.actionConf;
  const handoffConf = realActive ? lr!.intentConf : d.handoffConf;
  const intentDetected = realActive ? lr!.intentDetected : d.intentDetected;
  const chipColor = realActive ? actionColor : d.chipColor;
  const activeChips: Record<string, boolean> = realActive
    ? Object.fromEntries(CHIP_KEYS.map((k) => [k, k === lr!.action]))
    : d.activeChips;
  const [robotAction, robotActionSub] = realActive
    ? ROBOT_MAP[lr!.action] ?? ROBOT_MAP.idle
    : [d.robotAction, d.robotActionSub];

  const seekFrac = (f: number) => seekTo(f * (TOTAL_FRAMES - 1));
  const onTimeline = useScrub(seekFrac);

  async function handleFile(file: File) {
    setFileName(file.name);
    setVideoUrl(URL.createObjectURL(file));
    setState("analyzing");
    try {
      const res = await api.analyzeVideo(file);
      setAnalysisId(res.meta.analysis_id);
      setState("analyzed");
    } catch {
      // Backend unreachable → keep playing with the local demo engine.
      setState("fallback");
    }
  }

  const statusLine = realActive
    ? `real inference · browser MediaPipe · ${lr!.fps} fps`
    : videoUrl && live.status === "loading"
    ? "loading MediaPipe model (first run downloads ~5MB)…"
    : videoUrl && live.status === "error"
    ? "MediaPipe failed to load · showing demo overlay"
    : state === "analyzing"
    ? "analyzing on backend…"
    : state === "analyzed"
    ? `backend demo inference · ${analysisId}`
    : state === "fallback"
    ? "backend offline · local demo fallback"
    : "demo clip · simulated inference";

  return (
    <div>
      {/* scenario selector */}
      <div className="mb-[14px] flex flex-wrap items-center gap-2">
        <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-faint mr-1">
          scenario
        </span>
        {SCENARIOS.map((s) => {
          const on = s.id === scenario;
          return (
            <button
              key={s.id}
              onClick={() => setScenario(s.id)}
              title={s.desc}
              className="font-mono text-[11px] px-[11px] py-[6px] rounded-[7px] transition-colors"
              style={
                on
                  ? { background: s.badgeColor + "1f", color: s.badgeColor, border: `1px solid ${s.badgeColor}66` }
                  : { background: "#0e131a", color: "#8893a3", border: "1px solid #1a222e" }
              }
            >
              {s.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.55fr_1fr] gap-[18px]">
        {/* video panel */}
        <div className="border border-line-strong rounded-[13px] overflow-hidden bg-deep">
          <div className="flex items-center justify-between px-[14px] py-[9px] border-b border-line bg-panel font-mono text-[10.5px] text-faint">
            <span className="flex items-center gap-[7px]">
              <span className="w-[6px] h-[6px] rounded-full bg-rec animate-blink" />
              {fileName} · 1280×720
            </span>
            {realActive ? (
              <span className="flex items-center gap-[6px] text-good">
                <span className="w-[6px] h-[6px] rounded-full bg-good animate-pulse-fast" />
                REAL · MediaPipe (browser) · {lr!.fps}fps
              </span>
            ) : (
              <span className="hidden sm:inline">overlays: skeleton · hands · bbox · traj</span>
            )}
          </div>

          <div className="relative aspect-[16/10]">
            {videoUrl ? (
              <video
                ref={setVideoEl}
                src={videoUrl}
                className="absolute inset-0 w-full h-full object-contain opacity-90"
                autoPlay
                loop
                muted
                playsInline
              />
            ) : (
              <LabBackground />
            )}
            <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(180deg,#0a0d1200,#0a0d1288)" }} />
            {realActive ? <LivePoseOverlay r={lr!} /> : <SkeletonOverlay d={d} />}
            <div className="absolute left-3 top-[34px] font-mono text-[9.5px]" style={{ color: "#4d9fff99" }}>
              {realActive ? "live · browser inference" : d.frameLabel}
            </div>
            {/* upload affordance */}
            <button
              onClick={() => inputRef.current?.click()}
              className="absolute right-3 top-3 font-mono text-[10px] text-muted bg-[#0b0f15cc] border border-line-strong rounded-[7px] px-[10px] py-[6px] backdrop-blur-[4px] hover:text-ink hover:border-signal transition-colors"
            >
              ↑ upload clip
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
          </div>

          {/* transport */}
          <div className="flex items-center gap-[13px] px-[14px] py-[11px] border-t border-line bg-panel">
            <PlayButton />
            <ScrubBar pct={d.framePct} onSeek={seekFrac} />
            <span className="font-mono text-[11px] text-muted whitespace-nowrap">
              {d.timecode} / 00:10.6
            </span>
          </div>

          {/* upload status strip */}
          <div className="flex items-center gap-[7px] px-[14px] py-[8px] border-t border-line bg-deep font-mono text-[10px] text-faint">
            <span
              className="w-[6px] h-[6px] rounded-[2px]"
              style={{ background: state === "fallback" ? "#ff8a3d" : state === "analyzed" ? "#3ddc97" : "#4d9fff" }}
            />
            {statusLine}
          </div>

          {/* scenario decision note */}
          {d.scenarioNote && (
            <div className="flex items-center gap-[7px] px-[14px] py-[8px] border-t border-line bg-deep font-mono text-[10px] text-warn">
              <span className="w-[6px] h-[6px] rounded-full bg-warn animate-pulse flex-none" />
              {d.scenarioNote}
            </div>
          )}
        </div>

        {/* inference cards */}
        <div className="flex flex-col gap-3">
          {/* current action */}
          <div className="border border-line-strong bg-panel rounded-[12px] px-4 py-[15px]">
            <div className="font-mono text-[10px] tracking-[0.1em] uppercase text-faint mb-[10px]">
              current action
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-[27px] font-semibold tracking-[-0.01em]" style={{ color: actionColor }}>
                {actionLabel}
              </span>
              <span className="font-mono text-[14px] text-muted">{actionConfStr}</span>
            </div>
            <div className="flex gap-[5px] mt-3">
              {CHIP_KEYS.map((k) => {
                const on = activeChips[k];
                return (
                  <span
                    key={k}
                    className="font-mono text-[10px] px-2 py-1 rounded-[5px]"
                    style={
                      on
                        ? { background: chipColor + "22", color: chipColor, border: `1px solid ${chipColor}55` }
                        : { background: "#0e131a", color: "#3f4a59", border: "1px solid #1a222e" }
                    }
                  >
                    {CHIP_LABEL[k]}
                  </span>
                );
              })}
            </div>
          </div>

          {/* handoff intent */}
          <div className="border border-line-green bg-[#0b140f] rounded-[12px] px-4 py-[15px] animate-glow">
            <div className="flex items-center justify-between mb-[10px]">
              <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-good">
                handoff intent{realActive ? " · heuristic" : ""}
              </span>
              <span
                className="font-mono text-[10.5px]"
                style={{ color: intentDetected ? "#3ddc97" : "#5c6675" }}
              >
                {intentDetected ? "INTENT DETECTED" : "monitoring"}
              </span>
            </div>
            <div className="flex items-baseline gap-[9px]">
              <span className="font-mono text-[38px] font-semibold leading-none text-white">
                {handoffConf.toFixed(2)}
              </span>
              <span className="text-[13px] text-muted">confidence</span>
            </div>
            <div className="mt-3 h-[7px] bg-[#0a1a12] rounded-[5px] overflow-hidden">
              <div
                className="h-full rounded-[5px]"
                style={{
                  width: `${Math.round(handoffConf * 100)}%`,
                  background: "linear-gradient(90deg,#3ddc97,#7fffcf)",
                  transition: "width .2s linear",
                }}
              />
            </div>
          </div>

          {/* future hand target */}
          <div className="border border-line-strong bg-panel rounded-[12px] px-4 py-[15px]">
            <div className="font-mono text-[10px] tracking-[0.1em] uppercase text-faint mb-[9px]">
              future hand target · t+1.0s
            </div>
            <div className="font-mono text-[15px] text-ink">{d.futureTarget}</div>
            <div className="flex justify-between mt-[9px] text-[11.5px] text-faint font-mono">
              <span>ADE 52mm</span>
              <span>FDE 96mm</span>
              <span>horizon 30f</span>
            </div>
          </div>

          {/* suggested robot action */}
          <div className="border border-line-accent bg-[#0a111c] rounded-[12px] px-4 py-[15px]">
            <div className="font-mono text-[10px] tracking-[0.1em] uppercase text-signal mb-[9px]">
              suggested robot action
            </div>
            <div className="flex items-center gap-[11px]">
              <div className="w-[34px] h-[34px] rounded-[8px] bg-[#0e1826] border border-line-accent flex items-center justify-center flex-none">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4d9fff" strokeWidth="1.8">
                  <path d="M6 11V7a2 2 0 012-2M6 11l-2 2 4 5h7l3-4v-5a2 2 0 00-4 0M10 11V5a2 2 0 014 0v6M14 11V8" strokeLinecap="round" />
                </svg>
              </div>
              <div>
                <div className="text-[15.5px] font-semibold text-ink">{robotAction}</div>
                <div className="text-[11.5px] text-faint font-mono">{robotActionSub}</div>
              </div>
            </div>
          </div>

          {/* live WebSocket stream (realtime backend inference) */}
          <div className="border border-line-strong bg-panel rounded-[12px] px-4 py-[13px]">
            <div className="flex items-center justify-between mb-[9px]">
              <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-faint">
                live stream · /ws/stream
              </span>
              <span
                className="flex items-center gap-[6px] font-mono text-[10px]"
                style={{
                  color:
                    stream.status === "online"
                      ? "#3ddc97"
                      : stream.status === "connecting"
                      ? "#4d9fff"
                      : "#8893a3",
                }}
              >
                <span
                  className="w-[6px] h-[6px] rounded-full"
                  style={{
                    background:
                      stream.status === "online"
                        ? "#3ddc97"
                        : stream.status === "connecting"
                        ? "#4d9fff"
                        : "#5c6675",
                  }}
                />
                {stream.status === "online" ? "streaming" : stream.status}
              </span>
            </div>
            {stream.status === "online" && stream.frame ? (
              <div className="font-mono text-[11.5px] text-muted flex flex-wrap gap-x-4 gap-y-1">
                <span>frame {String(stream.frame.frame).padStart(4, "0")}</span>
                <span style={{ color: "#cdd6e2" }}>{stream.frame.action.label}</span>
                <span>intent {stream.frame.handoff_intent.confidence.toFixed(2)}</span>
                <span className="text-faint">{Math.round(stream.frame.latency_ms)}ms</span>
              </div>
            ) : (
              <div className="font-mono text-[11px] text-faint2">
                offline · run the backend (uvicorn) to stream realtime frames
              </div>
            )}
          </div>
        </div>
      </div>

      {/* timeline */}
      <div className="mt-[18px] border border-line-strong bg-panel rounded-[13px] px-[18px] py-4">
        <div className="flex items-center justify-between mb-[13px]">
          <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-faint">
            segmented actions · temporal
          </span>
          <span className="font-mono text-[10.5px] text-faint">6 segments · 320 frames</span>
        </div>
        <div
          onMouseDown={onTimeline}
          onTouchStart={onTimeline}
          className="relative h-[46px] rounded-[8px] overflow-hidden bg-deep flex cursor-pointer"
        >
          {segments.map((seg, i) => {
            const active = seg.key === d.segmentKey;
            return (
              <div
                key={i}
                className="h-full border-r border-deep flex flex-col justify-center pl-2"
                style={{
                  width: `${((seg.end - seg.start) / TOTAL_FRAMES) * 100}%`,
                  background: seg.bg,
                  boxShadow: active
                    ? `inset 0 0 0 1.5px ${seg.color}, inset 0 0 18px ${seg.color}33`
                    : "none",
                }}
              >
                <span className="text-[11.5px] font-semibold" style={{ color: seg.color }}>
                  {seg.label}
                </span>
                <span className="font-mono text-[9.5px] text-faint">{seg.conf.toFixed(2)}</span>
              </div>
            );
          })}
          <div
            className="absolute top-0 bottom-0 w-[2px] bg-white"
            style={{ left: `${d.framePct}%`, boxShadow: "0 0 8px #fff" }}
          />
        </div>
        <div className="flex justify-between mt-[7px] font-mono text-[9.5px] text-faint2">
          <span>00:00.0</span>
          <span>00:05.3</span>
          <span>00:10.6</span>
        </div>
      </div>
    </div>
  );
}
