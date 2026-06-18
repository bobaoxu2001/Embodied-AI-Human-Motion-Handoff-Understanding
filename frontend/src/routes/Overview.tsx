import { useNavigate } from "react-router-dom";
import { Logo } from "../components/Logo";
import { LabBackground } from "../components/LabBackground";

const BADGES = [
  { t: "3D Vision", c: "#cfe0ff", bg: "#0e1826", b: "#1c2c44" },
  { t: "Human Pose Tracking", c: "#cfe0ff", bg: "#0e1826", b: "#1c2c44" },
  { t: "Video Understanding", c: "#cfe0ff", bg: "#0e1826", b: "#1c2c44" },
  { t: "Embodied AI", c: "#c9ffe9", bg: "#0c1812", b: "#18372a" },
  { t: "PyTorch", c: "#9aa4b2", bg: "#11151c", b: "#232b38" },
  { t: "FastAPI", c: "#9aa4b2", bg: "#11151c", b: "#232b38" },
  { t: "ONNX", c: "#9aa4b2", bg: "#11151c", b: "#232b38" },
];

const STATS = [
  { v: "30", u: "fps", l: "throughput", c: "#e8ecf2" },
  { v: "33", u: "ms", l: "latency p50", c: "#e8ecf2" },
  { v: "89.2", u: "%", l: "intent acc", c: "#3ddc97" },
  { v: "52", u: "mm", l: "traj ADE", c: "#e8ecf2" },
];

const PIPELINE = [
  { n: "01", t: "Pose extraction", d: "2D body + hand keypoints", c: "#4d9fff", green: false },
  { n: "02", t: "2D→3D lifting", d: "Root-relative 3D joints", c: "#4d9fff", green: false },
  { n: "03", t: "Action recognition", d: "Temporal pose → 6 actions", c: "#7c5cff", green: false },
  { n: "04", t: "Trajectory forecast", d: "1.0s future hand path", c: "#3ddc97", green: false },
  { n: "05", t: "Handoff intent", d: "Binary intent + confidence", c: "#3ddc97", green: true },
];

