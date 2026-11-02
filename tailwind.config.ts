import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: "var(--dv-navy)",
        teal: "var(--dv-teal)",
        paper: "var(--dv-paper)",
        amber: "var(--dv-amber)",
        ink: "var(--dv-ink)",
      },
      fontFamily: {
        sans: ["var(--font-body)", "sans-serif"],
        serif: ["var(--font-display)", "serif"],
      },
      borderRadius: {
        dv: "var(--dv-radius)",
      },
      boxShadow: {
        dv: "var(--dv-shadow)",
      },
      minHeight: {
        touch: "44px",
      },
    },
  },
  plugins: [],
};

export default config;
