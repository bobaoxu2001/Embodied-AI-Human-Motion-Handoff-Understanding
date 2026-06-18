// The handoff mark: a small node-graph glyph on a blue→green gradient tile.
export function Logo({ size = 34, inner = 20 }: { size?: number; inner?: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-[9px] flex-none"
      style={{
        width: size,
        height: size,
        background: "linear-gradient(135deg,#4d9fff,#3ddc97)",
      }}
    >
      <svg width={inner} height={inner} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="6" r="2.4" fill="#08110c" />
        <path
          d="M12 8.5v5M12 13.5l-5 4M12 13.5l5 4M7 11l5 1.5 5-1.5"
          stroke="#08110c"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
