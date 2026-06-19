// Honest "real-data readiness" status — shown on the Dataset and Model Inspector
// pages. Static by design: it reflects the shipped state of the project, not a
// live probe, so it can't overclaim. Update the flags here as real data/weights land.

const MODES: { label: string; state: "on" | "avail" | "off"; note: string }[] = [
  { label: "Demo mode", state: "on", note: "simulated timeline + deterministic inference" },
  { label: "Browser real MediaPipe pose", state: "avail", note: "available on uploaded video (/analyze)" },
  { label: "Backend real trained models", state: "off", note: "not active until ONNX weights exist" },
  { label: "Self-recorded dataset", state: "off", note: "user-provided local clips, not committed" },
];

// Steps toward measured metrics. `done` stays false until you actually do them.
const CHECKLIST: { label: string; done: boolean }[] = [
  { label: "collect 120–180 clips (/capture)", done: false },
  { label: "extract keypoints", done: false },
  { label: "train action baseline", done: false },
  { label: "train intent baseline", done: false },
  { label: "evaluate metrics", done: false },
  { label: "replace simulated metrics with measured metrics", done: false },
];

const DOT: Record<string, string> = { on: "#3ddc97", avail: "#4d9fff", off: "#5c6675" };
const TAG: Record<string, string> = { on: "active", avail: "available", off: "inactive" };

export function ReadinessPanel() {
  return (
    <div className="border border-line-strong bg-panel rounded-[12px] p-[18px]">
      <div className="flex items-center gap-[7px] font-mono text-[10px] tracking-[0.12em] uppercase text-faint mb-[14px]">
        real-data readiness
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-[18px]">
        {/* current mode */}
        <div className="flex flex-col gap-[9px]">
          {MODES.map((m) => (
            <div key={m.label} className="flex items-start gap-[9px]">
              <span className="w-[8px] h-[8px] rounded-full flex-none mt-[5px]" style={{ background: DOT[m.state] }} />
              <div>
                <div className="text-[12.5px] text-ink">
                  {m.label}{" "}
                  <span className="font-mono text-[9.5px]" style={{ color: DOT[m.state] }}>· {TAG[m.state]}</span>
                </div>
                <div className="text-[11px] text-faint">{m.note}</div>
              </div>
            </div>
          ))}
        </div>
        {/* checklist */}
        <div>
          <div className="font-mono text-[9.5px] tracking-[0.1em] uppercase text-faint2 mb-[9px]">
            path to measured metrics
          </div>
          <div className="flex flex-col gap-[7px]">
            {CHECKLIST.map((c) => (
              <div key={c.label} className="flex items-center gap-[9px] font-mono text-[11.5px]">
                <span
                  className="w-[14px] h-[14px] rounded-[4px] border flex items-center justify-center flex-none text-[9px]"
                  style={{
                    borderColor: c.done ? "#3ddc97" : "#2a3340",
                    color: c.done ? "#3ddc97" : "transparent",
                    background: c.done ? "#0c1812" : "transparent",
                  }}
                >
                  ✓
                </span>
                <span className={c.done ? "text-muted line-through" : "text-muted"}>{c.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-[14px] font-mono text-[10px] text-faint2 leading-[1.5]">
        All on-screen metrics are <span className="text-warn">demo-mode simulated</span> until the
        checklist is complete. See docs/REAL_DATA_MVP_PLAN.md and docs/TRAINING_BASELINES.md.
      </div>
    </div>
  );
}
