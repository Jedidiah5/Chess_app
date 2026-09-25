import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    screens: {
      xs: "400px",
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1536px",
    },
    extend: {
      colors: {
        paper: {
          page: "var(--paper-page)",
          deep: "var(--paper-page-deep)",
          light: "var(--paper-light)",
          dark: "var(--paper-dark)",
        },
        ink: {
          DEFAULT: "var(--ink)",
          muted: "var(--ink-muted)",
          faint: "var(--ink-faint)",
        },
      },
      fontFamily: {
        print: ["var(--font-print)"],
        "serif-title": ["var(--font-serif-title)"],
        cinzel: ["var(--font-display)"],
        "mono-plate": ["var(--font-mono-plate)"],
      },
      boxShadow: {
        warm: "0 10px 22px var(--shadow-warm)",
        "warm-soft": "0 6px 14px var(--shadow-warm-soft)",
      },
    },
  },
  plugins: [],
};

export default config;
