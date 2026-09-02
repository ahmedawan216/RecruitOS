import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Base surfaces
        bg: "var(--color-bg)",
        surface: "var(--color-surface)",
        "surface-2": "var(--color-surface-2)",

        // Borders
        border: "var(--color-border)",
        "border-strong": "var(--color-border-strong)",

        // Text
        ink: "var(--color-ink)",
        "ink-dim": "var(--color-ink-dim)",
        "ink-faint": "var(--color-ink-faint)",

        // Brand accent
        accent: "var(--color-accent)",
        "accent-dim": "var(--color-accent-dim)",
        "accent-soft": "var(--color-accent-soft)",

        // Status
        success: "var(--color-success)",
        danger: "var(--color-danger)",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        sans: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      maxWidth: {
        wrap: "1120px",
      },
      transitionTimingFunction: {
        "out-expo": "cubic-bezier(0.16,1,0.3,1)",
      },
      transitionDuration: {
        "250": "250ms",
        "400": "400ms",
      },
      boxShadow: {
        panel: "0 40px 80px -30px rgba(0,0,0,0.6)",
        lift: "0 8px 22px rgba(255,255,255,0.10)",
      },
    },
  },
  plugins: [],
};

export default config;
