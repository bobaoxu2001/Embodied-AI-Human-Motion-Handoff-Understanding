import { useScrub } from "../hooks/useScrub";

// Reusable draggable scrub track (HANDOFF.md §4). `pct` is 0..100; `onSeek`
// receives a 0..1 fraction. Used by the transport bar, the action timeline
// playhead container, and the 3D frame scrubber.
export function ScrubBar({
  pct,
  onSeek,
  trackH = 5,
  handleBorder = "#4d9fff",
}: {
  pct: number;
  onSeek: (fraction: number) => void;
  trackH?: number;
  handleBorder?: string;
}) {
  const start = useScrub(onSeek);
  return (
    <div
      onMouseDown={start}
      onTouchStart={start}
      className="flex-1 h-4 flex items-center relative cursor-pointer"
    >
      <div
        className="absolute left-0 right-0 rounded-[4px] bg-[#1a222e]"
        style={{ height: trackH }}
      />
      <div
        className="absolute left-0 rounded-[4px]"
        style={{
          height: trackH,
          width: `${pct}%`,
          background: "linear-gradient(90deg,#4d9fff,#3ddc97)",
        }}
      />
      <div
        className="absolute top-1/2 w-3 h-3 rounded-full bg-white"
        style={{
          left: `${pct}%`,
          transform: "translate(-50%,-50%)",
          border: `2px solid ${handleBorder}`,
        }}
      />
    </div>
  );
}
