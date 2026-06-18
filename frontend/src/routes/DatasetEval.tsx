import { CLASS_DIST, DATASET_SOURCES, FAILURE_CASES } from "../data/demo";

export function DatasetEval() {
  const distMax = Math.max(...CLASS_DIST.map((d) => d.count));
  return (
    <div>
      <div className="font-mono text-[10px] tracking-[0.12em] uppercase text-faint mb-3">
        data sources
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {DATASET_SOURCES.map((s) => (
          <div key={s.title} className="border border-line-strong bg-panel rounded-[12px] p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="w-[32px] h-[32px] rounded-[8px] flex items-center justify-center" style={{ background: s.iconBg }}>
                <span className="font-mono text-[12px]" style={{ color: s.accent }}>{s.glyph}</span>
              </div>
              <span
                className="font-mono text-[9px] tracking-[0.06em] uppercase px-[7px] py-[2px] rounded-[20px]"
                style={{ color: s.accent, border: `1px solid ${s.border}` }}
              >
                {s.tag}
              </span>
            </div>
            <div className="text-[14px] font-semibold mb-1 tracking-[-0.01em]">{s.title}</div>
            <div className="text-[12px] text-mute2 mb-3 leading-[1.4]">{s.sub}</div>
            <div className="font-mono text-[13px]" style={{ color: s.accent }}>{s.clips}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-[18px]">
        {/* class distribution */}
        <div className="border border-line-strong bg-panel rounded-[12px] p-[18px]">
          <div className="flex items-center justify-between mb-[18px]">
            <span className="font-mono text-[10px] tracking-[0.12em] uppercase text-faint">
              action class distribution
            </span>
            <span className="font-mono text-[10.5px] text-faint">566 segments · 150 clips · demo split</span>
          </div>
          <div className="flex flex-col gap-[13px]">
            {CLASS_DIST.map((c) => (
              <div key={c.label} className="flex items-center gap-3">
                <span className="w-[64px] text-[12.5px] text-[#cdd6e2] capitalize">{c.label}</span>
                <div className="flex-1 h-[18px] bg-deep rounded-[5px] overflow-hidden">
                  <div className="h-full rounded-[5px]" style={{ width: `${Math.round((c.count / distMax) * 100)}%`, background: c.color }} />
                </div>
                <span className="w-[46px] text-right font-mono text-[11.5px] text-muted">{c.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* failure cases */}
        <div className="border border-line-strong bg-panel rounded-[12px] p-[18px]">
          <div className="font-mono text-[10px] tracking-[0.12em] uppercase text-faint mb-4">
            failure cases &amp; robustness
          </div>
          <div className="flex flex-col gap-[10px]">
            {FAILURE_CASES.map((f) => (
              <div key={f.title} className="flex items-center gap-3 px-[13px] py-[11px] bg-deep border border-line-soft rounded-[9px]">
                <span className="w-[8px] h-[8px] rounded-full flex-none" style={{ background: f.sevColor }} />
                <div className="flex-1">
                  <div className="text-[13px] font-semibold">{f.title}</div>
                  <div className="text-[11.5px] text-faint">{f.note}</div>
                </div>
                <span className="font-mono text-[11px] whitespace-nowrap" style={{ color: f.sevColor }}>{f.rate}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
