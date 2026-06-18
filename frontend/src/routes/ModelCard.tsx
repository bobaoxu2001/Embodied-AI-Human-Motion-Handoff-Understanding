import { MODEL_CARD as C } from "../data/demo";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="font-mono text-[10px] tracking-[0.12em] uppercase text-faint mb-3">
        {title}
      </div>
      {children}
    </div>
  );
}

export function ModelCard() {
  return (
    <div className="flex flex-col gap-6 max-w-[1100px]">
      {/* header */}
      <div className="border border-line-strong bg-panel rounded-[13px] px-5 py-[18px]">
        <div className="flex items-center gap-[7px] font-mono text-[10.5px] text-faint mb-3">
          <span className="w-[6px] h-[6px] rounded-[2px] bg-warn" />
          demo-mode — architectures are real & trainable; metrics are MVP targets, not
          measured benchmarks
        </div>
        <h1 className="text-[22px] font-semibold tracking-[-0.01em] mb-2">
          Embodied Handoff Perception — Model Card
        </h1>
        <p className="text-[13.5px] text-muted leading-[1.55] max-w-[760px] m-0">
          {C.task}
        </p>
        <div className="flex flex-wrap gap-2 mt-[14px]">
          <a
            href={C.repo}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-[11px] px-[11px] py-[6px] rounded-md text-signal bg-[#0a111c] border border-line-accent hover:border-signal transition-colors"
          >
            ↗ GitHub repository
          </a>
          <a
            href={`${C.repo}/blob/main/${C.doc}`}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-[11px] px-[11px] py-[6px] rounded-md text-muted bg-deep border border-line-strong hover:text-ink hover:border-signal transition-colors"
          >
            {C.doc}
          </a>
          <span className="font-mono text-[11px] px-[11px] py-[6px] rounded-md text-good bg-[#0c1812] border border-line-green">
            License · {C.license}
          </span>
        </div>
      </div>

      {/* per-model cards */}
      <Section title="learned models">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {C.models.map((m) => (
            <div
              key={m.name}
              className="rounded-[12px] px-[15px] py-[15px] flex flex-col"
              style={{ border: `1px solid ${m.border}`, background: m.bg }}
            >
              <div className="flex items-center justify-between mb-[10px]">
                <span className="font-mono text-[11px]" style={{ color: m.accent }}>
                  {m.stage} · {m.name}
                </span>
                <span
                  className="font-mono text-[9.5px] px-[7px] py-[2px] rounded-[20px]"
                  style={{ color: m.accent, border: `1px solid ${m.border}` }}
                >
                  {m.params}
                </span>
              </div>
              <div className="text-[13.5px] text-ink mb-[10px] leading-[1.4]">{m.type}</div>
              <dl className="grid grid-cols-[58px_1fr] gap-x-3 gap-y-[6px] font-mono text-[11px] text-faint border-t border-line pt-[10px]">
                <dt className="text-faint2">in</dt>
                <dd className="text-muted m-0">{m.input}</dd>
                <dt className="text-faint2">out</dt>
                <dd className="text-muted m-0">{m.output}</dd>
                <dt className="text-faint2">config</dt>
                <dd className="text-muted m-0">{m.config}</dd>
                <dt className="text-faint2">loss</dt>
                <dd className="text-muted m-0">{m.loss}</dd>
                <dt className="text-faint2">metric</dt>
                <dd className="m-0" style={{ color: m.accent }}>
                  {m.metric}
                </dd>
              </dl>
            </div>
          ))}
        </div>
      </Section>

      {/* training */}
      <Section title="training · intended configuration">
        <div className="border border-line-strong bg-panel rounded-[12px] p-[18px] grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-[11px]">
          {C.training.map((t) => (
            <div key={t.k} className="flex justify-between gap-3 text-[12.5px]">
              <span className="text-[#cdd6e2]">{t.k}</span>
              <span className="font-mono text-muted text-right">{t.v}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* data + use, two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section title="data">
          <ul className="border border-line-strong bg-panel rounded-[12px] p-[18px] flex flex-col gap-[10px] m-0 list-none">
            {C.data.map((d, i) => (
              <li key={i} className="flex gap-[9px] text-[12.5px] text-muted leading-[1.45]">
                <span className="text-signal flex-none">·</span>
                {d}
              </li>
            ))}
          </ul>
        </Section>

        <div className="flex flex-col gap-6">
          <Section title="intended use">
            <ul className="border border-line-green bg-[#0b140f] rounded-[12px] p-[16px] flex flex-col gap-[9px] m-0 list-none">
              {C.intendedUse.map((d, i) => (
                <li key={i} className="flex gap-[9px] text-[12.5px] text-muted leading-[1.45]">
                  <span className="text-good flex-none">✓</span>
                  {d}
                </li>
              ))}
            </ul>
          </Section>
          <Section title="out of scope">
            <ul className="border border-[#3a1414] bg-[#160b0b] rounded-[12px] p-[16px] flex flex-col gap-[9px] m-0 list-none">
              {C.outOfScope.map((d, i) => (
                <li key={i} className="flex gap-[9px] text-[12.5px] text-muted leading-[1.45]">
                  <span className="text-[#ff5a4d] flex-none">✕</span>
                  {d}
                </li>
              ))}
            </ul>
          </Section>
        </div>
      </div>

      {/* limitations */}
      <Section title="limitations & failure modes">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-[10px]">
          {C.limitations.map((l) => (
            <div
              key={l.mode}
              className="flex items-start gap-3 px-[13px] py-[11px] bg-deep border border-line-soft rounded-[9px]"
            >
              <span className="w-[7px] h-[7px] rounded-full bg-warn flex-none mt-[5px]" />
              <div>
                <div className="text-[13px] font-semibold">{l.mode}</div>
                <div className="text-[11.5px] text-faint">{l.effect}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 font-mono text-[10.5px] text-faint2 leading-[1.5]">
          Fairness: the MVP set is small and not demographically balanced — treat all
          metrics as targets and re-measure on a representative, consented dataset before
          any real use.
        </div>
      </Section>
    </div>
  );
}
