import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: "#080c0e",
          secondary: "#0d1117",
          card: "#111820",
          hover: "#161e28",
        },
        border: {
          dim: "#1c2432",
          DEFAULT: "#253044",
          bright: "#304060",
        },
        accent: {
          green: "#00d084",
          "green-dim": "#00a068",
          blue: "#58a6ff",
          red: "#f85149",
          yellow: "#d29922",
          purple: "#bc8cff",
          cyan: "#39c5cf",
        },
        text: {
          primary: "#e6edf3",
          secondary: "#8b949e",
          dim: "#484f58",
          green: "#3fb950",
          red: "#ff7b72",
          yellow: "#e3b341",
          blue: "#79c0ff",
        },
      },
      fontFamily: {
        mono: ["JetBrains Mono", "Fira Code", "Courier New", "monospace"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-in-out",
        "slide-up": "slideUp 0.3s ease-out",
        blink: "blink 1s step-end infinite",
        "pulse-green": "pulseGreen 2s infinite",
        scanline: "scanline 8s linear infinite",
      },
      keyframes: {
        fadeIn: { from: { opacity: "0" }, to: { opacity: "1" } },
        slideUp: {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        blink: { "0%, 100%": { opacity: "1" }, "50%": { opacity: "0" } },
        pulseGreen: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(0,208,132,0.2)" },
          "50%": { boxShadow: "0 0 0 8px rgba(0,208,132,0)" },
        },
        scanline: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100vh)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
