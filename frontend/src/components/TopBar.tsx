import { useLocation } from "react-router-dom";
import { usePlayback } from "../state/playback";
import { derive } from "../lib/demoEngine";

const TITLES: Record<string, [string, string]> = {
  "/analyze": ["Video analysis", "workspace / live inference"],
  "/pose": ["3D pose viewer", "workspace / reconstruction"],
  "/inspector": ["Model inspector", "workspace / architecture"],
  "/model-card": ["Model card", "workspace / documentation"],
  "/dataset": ["Dataset & evaluation", "workspace / data"],
  "/handoff": ["Implementation handoff", "workspace / dev export"],
};

export function TopBar() {
  const { pathname } = useLocation();
  const { frame, playing, togglePlay } = usePlayback();
  const d = derive(frame);
  const [title, crumb] = TITLES[pathname] ?? TITLES["/analyze"];

  return (
    <header className="flex items-center justify-between px-[26px] py-4 border-b border-line">
      <div>
        <div className="font-mono text-[10px] tracking-[0.1em] text-faint mb-1 whitespace-nowrap">
          {crumb}
        </div>
        <h2 className="m-0 text-[19px] font-semibold tracking-[-0.01em]">{title}</h2>
      </div>
      <div className="flex items-center gap-[14px]">
        <div className="flex items-center gap-[7px] font-mono text-[10.5px] tracking-[0.08em] text-warn bg-[#1a1208] border border-[#3a2a14] px-[11px] py-[7px] rounded-lg">
          <span className="w-[6px] h-[6px] rounded-[2px] bg-warn animate-pulse" />
          DEMO MODE
        </div>
        <div className="flex items-center gap-[9px] font-mono text-[12px] text-muted bg-panel border border-line-mid px-3 py-[7px] rounded-lg">
          <span
            onClick={togglePlay}
            className="cursor-pointer text-signal w-[14px] inline-block text-center select-none"
          >
            {playing ? "❚❚" : "▶"}
          </span>
          <span>{d.timecode}</span>
          <span className="text-faint2">|</span>
          <span className="text-faint">{d.frameLabel}</span>
        </div>
        <div
          className="w-[30px] h-[30px] rounded-full border border-line-strong"
          style={{ background: "linear-gradient(135deg,#1c2c44,#0e1826)" }}
        />
      </div>
    </header>
  );
}
