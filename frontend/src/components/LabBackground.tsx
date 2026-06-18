// Procedural stand-in for a decoded RGB frame. The prototype used an
// <image-slot> drop target; in the real app this is where a <video>/<canvas>
// element goes. Until a clip is decoded we render an abstract robotics-lab
// scene (floor + back wall + soft key light) so the overlays have context.
// If `src` is provided (an uploaded frame preview) we show that instead.
export function LabBackground({ src }: { src?: string | null }) {
  if (src) {
    return (
      <img
        src={src}
        alt="uploaded frame"
        className="absolute inset-0 w-full h-full object-cover opacity-90"
      />
    );
  }
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 50% at 62% 30%,#13202c,#0a0f15 60%,#070a0e),#070a0e",
        }}
      />
      {/* back-wall grid */}
      <div
        className="absolute inset-0 opacity-[0.5]"
        style={{
          backgroundImage:
            "linear-gradient(#ffffff08 1px,transparent 1px),linear-gradient(90deg,#ffffff08 1px,transparent 1px)",
          backgroundSize: "38px 38px",
          maskImage: "linear-gradient(180deg,#000 0%,#0006 55%,transparent 72%)",
          WebkitMaskImage:
            "linear-gradient(180deg,#000 0%,#0006 55%,transparent 72%)",
        }}
      />
      {/* table surface */}
      <div
        className="absolute left-0 right-0 bottom-0 h-[34%]"
        style={{
          background:
            "linear-gradient(180deg,#0c131b,#0a0f16 40%,#080c12)",
          borderTop: "1px solid #14202c",
          boxShadow: "0 -1px 0 #1c2c4422",
        }}
      />
      {/* soft key light */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(40% 38% at 58% 28%,#4d9fff14,transparent 70%)",
        }}
      />
    </div>
  );
}
