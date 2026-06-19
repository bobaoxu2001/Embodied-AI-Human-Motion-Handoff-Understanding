import { ARCH_CARDS, DEPLOY, LATENCY, METRICS } from "../data/demo";
import { ReadinessPanel } from "../components/ReadinessPanel";

export function ModelInspector() {
  return (
    <div>
      <div className="flex items-center gap-[7px] font-mono text-[10.5px] text-faint mb-3">
        <span className="w-[6px] h-[6px] rounded-[2px] bg-warn" />
        demo-mode metrics — simulated on a 150-clip MVP set; targets, not production
        benchmarks
      </div>

      <div className="mb-5">
        <ReadinessPanel />
      </div>

      {/* metric grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
        {METRICS.map((m) => (
          <div key={m.label} className="border border-line-strong bg-panel rounded-[11px] px-[15px] py-[14px]">
            <div className="font-mono text-[9.5px] tracking-[0.08em] uppercase text-faint mb-[9px]">
              {m.label}
            </div>
            <div className="flex items-baseline gap-1">
              <span className="font-mono text-[24px] font-semibold" style={{ color: m.color }}>
                {m.value}
              </span>
              <span className="text-[11.5px] text-faint">{m.unit}</span>
            </div>
            <div className="text-[10.5px] text-faint font-mono mt-[6px]">{m.sub}</div>
          </div>
        ))}
      </div>

      {/* architecture graph */}
      <div className="font-mono text-[10px] tracking-[0.12em] uppercase text-faint mb-3">
        architecture · inference graph
      </div>
      <div className="flex flex-col lg:flex-row gap-[10px] items-stretch mb-[22px]">
        {ARCH_CARDS.map((a) => (
          <div
            key={a.n}
            className="flex-1 rounded-[12px] px-[14px] py-[15px] flex flex-col"
            style={{ border: `1px solid ${a.border}`, background: a.bg }}
          >
            <div className="flex items-center justify-between mb-[11px]">
              <span className="font-mono text-[11px]" style={{ color: a.accent }}>{a.n}</span>
              <span
                className="font-mono text-[9px] tracking-[0.06em] uppercase px-[7px] py-[2px] rounded-[20px]"
                style={{ color: a.accent, border: `1px solid ${a.border}` }}
              >
                {a.tag}
              </span>
            </div>
            <div className="text-[14.5px] font-semibold mb-[5px] tracking-[-0.01em]">{a.title}</div>
            <div className="text-[12px] text-muted mb-[10px]">{a.model}</div>
            <div className="mt-auto font-mono text-[10px] text-faint leading-[1.5] border-t border-line pt-[9px]">
              {a.io}
            </div>
          </div>
        ))}
      </div>

      {/* deployment + latency */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[18px]">
        <div className="border border-line-strong bg-panel rounded-[12px] p-[18px]">
          <div className="font-mono text-[10px] tracking-[0.12em] uppercase text-faint mb-[14px]">
            production deployment
          </div>
          <div className="flex flex-col gap-[10px]">
            {DEPLOY.map((dd) => (
              <div key={dd.label} className="flex items-center justify-between px-[13px] py-[11px] bg-deep border border-line-soft rounded-[9px]">
                <div>
                  <div className="text-[13.5px] font-semibold">{dd.label}</div>
                  <div className="text-[11.5px] text-faint font-mono">{dd.sub}</div>
                </div>
                <span className="flex items-center gap-[7px] font-mono text-[11px]" style={{ color: dd.color }}>
                  <span className="w-[7px] h-[7px] rounded-full animate-pulse" style={{ background: dd.color }} />
                  {dd.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="border border-line-strong bg-panel rounded-[12px] p-[18px]">
          <div className="font-mono text-[10px] tracking-[0.12em] uppercase text-faint mb-[14px]">
            latency budget · per frame
          </div>
          <div className="flex flex-col gap-[13px]">
            {LATENCY.map((l) => (
              <div key={l.label}>
                <div className="flex justify-between text-[12.5px] mb-[5px]">
                  <span className="text-[#cdd6e2]">{l.label}</span>
                  <span className="font-mono text-muted">{l.ms} ms</span>
                </div>
                <div className="h-[6px] bg-[#1a222e] rounded-[4px] overflow-hidden">
                  <div className="h-full rounded-[4px]" style={{ width: `${l.pct}%`, background: l.color }} />
                </div>
              </div>
            ))}
            <div className="flex justify-between border-t border-line pt-[11px] font-mono text-[12.5px]">
              <span className="text-faint">total · end-to-end</span>
              <span className="text-good font-semibold">33 ms · 30 fps</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
