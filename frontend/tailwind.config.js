/** @type {import('tailwindcss').Config} */
// Design tokens transcribed from the Claude Design handoff (HANDOFF.md §10 /
// README "Design Tokens"). These are the single source of truth for the dark
// robotics-lab aesthetic.
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#070a0e",
        panel: "#0b0f15",
        deep: "#0a0d12",
        rail: "#080b0f",
        line: {
          DEFAULT: "#141a23",
          soft: "#161f2a",
          mid: "#18222e",
          strong: "#1c2533",
          accent: "#1c2c44",
          green: "#1c4533",
          purple: "#2a2348",
        },
        ink: "#e8ecf2",
        muted: "#9aa4b2",
        mute2: "#8a93a3",
        faint: "#5c6675",
        faint2: "#404a59",
        signal: "#4d9fff",
        good: "#3ddc97",
        action: "#9b7cff",
        hand: "#c98bff",
        warn: "#ff8a3d",
        bad: "#ff5a4d",
        rec: "#ff4d4d",
      },
      fontFamily: {
        sans: ["'Space Grotesk'", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      keyframes: {
        "ehp-dash": { to: { strokeDashoffset: "-220" } },
        "ehp-pulse": { "0%,100%": { opacity: "0.45" }, "50%": { opacity: "1" } },
        "ehp-blink": { "0%,100%": { opacity: "1" }, "50%": { opacity: "0.25" } },
        "ehp-glow": {
          "0%,100%": { boxShadow: "0 0 0 0 #3ddc9700" },
          "50%": { boxShadow: "0 0 22px 0 #3ddc9733" },
        },
        "ehp-scan": {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(900%)" },
        },
      },
      animation: {
        dash: "ehp-dash 3s linear infinite",
        pulse: "ehp-pulse 1.6s ease-in-out infinite",
        "pulse-fast": "ehp-pulse 1.3s infinite",
        blink: "ehp-blink 1.4s infinite",
        glow: "ehp-glow 2.6s ease-in-out infinite",
        scan: "ehp-scan 4.5s linear infinite",
      },
    },
  },
  plugins: [],
};
