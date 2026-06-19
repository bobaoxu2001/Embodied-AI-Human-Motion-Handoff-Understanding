import type { LivePoseResult } from "../hooks/useLivePose";

// Draws REAL MediaPipe landmarks over the uploaded video. The SVG viewBox is the
// video's intrinsic size and uses the same xMidYMid-meet letterboxing as the
// video's object-contain, so landmarks align with the displayed frame.

// BlazePose (33) connections — torso + limbs (face omitted for a clean overlay).
const POSE_CONN: [number, number][] = [
  [11, 12], [11, 23], [12, 24], [23, 24], // torso
  [11, 13], [13, 15], // left arm
  [12, 14], [14, 16], // right arm
  [23, 25], [25, 27], [27, 31], // left leg
  [24, 26], [26, 28], [28, 32], // right leg
];

// 21-landmark hand connections.
const HAND_CONN: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [0, 9], [9, 10], [10, 11], [11, 12],
  [0, 13], [13, 14], [14, 15], [15, 16],
  [0, 17], [17, 18], [18, 19], [19, 20],
  [5, 9], [9, 13], [13, 17],
];

export function LivePoseOverlay({ r }: { r: LivePoseResult }) {
  const W = r.videoW;
  const H = r.videoH;
  const px = (l: { x: number }) => l.x * W;
  const py = (l: { y: number }) => l.y * H;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      className="absolute inset-0 w-full h-full pointer-events-none"
    >
      {/* body skeleton */}
      <g stroke="#4d9fff" strokeWidth={Math.max(2, W * 0.0035)} strokeLinecap="round" opacity="0.9">
        {POSE_CONN.map(([a, b], i) => {
          const la = r.body[a];
          const lb = r.body[b];
          if (!la || !lb) return null;
          return <line key={i} x1={px(la)} y1={py(la)} x2={px(lb)} y2={py(lb)} />;
        })}
      </g>
      <g fill="#7fbfff">
        {r.body.slice(11).map((l, i) =>
          l ? <circle key={i} cx={px(l)} cy={py(l)} r={Math.max(2.5, W * 0.004)} /> : null
        )}
      </g>

      {/* hands */}
      {r.hands.map((hand, hi) => (
        <g key={hi}>
          <g stroke="#c98bff" strokeWidth={Math.max(1.5, W * 0.0025)} opacity="0.85">
            {HAND_CONN.map(([a, b], i) => {
              const la = hand[a];
              const lb = hand[b];
              if (!la || !lb) return null;
              return <line key={i} x1={px(la)} y1={py(la)} x2={px(lb)} y2={py(lb)} />;
            })}
          </g>
          <g fill="#c98bff">
            {hand.map((l, i) => (
              <circle key={i} cx={px(l)} cy={py(l)} r={Math.max(2, W * 0.003)} />
            ))}
          </g>
        </g>
      ))}
    </svg>
  );
}
