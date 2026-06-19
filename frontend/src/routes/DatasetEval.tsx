import {
  CAPTURE_PROTOCOL,
  CLASS_DIST,
  DATASET_SOURCES,
  FAILURE_CASES,
  PUBLIC_DATASETS,
  SPLIT_INFO,
} from "../data/demo";
import { ReadinessPanel } from "../components/ReadinessPanel";

export function DatasetEval() {
  const distMax = Math.max(...CLASS_DIST.map((d) => d.count));
  return (
    <div>
      <div className="mb-6">
        <ReadinessPanel />
      </div>

      {/* public dataset route — no self-recording required */}
      <div className="mb-6 border border-line-accent bg-[#0a111c] rounded-[12px] p-[18px]">
        <div className="flex items-center justify-between mb-1">
          <span className="font-mono text-[10px] tracking-[0.12em] uppercase text-signal">
            public dataset route — no self-recording required
          </span>
          <span className="font-mono text-[10px] text-faint">adapters · backend/datasets/</span>
        </div>
        <div className="text-[11.5px] text-faint mb-[14px]">
          Train on official public datasets instead of recording. Each is downloaded
          manually under its own license; this repo never redistributes raw data.
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[10px]">
          {PUBLIC_DATASETS.map((d) => (
            <div key={d.name} className="border border-line-strong bg-deep rounded-[10px] px-[13px] py-[11px]">
              <div className="text-[13px] font-semibold" style={{ color: d.accent }}>{d.name}</div>
              <div className="text-[11.5px] text-mute2 mb-2 leading-[1.4]">{d.role}</div>
              <div className="flex flex-wrap gap-[5px]">
                {d.tags.map((t) => (
                  <span key={t} className="font-mono text-[9px] px-[6px] py-[2px] rounded-[4px] text-faint border border-line-soft bg-[#0b0f15]">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-[12px] font-mono text-[10px] text-faint2">
          prepare: <span className="text-faint">python scripts/prepare_public_dataset.py --dataset hoh --root data/external/hoh --out data/manifests/hoh_manifest.csv --dry-run</span> · see docs/PUBLIC_DATASET_ADAPTERS.md
        </div>
      </div>

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

      {/* capture protocol + split */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-[18px] mb-[18px]">
        <div className="border border-line-strong bg-panel rounded-[12px] p-[18px]">
          <div className="font-mono text-[10px] tracking-[0.12em] uppercase text-faint mb-[14px]">
            capture protocol · self-recorded set
          </div>
          <div className="flex flex-col gap-[11px]">
            {CAPTURE_PROTOCOL.map((p) => (
              <div key={p.k} className="grid grid-cols-[78px_1fr] gap-3 items-baseline">
                <span className="font-mono text-[11px] text-faint2">{p.k}</span>
                <span className="text-[12.5px] text-[#cdd6e2] leading-[1.4]">{p.v}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="border border-line-strong bg-panel rounded-[12px] p-[18px]">
          <div className="font-mono text-[10px] tracking-[0.12em] uppercase text-faint mb-[6px]">
            split · by subject
          </div>
          <div className="text-[11.5px] text-faint mb-[16px] leading-[1.45]">
            grouped per person to avoid identity leakage
          </div>
          <div className="flex h-[14px] rounded-[5px] overflow-hidden mb-4">
            {SPLIT_INFO.map((s) => (
              <div key={s.label} style={{ width: `${s.pct}%`, background: s.color }} />
            ))}
          </div>
          <div className="flex flex-col gap-[10px]">
            {SPLIT_INFO.map((s) => (
              <div key={s.label} className="flex items-center gap-[9px]">
                <span className="w-[8px] h-[8px] rounded-[2px] flex-none" style={{ background: s.color }} />
                <span className="w-[42px] text-[12.5px] text-[#cdd6e2] capitalize">{s.label}</span>
                <span className="font-mono text-[11px] text-muted">{s.pct}%</span>
                <span className="font-mono text-[10.5px] text-faint ml-auto">{s.note}</span>
              </div>
            ))}
          </div>
        </div>
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
