import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { TOTAL_FRAMES } from "../data/demo";

// Shared transport + camera state for the whole workspace. The prototype keeps
// `frame`, `playing`, `az`, `el` in one component; here we lift them into a
// context so the TopBar timecode and every page derive from the same frame.

interface PlaybackState {
  frame: number;
  playing: boolean;
  az: number;
  el: number;
  setFrame: (f: number) => void;
  seekTo: (f: number) => void; // sets frame AND pauses (used by scrubbers)
  togglePlay: () => void;
  setCamera: (az: number, el: number) => void;
}

const Ctx = createContext<PlaybackState | null>(null);

export function PlaybackProvider({ children }: { children: ReactNode }) {
  const [frame, setFrameState] = useState(96);
  const [playing, setPlaying] = useState(true);
  const [az, setAz] = useState(35);
  const [el, setEl] = useState(18);

  const playingRef = useRef(playing);
  playingRef.current = playing;

  // Frame ticker — mirrors the prototype's 90ms setInterval. In production this
  // would bind to <video>.currentTime or a WebSocket frame index instead.
  useEffect(() => {
    const id = window.setInterval(() => {
      if (playingRef.current) {
        setFrameState((f) => (f + 1) % TOTAL_FRAMES);
      }
    }, 90);
    return () => window.clearInterval(id);
  }, []);

  const setFrame = (f: number) =>
    setFrameState(Math.max(0, Math.min(TOTAL_FRAMES - 1, Math.round(f))));

  const seekTo = (f: number) => {
    setPlaying(false);
    setFrame(f);
  };

  const togglePlay = () => setPlaying((p) => !p);
  const setCamera = (a: number, e: number) => {
    setAz(a);
    setEl(e);
  };

  return (
    <Ctx.Provider
      value={{ frame, playing, az, el, setFrame, seekTo, togglePlay, setCamera }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function usePlayback(): PlaybackState {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePlayback must be used within PlaybackProvider");
  return v;
}
