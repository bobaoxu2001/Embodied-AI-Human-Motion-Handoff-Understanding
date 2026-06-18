import { usePlayback } from "../state/playback";
import { derive } from "../lib/demoEngine";
import { TOTAL_FRAMES } from "../data/demo";
import { ScrubBar } from "../components/ScrubBar";
import { PlayButton } from "../components/PlayButton";

function Slider({ label, value, pct }: { label: string; value: number; pct: number }) {
  return (
    <div className="mb-[14px]">
      <div className="flex justify-between text-[12px] text-muted mb-[6px]">
        <span>{label}</span>
        <span className="font-mono text-signal">{value}°</span>
      </div>
      <div className="h-[5px] bg-[#1a222e] rounded-[4px] relative">
        <div className="absolute left-0 top-0 bottom-0 bg-signal rounded-[4px]" style={{ width: `${pct}%` }} />
        <div
          className="absolute -top-[3px] w-[11px] h-[11px] rounded-full bg-white border-2 border-signal"
          style={{ left: `${pct}%`, transform: "translateX(-50%)" }}
        />
      </div>
    </div>
  );
}

export function PoseViewer3D() {
  const { frame, seekTo, az, el, setCamera } = usePlayback();
  const d = derive(frame);
  const seekFrac = (f: number) => seekTo(f * (TOTAL_FRAMES - 1));

  const presetBtn =
    "flex-1 text-center cursor-pointer text-[11.5px] text-muted bg-[#0e1826] border border-line-accent rounded-[7px] py-[7px] hover:text-ink hover:border-signal transition-colors";

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1.6fr_1fr] gap-[18px]">
      <div className="border border-line-strong rounded-[13px] overflow-hidden bg-bg">
        <div className="flex items-center justify-between px-[14px] py-[9px] border-b border-line bg-panel font-mono text-[10.5px] text-faint">
          <span>3d skeleton · root-relative · world frame</span>
          <span>az {az}° · el {el}°</span>
        </div>
        <div
          className="relative aspect-[16/11]"
          style={{ background: "radial-gradient(700px 360px at 50% 30%,#0c141d,#070a0e)" }}
        >
          <svg viewBox="0 0 720 480" preserveAspectRatio="xMidYMid meet" className="absolute inset-0 w-full h-full">
            {/* floor grid */}
            <g stroke="#16202c" strokeWidth="1">
              <path d="M120 430 L600 430" />
              <path d="M150 390 L570 390" />
              <path d="M178 352 L542 352" />
              <path d="M204 318 L516 318" />
              <path d="M120 430 L204 318" />
              <path d="M232 430 L286 318" />
              <path d="M360 430 L360 318" />
              <path d="M488 430 L434 318" />
              <path d="M600 430 L516 318" />
            </g>
            <ellipse cx="360" cy="418" rx="86" ry="15" fill="#000" opacity="0.5" />
            {/* back bones (dim) */}
            <g stroke="#2b5a8a" strokeWidth="3" strokeLinecap="round" opacity="0.55">
              <line x1="330" y1="150" x2="300" y2="220" />
              <line x1="300" y1="220" x2="296" y2="290" />
              <line x1="330" y1="300" x2="318" y2="360" />
              <line x1="318" y1="360" x2="312" y2="416" />
            </g>
            {/* front bones */}
            <g stroke="#4d9fff" strokeWidth="3.4" strokeLinecap="round">
              <line x1="358" y1="118" x2="360" y2="150" />
              <line x1="330" y1="150" x2="392" y2="150" />
              <line x1="392" y1="150" x2="448" y2="186" />
              <line x1="448" y1="186" x2="506" y2="214" />
              <line x1="360" y1="150" x2="362" y2="300" />
              <line x1="338" y1="300" x2="386" y2="298" />
              <line x1="386" y1="298" x2="396" y2="362" />
              <line x1="396" y1="362" x2="404" y2="418" />
            </g>
            <g fill="#9fd0ff" stroke="#070a0e" strokeWidth="1.4">
              {[[360, 150], [330, 150], [392, 150], [448, 186], [362, 300], [338, 300], [386, 298], [396, 362], [404, 418]].map(([cx, cy], i) => (
                <circle key={i} cx={cx} cy={cy} r="4.6" />
              ))}
              <circle cx="318" cy="360" r="4" fill="#2b5a8a" />
              <circle cx="312" cy="416" r="4" fill="#2b5a8a" />
            </g>
            <circle cx="358" cy="100" r="17" fill="none" stroke="#4d9fff" strokeWidth="3" />
            {/* active wrist + hand */}
            <circle cx="506" cy="214" r="9" fill="none" stroke="#3ddc97" strokeWidth="2.4" className="animate-pulse-fast" />
            <circle cx="506" cy="214" r="4" fill="#3ddc97" />
            <g fill="#c98bff">
              <circle cx="524" cy="200" r="2.4" /><circle cx="534" cy="208" r="2.4" /><circle cx="536" cy="218" r="2.4" /><circle cx="528" cy="226" r="2.4" />
            </g>
            {/* past trajectory (solid) + future (dashed) */}
            <path d="M448 250 C 470 235, 490 222, 506 214" fill="none" stroke="#4d9fff" strokeWidth="2.4" opacity="0.7" />
            <path d="M506 214 C 560 196, 600 220, 636 250" fill="none" stroke="#3ddc97" strokeWidth="2.6" strokeDasharray="6 7" strokeLinecap="round" className="traj-flow" />
            <g>
              <circle cx="636" cy="250" r="6.5" fill="none" stroke="#3ddc97" strokeWidth="2" />
              <line x1="627" y1="250" x2="645" y2="250" stroke="#3ddc97" strokeWidth="1.4" />
              <line x1="636" y1="241" x2="636" y2="259" stroke="#3ddc97" strokeWidth="1.4" />
            </g>
            {/* axes */}
            <g fontFamily="JetBrains Mono" fontSize="11">
              <line x1="60" y1="440" x2="60" y2="400" stroke="#3ddc97" strokeWidth="1.6" />
              <line x1="60" y1="440" x2="100" y2="440" stroke="#ff8a3d" strokeWidth="1.6" />
              <line x1="60" y1="440" x2="84" y2="424" stroke="#4d9fff" strokeWidth="1.6" />
              <text x="50" y="394" fill="#3ddc97">y</text>
              <text x="104" y="444" fill="#ff8a3d">x</text>
              <text x="86" y="420" fill="#4d9fff">z</text>
            </g>
          </svg>
          <div className="absolute right-[14px] top-[46px] font-mono text-[10px] text-faint text-right leading-[1.7]">
            <div>17 body + 42 hand kpts</div>
            <div className="text-good">wrist track: active</div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="border border-line-strong bg-panel rounded-[12px] p-4">
          <div className="font-mono text-[10px] tracking-[0.1em] uppercase text-faint mb-[14px]">camera</div>
          <Slider label="azimuth" value={az} pct={Math.round((az / 90) * 100)} />
          <Slider label="elevation" value={el} pct={Math.round((el / 90) * 100)} />
          <div className="flex gap-[7px] mt-4">
            <span onClick={() => setCamera(0, 8)} className={presetBtn}>front</span>
            <span onClick={() => setCamera(80, 12)} className={presetBtn}>side</span>
            <span onClick={() => setCamera(35, 62)} className={presetBtn}>top</span>
          </div>
        </div>

        <div className="border border-line-strong bg-panel rounded-[12px] p-4">
          <div className="font-mono text-[10px] tracking-[0.1em] uppercase text-faint mb-3">frame scrubber</div>
          <div className="mb-[10px]">
            <ScrubBar pct={d.framePct} onSeek={seekFrac} trackH={6} handleBorder="#3ddc97" />
          </div>
          <div className="flex items-center justify-between">
            <PlayButton />
            <span className="font-mono text-[12px] text-muted">
              {d.frameLabel} · {d.timecode}
            </span>
          </div>
        </div>

        <div className="border border-line-strong bg-panel rounded-[12px] p-4">
          <div className="font-mono text-[10px] tracking-[0.1em] uppercase text-faint mb-3">legend</div>
          <div className="flex flex-col gap-[9px] text-[12.5px]">
            <div className="flex items-center gap-[9px]">
              <span className="w-[14px] h-[3px] rounded-[2px] bg-signal" />
              <span className="text-muted">body joints (17)</span>
            </div>
            <div className="flex items-center gap-[9px]">
              <span className="w-[10px] h-[10px] rounded-full bg-hand" />
              <span className="text-muted">hand keypoints (42)</span>
            </div>
            <div className="flex items-center gap-[9px]">
              <span className="w-[14px] h-[3px] rounded-[2px] bg-signal opacity-70" />
              <span className="text-muted">wrist trajectory (past)</span>
            </div>
            <div className="flex items-center gap-[9px]">
              <span className="w-[14px] h-0 border-t-2 border-dashed border-good" />
              <span className="text-muted">predicted (t+1.0s)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
