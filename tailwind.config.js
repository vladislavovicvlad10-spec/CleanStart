/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        app: "rgb(var(--c-bg) / <alpha-value>)",
        surface: {
          DEFAULT: "rgb(var(--c-surface) / <alpha-value>)",
          2: "rgb(var(--c-surface2) / <alpha-value>)",
          3: "rgb(var(--c-surface3) / <alpha-value>)",
        },
        ink: "rgb(var(--c-ink) / <alpha-value>)",
        muted: "rgb(var(--c-muted) / <alpha-value>)",
        edge: "rgb(var(--c-edge) / <alpha-value>)",
        accent: {
          DEFAULT: "rgb(var(--c-accent) / <alpha-value>)",
          strong: "rgb(var(--c-accent-strong) / <alpha-value>)",
        },
        violet: {
          DEFAULT: "rgb(var(--c-violet) / <alpha-value>)",
          strong: "rgb(var(--c-violet-strong) / <alpha-value>)",
        },
        success: "rgb(var(--c-success) / <alpha-value>)",
        warning: "rgb(var(--c-warning) / <alpha-value>)",
        danger: "rgb(var(--c-danger) / <alpha-value>)",
      },
      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,0.25), 0 8px 24px -12px rgba(0,0,0,0.35)",
        pop: "0 24px 64px -16px rgba(0,0,0,0.55)",
        glow: "0 0 0 1px rgb(var(--c-accent) / 0.25), 0 8px 32px -8px rgb(var(--c-accent) / 0.35)",
        "glow-accent":
          "0 12px 32px -12px rgb(var(--c-accent) / 0.35), 0 2px 8px rgba(0,0,0,0.3)",
        "glow-violet":
          "0 12px 32px -12px rgb(var(--c-violet) / 0.35), 0 2px 8px rgba(0,0,0,0.3)",
        "glow-warning":
          "0 12px 32px -12px rgb(var(--c-warning) / 0.3), 0 2px 8px rgba(0,0,0,0.3)",
        "glow-neutral":
          "0 12px 32px -12px rgb(var(--c-edge) / 0.3), 0 2px 8px rgba(0,0,0,0.3)",
      },
      borderRadius: {
        xl2: "14px",
      },
      fontFamily: {
        sans: [
          "Segoe UI Variable Text",
          "Segoe UI",
          "Inter",
          "system-ui",
          "sans-serif",
        ],
        mono: ["Cascadia Mono", "Consolas", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
