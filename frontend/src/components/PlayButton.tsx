import { usePlayback } from "../state/playback";

export function PlayButton({ size = 30 }: { size?: number }) {
  const { playing, togglePlay } = usePlayback();
  return (
    <span
      onClick={togglePlay}
      className="cursor-pointer rounded-[7px] bg-signal text-[#06121f] flex items-center justify-center text-[12px] flex-none select-none"
      style={{ width: size, height: size }}
    >
      {playing ? "❚❚" : "▶"}
    </span>
  );
}
