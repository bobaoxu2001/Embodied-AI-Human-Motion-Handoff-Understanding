import { useCallback } from "react";

// useScrub — the single draggable-timeline primitive from HANDOFF.md §4.
// On pointerdown it maps clientX→fraction against the element's bounding rect,
// then tracks pointermove/up on `window`. `onSeek` receives a 0..1 fraction;
// callers convert it to a frame index (and pause playback).
export function useScrub(onSeek: (fraction: number) => void) {
  return useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      const track = e.currentTarget as HTMLElement;
      const rect = track.getBoundingClientRect();

      const apply = (clientX: number) => {
        let p = (clientX - rect.left) / rect.width;
        p = Math.max(0, Math.min(1, p));
        onSeek(p);
      };

      const clientXFromEvent = (
        ev: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent
      ): number => {
        const touches = (ev as TouchEvent).touches;
        if (touches && touches.length) return touches[0].clientX;
        return (ev as MouseEvent).clientX;
      };

      apply(clientXFromEvent(e));

      const move = (ev: MouseEvent | TouchEvent) => apply(clientXFromEvent(ev));
      const up = () => {
        window.removeEventListener("mousemove", move);
        window.removeEventListener("mouseup", up);
        window.removeEventListener("touchmove", move);
        window.removeEventListener("touchend", up);
      };

      window.addEventListener("mousemove", move);
      window.addEventListener("mouseup", up);
      window.addEventListener("touchmove", move, { passive: true });
      window.addEventListener("touchend", up);
    },
    [onSeek]
  );
}
