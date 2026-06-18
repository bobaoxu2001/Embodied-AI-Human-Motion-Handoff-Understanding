import { NavLink, useNavigate } from "react-router-dom";
import { Logo } from "./Logo";

interface NavItem {
  to: string;
  label: string;
  icon: (color: string) => JSX.Element;
}

const ICONS: Record<string, (c: string) => JSX.Element> = {
  video: (c) => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M10 9l5 3-5 3z" fill={c} stroke="none" />
    </svg>
  ),
  pose: (c) => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8">
      <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" />
      <path d="M12 3v18M4 7.5l8 4.5 8-4.5" />
    </svg>
  ),
  inspector: (c) => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  ),
  dataset: (c) => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8">
      <ellipse cx="12" cy="6" rx="8" ry="3" />
      <path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
    </svg>
  ),
  handoff: (c) => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 18l6-6-6-6M8 6l-6 6 6 6" />
    </svg>
  ),
};

const WORKSPACE: NavItem[] = [
  { to: "/analyze", label: "Video analysis", icon: ICONS.video },
  { to: "/pose", label: "3D pose viewer", icon: ICONS.pose },
  { to: "/inspector", label: "Model inspector", icon: ICONS.inspector },
  { to: "/dataset", label: "Dataset & eval", icon: ICONS.dataset },
];

function Row({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        "relative flex items-center gap-[11px] px-3 py-[9px] rounded-lg cursor-pointer text-[13.5px] font-medium " +
        (isActive ? "text-ink bg-[#101824]" : "text-mute2 hover:text-ink hover:bg-[#0d141d]")
      }
    >
      {({ isActive }) => (
        <>
          <span
            className="absolute left-0 top-[7px] bottom-[7px] w-[2.5px] rounded-[2px] bg-signal"
            style={{ opacity: isActive ? 1 : 0 }}
          />
          {item.icon(isActive ? "#4d9fff" : "#5c6675")}
          {item.label}
        </>
      )}
    </NavLink>
  );
}

export function Sidebar() {
  const navigate = useNavigate();
  return (
    <aside className="w-[236px] flex-none bg-rail border-r border-line flex flex-col px-[14px] py-4">
      <div
        onClick={() => navigate("/")}
        className="flex items-center gap-[11px] px-2 pt-[6px] pb-4 cursor-pointer"
      >
        <Logo size={30} inner={17} />
        <div className="leading-[1.15] whitespace-nowrap">
          <div className="text-[13px] font-semibold">Handoff Perception</div>
          <div className="font-mono text-[9.5px] text-faint">v0.4.1 · gpu</div>
        </div>
      </div>

      <div className="font-mono text-[9.5px] tracking-[0.12em] text-faint2 px-[10px] pt-[6px] pb-2">
        WORKSPACE
      </div>
      <nav className="flex flex-col gap-[3px]">
        {WORKSPACE.map((it) => (
          <Row key={it.to} item={it} />
        ))}
        <div className="font-mono text-[9.5px] tracking-[0.12em] text-faint2 px-[10px] pt-[15px] pb-2">
          HANDOFF
        </div>
        <Row item={{ to: "/handoff", label: "Implementation handoff", icon: ICONS.handoff }} />
      </nav>

      <div className="mt-auto border-t border-line pt-3">
        <div className="bg-panel border border-line-mid rounded-[9px] px-3 py-[11px]">
          <div className="flex items-center gap-[7px] text-[11.5px] text-good mb-2">
            <span className="w-[6px] h-[6px] rounded-full bg-good animate-pulse" />
            inference online
          </div>
          <div className="flex justify-between font-mono text-[10.5px] text-faint">
            <span>gpu · cuda 12</span>
            <span className="text-muted">30 fps</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
