import {
  ANIM_NOTES,
  ASSET_NOTES,
  BACKEND_NOTES,
  COMPONENT_GROUPS,
  ENDPOINTS,
  FRONTEND_NOTES,
  JSON_SAMPLE,
  ROUTES_INFO,
  STACK,
  STATE_VARS,
} from "../data/demo";

function NoteList({ notes, accent }: { notes: string[]; accent: string }) {
  return (
    <div className="flex flex-col gap-[11px]">
      {notes.map((n, i) => (
        <div key={i} className="flex gap-[9px] text-[12.5px] text-muted leading-[1.45]">
          <span className="flex-none" style={{ color: accent }}>▸</span>
          <span>{n}</span>
        </div>
      ))}
    </div>
  );
}

export function Handoff() {
  return (
    <div>
      <div className="flex items-center gap-[14px] border border-line-accent rounded-[12px] px-[18px] py-4 mb-5" style={{ background: "linear-gradient(90deg,#0a111c,#0b140f)" }}>
        <div className="w-[38px] h-[38px] rounded-[9px] bg-[#0e1826] border border-line-accent flex items-center justify-center flex-none">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4d9fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 18l6-6-6-6M8 6l-6 6 6 6" />
          </svg>
        </div>
        <div className="flex-1">
          <div className="text-[15px] font-semibold">Conversion target — React + FastAPI + PyTorch</div>
          <div className="text-[12.5px] text-mute2 mt-[2px]">
            Build the frontend and demo-mode backend first; drop in real PyTorch models
            behind the same API. Everything below maps this prototype onto that service.
          </div>
        </div>
      </div>

      {/* stack chips */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-[18px]">
        {STACK.map((t) => (
          <div key={t.k} className="border border-line-strong bg-panel rounded-[11px] px-[14px] py-[13px]">
            <div className="font-mono text-[9.5px] tracking-[0.1em] uppercase mb-[7px]" style={{ color: t.color }}>{t.k}</div>
            <div className="text-[13px] font-semibold text-ink">{t.v}</div>
          </div>
        ))}
      </div>

      {/* component list + routes + state */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-[18px] mb-[18px]">
        <div className="border border-line-strong bg-panel rounded-[12px] p-[18px]">
          <div className="font-mono text-[10px] tracking-[0.12em] uppercase text-faint mb-[15px]">component list</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-[15px]">
            {COMPONENT_GROUPS.map((g) => (
              <div key={g.group}>
                <div className="text-[12px] font-semibold text-[#cdd6e2] mb-2">{g.group}</div>
                <div className="flex flex-wrap gap-[5px]">
                  {g.items.map((it) => (
                    <span key={it} className="font-mono text-[10.5px] text-muted bg-[#0e131a] border border-[#1a222e] px-[7px] py-[3px] rounded-[5px]">
                      {it}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-[18px]">
          <div className="border border-line-strong bg-panel rounded-[12px] p-[18px]">
            <div className="font-mono text-[10px] tracking-[0.12em] uppercase text-faint mb-[13px]">page routes</div>
            <div className="flex flex-col gap-[9px]">
              {ROUTES_INFO.map((r) => (
                <div key={r.path} className="flex items-baseline gap-[10px]">
                  <span className="font-mono text-[11.5px] text-signal min-w-[78px]">{r.path}</span>
                  <span className="text-[12.5px] text-[#cdd6e2] min-w-[108px]">{r.comp}</span>
                  <span className="text-[11.5px] text-faint">{r.note}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="border border-line-strong bg-panel rounded-[12px] p-[18px]">
            <div className="font-mono text-[10px] tracking-[0.12em] uppercase text-faint mb-[13px]">state variables</div>
            <div className="flex flex-col gap-[9px]">
              {STATE_VARS.map((v) => (
                <div key={v.name} className="flex items-baseline gap-[10px]">
                  <span className="font-mono text-[11.5px] text-good min-w-[74px]">{v.name}</span>
                  <span className="font-mono text-[11px] text-action min-w-[128px]">{v.type}</span>
                  <span className="text-[11.5px] text-faint">{v.note}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* endpoints */}
      <div className="border border-line-strong bg-panel rounded-[12px] p-[18px] mb-[18px]">
        <div className="font-mono text-[10px] tracking-[0.12em] uppercase text-faint mb-[14px]">api endpoint assumptions</div>
        <div className="flex flex-col gap-2">
          {ENDPOINTS.map((e) => (
            <div key={e.path} className="flex items-center gap-3 px-3 py-[9px] bg-deep border border-line-soft rounded-[8px]">
              <span className="font-mono text-[10.5px] font-semibold min-w-[38px]" style={{ color: e.mColor }}>{e.m}</span>
              <span className="font-mono text-[12px] text-ink min-w-[286px]">{e.path}</span>
              <span className="text-[11.5px] text-faint">{e.note}</span>
            </div>
          ))}
        </div>
      </div>

      {/* json sample + asset/anim notes */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.25fr_1fr] gap-[18px]">
        <div className="border border-line-strong bg-deep rounded-[12px] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-[11px] border-b border-line bg-panel">
            <span className="font-mono text-[10.5px] text-muted">GET /api/analysis/clp_7f3a/frames/142</span>
            <span className="font-mono text-[10px] text-good">200 · application/json</span>
          </div>
          <pre className="m-0 px-[18px] py-4 font-mono text-[11.5px] leading-[1.62] text-[#aeb9c7] whitespace-pre overflow-x-auto">
            {JSON_SAMPLE}
          </pre>
        </div>
        <div className="flex flex-col gap-[18px]">
          <div className="border border-line-strong bg-panel rounded-[12px] p-[18px]">
            <div className="font-mono text-[10px] tracking-[0.12em] uppercase text-faint mb-[13px]">asset / image-slot notes</div>
            <NoteList notes={ASSET_NOTES} accent="#4d9fff" />
          </div>
          <div className="border border-line-green bg-[#0b140f] rounded-[12px] p-[18px]">
            <div className="font-mono text-[10px] tracking-[0.12em] uppercase text-good mb-[13px]">animation &amp; interaction behavior</div>
            <NoteList notes={ANIM_NOTES} accent="#3ddc97" />
          </div>
        </div>
      </div>

      {/* frontend / backend notes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[18px] mt-[18px]">
        <div className="border border-line-accent bg-[#0a111c] rounded-[12px] p-[18px]">
          <div className="font-mono text-[10px] tracking-[0.12em] uppercase text-signal mb-[13px]">frontend implementation notes</div>
          <NoteList notes={FRONTEND_NOTES} accent="#4d9fff" />
        </div>
        <div className="border border-line-green bg-[#0b140f] rounded-[12px] p-[18px]">
          <div className="font-mono text-[10px] tracking-[0.12em] uppercase text-good mb-[13px]">backend implementation notes</div>
          <NoteList notes={BACKEND_NOTES} accent="#3ddc97" />
        </div>
      </div>
    </div>
  );
}
