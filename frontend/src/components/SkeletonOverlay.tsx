import type { Derived } from "../lib/demoEngine";

// The CV overlay for the video-analysis panel: 17-joint COCO skeleton (static
// torso/legs + dynamic right arm), 21-keypoint right hand, object bbox, and the
// predicted hand trajectory. Drawn in a normalized 640×400 viewBox that scales
// with the video container (HANDOFF.md §8). The right arm / hand / object /
// forecast are driven by the per-frame `derive()` output.
export function SkeletonOverlay({ d }: { d: Derived }) {
  const { pose } = d;
  return (
    <svg
      viewBox="0 0 640 400"
      preserveAspectRatio="xMidYMid meet"
      className="absolute inset-0 w-full h-full pointer-events-none"
    >
      <g transform={pose.bodyT}>
        {/* bones */}
        <g stroke="#4d9fff" strokeWidth="2.4" strokeLinecap="round" opacity="0.92">
          <line x1="250" y1="96" x2="252" y2="128" />
          <line x1="216" y1="138" x2="288" y2="134" />
          <line x1="252" y1="128" x2="216" y2="138" />
          <line x1="252" y1="128" x2="288" y2="134" />
          <line x1="216" y1="138" x2="200" y2="196" />
          <line x1="200" y1="196" x2="196" y2="250" />
          <line x1="252" y1="128" x2="254" y2="232" />
          <line x1="234" y1="234" x2="278" y2="230" />
          <line x1="254" y1="232" x2="234" y2="234" />
          <line x1="254" y1="232" x2="278" y2="230" />
          <line x1="234" y1="234" x2="228" y2="310" />
          <line x1="228" y1="310" x2="224" y2="380" />
          <line x1="278" y1="230" x2="282" y2="308" />
          <line x1="282" y1="308" x2="288" y2="376" />
          {/* dynamic right arm */}
          <line x1="288" y1="134" x2={pose.relbow.x} y2={pose.relbow.y} />
          <line x1={pose.relbow.x} y1={pose.relbow.y} x2={pose.rwrist.x} y2={pose.rwrist.y} />
        </g>
        {/* joints */}
        <g fill="#7fbfff" stroke="#0a0d12" strokeWidth="1">
          {[
            [252, 128], [216, 138], [288, 134], [200, 196], [196, 250],
            [254, 232], [234, 234], [278, 230], [228, 310], [224, 380],
            [282, 308], [288, 376],
          ].map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy} r="3.4" />
          ))}
          <circle cx={pose.relbow.x} cy={pose.relbow.y} r="3.4" />
        </g>
        <circle cx="250" cy="86" r="13" fill="none" stroke="#4d9fff" strokeWidth="2.2" />

        {/* active wrist */}
        <circle cx={pose.rwrist.x} cy={pose.rwrist.y} r="8" fill="none" stroke="#3ddc97" strokeWidth="2" className="animate-pulse-fast" />
        <circle cx={pose.rwrist.x} cy={pose.rwrist.y} r="3.6" fill="#3ddc97" />

        {/* hand landmarks */}
        <g fill="#c98bff" transform={`translate(${pose.rwrist.x} ${pose.rwrist.y})`}>
          <circle cx="16" cy="-12" r="2" />
          <circle cx="26" cy="-8" r="2" />
          <circle cx="30" cy="1" r="2" />
          <circle cx="27" cy="11" r="2" />
          <circle cx="18" cy="16" r="2" />
        </g>
        <g stroke="#c98bff" strokeWidth="1.2" opacity="0.7" transform={`translate(${pose.rwrist.x} ${pose.rwrist.y})`}>
          <line x1="0" y1="0" x2="16" y2="-12" />
          <line x1="0" y1="0" x2="26" y2="-8" />
          <line x1="0" y1="0" x2="30" y2="1" />
          <line x1="0" y1="0" x2="27" y2="11" />
          <line x1="0" y1="0" x2="18" y2="16" />
        </g>

        {/* object bbox */}
        <g transform={`translate(${pose.obj.x} ${pose.obj.y})`}>
          <rect x="0" y="0" width="62" height="66" rx="2" fill="none" stroke="#ff8a3d" strokeWidth="1.8" strokeDasharray="5 4" />
          <text x="0" y="-6" fontFamily="JetBrains Mono" fontSize="11" fill="#ff8a3d">
            cup 0.97
          </text>
        </g>

        {/* predicted trajectory */}
        <path d={pose.traj} fill="none" stroke="#3ddc97" strokeWidth="2.4" strokeDasharray="6 7" strokeLinecap="round" className="traj-flow" />
        <g transform={`translate(${pose.future.x} ${pose.future.y})`}>
          <circle r="6" fill="none" stroke="#3ddc97" strokeWidth="2" />
          <line x1="-8" y1="0" x2="8" y2="0" stroke="#3ddc97" strokeWidth="1.4" />
          <line x1="0" y1="-8" x2="0" y2="8" stroke="#3ddc97" strokeWidth="1.4" />
        </g>
      </g>
    </svg>
  );
}