export function Overview() {
  const navigate = useNavigate();
  return (
    <div
      className="min-h-screen text-ink"
      style={{
        background:
          "radial-gradient(1200px 600px at 78% -10%,#0e1b2433,transparent),#070a0e",
        backgroundImage:
          "linear-gradient(#ffffff07 1px,transparent 1px),linear-gradient(90deg,#ffffff07 1px,transparent 1px)",
        backgroundSize: "46px 46px,46px 46px",
      }}
    >
      <header className="flex items-center justify-between px-10 py-5 border-b border-line max-w-[1280px] mx-auto">
        <div className="flex items-center gap-[13px]">
          <Logo />
          <div className="flex flex-col leading-[1.1]">
            <span className="text-[15px] font-semibold tracking-[-0.01em]">
              Embodied Handoff Perception
            </span>
            <span className="font-mono text-[10.5px] text-faint tracking-[0.04em]">
              perception-stack · v0.4.1
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/inspector")}
            className="bg-transparent border border-line-strong text-muted text-[13px] font-medium px-4 py-[9px] rounded-lg cursor-pointer hover:text-ink"
          >
            Model card
          </button>
          <button
            onClick={() => navigate("/analyze")}
            className="bg-signal border border-signal text-[#06121f] text-[13px] font-semibold px-[18px] py-[9px] rounded-lg cursor-pointer"
          >
            Launch dashboard →
          </button>
        </div>
      </header>

      <div className="max-w-[1280px] mx-auto px-10 pt-[54px] pb-[30px] grid grid-cols-1 lg:grid-cols-[1fr_1.15fr] gap-[54px] items-center">
        {/* left copy */}
        <div>
          <div className="inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.1em] uppercase text-good border border-[#18372a] bg-[#0c1812] px-[11px] py-[6px] rounded-[20px] mb-[22px] whitespace-nowrap">
            <span className="w-[6px] h-[6px] rounded-full bg-good animate-pulse" />
            human-robot interaction
          </div>
          <h1 className="text-[46px] leading-[1.08] tracking-[-0.025em] font-semibold m-0 mb-5">
            Real-time 3D human pose tracking and handoff intent recognition.
          </h1>
          <p className="text-[17px] leading-[1.55] text-muted m-0 mb-[26px] max-w-[520px]">
            A perception stack that reads RGB video of a person interacting with an
            object — tracking 2D/3D body &amp; hand pose, forecasting the hand
            trajectory, recognizing actions, and deciding whether the person intends
            to hand the object to a robot.
          </p>
          <div className="flex flex-wrap gap-2 mb-[30px]">
            {BADGES.map((b) => (
              <span
                key={b.t}
                className="font-mono text-[11.5px] px-[11px] py-[6px] rounded-md"
                style={{ color: b.c, background: b.bg, border: `1px solid ${b.b}` }}
              >
                {b.t}
              </span>
            ))}
          </div>
          <div className="flex gap-[34px] items-end">
            {STATS.map((s) => (
              <div key={s.l}>
                <div className="font-mono text-[25px] font-semibold" style={{ color: s.c }}>
                  {s.v}
                  <span className="text-[13px] text-faint"> {s.u}</span>
                </div>
                <div className="text-[11.5px] text-faint font-mono">{s.l}</div>
              </div>
            ))}
          </div>
          <div className="mt-[14px] font-mono text-[10.5px] text-faint flex items-center gap-[7px]">
            <span className="w-[6px] h-[6px] rounded-[2px] bg-warn" />
            demo-mode · simulated inference on a 150-clip MVP set — not production
            benchmarks
          </div>
        </div>

        {/* right hero viz */}
        <div className="relative border border-line-strong rounded-[14px] overflow-hidden bg-deep" style={{ boxShadow: "0 30px 80px -30px #000" }}>
          <div className="flex items-center justify-between px-[14px] py-[9px] border-b border-line bg-panel font-mono text-[10.5px] text-faint tracking-[0.03em]">
            <span className="flex items-center gap-[7px]">
              <span className="w-[6px] h-[6px] rounded-full bg-rec animate-blink" />
              cam_00 · rgb · 1280×720 · 30fps
            </span>
            <span className="text-warn">inference: demo-mode</span>
          </div>
          <div className="relative aspect-[16/10] bg-deep">
            <LabBackground />
            <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(180deg,#0a0d1200,#0a0d1288)" }} />
            <div className="absolute left-0 right-0 top-0 h-[46px] pointer-events-none animate-scan" style={{ background: "linear-gradient(180deg,#4d9fff22,transparent)" }} />
            <svg viewBox="0 0 640 400" preserveAspectRatio="xMidYMid meet" className="absolute inset-0 w-full h-full pointer-events-none">
              <g stroke="#4d9fff" strokeWidth="2.4" strokeLinecap="round" opacity="0.92">
                <line x1="250" y1="96" x2="252" y2="128" />
                <line x1="216" y1="138" x2="288" y2="134" />
                <line x1="252" y1="128" x2="216" y2="138" />
                <line x1="252" y1="128" x2="288" y2="134" />
                <line x1="216" y1="138" x2="200" y2="196" />
                <line x1="200" y1="196" x2="196" y2="250" />
                <line x1="288" y1="134" x2="344" y2="158" />
                <line x1="344" y1="158" x2="404" y2="182" />
                <line x1="252" y1="128" x2="254" y2="232" />
                <line x1="234" y1="234" x2="278" y2="230" />
                <line x1="254" y1="232" x2="234" y2="234" />
                <line x1="254" y1="232" x2="278" y2="230" />
                <line x1="234" y1="234" x2="228" y2="310" />
                <line x1="228" y1="310" x2="224" y2="380" />
                <line x1="278" y1="230" x2="282" y2="308" />
                <line x1="282" y1="308" x2="288" y2="376" />
              </g>
              <g fill="#7fbfff" stroke="#0a0d12" strokeWidth="1">
                {[[252, 128], [216, 138], [288, 134], [200, 196], [196, 250], [344, 158], [254, 232], [234, 234], [278, 230], [228, 310], [224, 380], [282, 308], [288, 376]].map(([cx, cy], i) => (
                  <circle key={i} cx={cx} cy={cy} r="3.4" />
                ))}
              </g>
              <circle cx="250" cy="86" r="13" fill="none" stroke="#4d9fff" strokeWidth="2.2" />
              <circle cx="404" cy="182" r="8" fill="none" stroke="#3ddc97" strokeWidth="2" className="animate-pulse-fast" />
              <circle cx="404" cy="182" r="3.6" fill="#3ddc97" />
              <g fill="#c98bff">
                <circle cx="420" cy="170" r="2" /><circle cx="430" cy="174" r="2" /><circle cx="434" cy="183" r="2" /><circle cx="431" cy="193" r="2" /><circle cx="422" cy="198" r="2" />
              </g>
              <g stroke="#c98bff" strokeWidth="1.2" opacity="0.7">
                <line x1="404" y1="182" x2="420" y2="170" /><line x1="404" y1="182" x2="430" y2="174" /><line x1="404" y1="182" x2="434" y2="183" /><line x1="404" y1="182" x2="431" y2="193" /><line x1="404" y1="182" x2="422" y2="198" />
              </g>
              <rect x="396" y="150" width="62" height="66" rx="2" fill="none" stroke="#ff8a3d" strokeWidth="1.8" strokeDasharray="5 4" />
              <text x="396" y="144" fontFamily="JetBrains Mono" fontSize="11" fill="#ff8a3d">object · cup 0.97</text>
              <path d="M404 182 C 470 148, 520 196, 574 222" fill="none" stroke="#3ddc97" strokeWidth="2.4" strokeDasharray="6 7" strokeLinecap="round" className="traj-flow" />
              <g>
                <circle cx="574" cy="222" r="6" fill="none" stroke="#3ddc97" strokeWidth="2" />
                <line x1="566" y1="222" x2="582" y2="222" stroke="#3ddc97" strokeWidth="1.4" />
                <line x1="574" y1="214" x2="574" y2="230" stroke="#3ddc97" strokeWidth="1.4" />
              </g>
              <text x="556" y="246" fontFamily="JetBrains Mono" fontSize="10.5" fill="#3ddc97">target t+1.0s</text>
            </svg>
            <div className="absolute right-[14px] bottom-[14px] bg-[#0b140fee] border border-line-green rounded-[10px] px-[14px] py-3 min-w-[206px] backdrop-blur-[6px] animate-glow">
              <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.1em] uppercase text-good mb-[7px]">
                <span className="w-[6px] h-[6px] rounded-full bg-good animate-pulse-fast" />
                handoff intent
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-[30px] font-semibold text-white leading-none">0.94</span>
                <span className="text-[12px] text-good">detected</span>
              </div>
              <div className="mt-2 text-[12px] text-muted">
                Robot → <span className="text-ink font-medium">extend gripper · open</span>
              </div>
            </div>
            <div className="absolute left-[10px] top-[34px] font-mono text-[9.5px]" style={{ color: "#4d9fff99" }}>
              frame 0142
            </div>
          </div>
        </div>
      </div>

      {/* pipeline ribbon */}
      <div className="max-w-[1280px] mx-auto px-10 pt-[18px] pb-[70px]">
        <div className="font-mono text-[10.5px] tracking-[0.12em] uppercase text-faint mb-[14px]">
          inference pipeline
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {PIPELINE.map((p) => (
            <div
              key={p.n}
              onClick={() => navigate("/inspector")}
              className="cursor-pointer rounded-[11px] px-4 py-[15px]"
              style={{
                border: `1px solid ${p.green ? "#1c4533" : "#1c2533"}`,
                background: p.green ? "#0b140f" : "#0b0f15",
              }}
            >
              <div className="font-mono text-[10px]" style={{ color: p.c }}>{p.n}</div>
              <div className="text-[14.5px] font-semibold mt-[7px] mb-[3px]">{p.t}</div>
              <div className="text-[12px] text-mute2 leading-[1.4]">{p.d}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
