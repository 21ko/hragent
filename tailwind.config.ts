import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#14201A",
        accent: "#0E8F57",
        "accent-dark": "#0B7A4A",
        "accent-hover": "#0B7A4A",
        "accent-tint": "#E9F4EE",
        muted: "#65726B",
        line: "#E6E6DF",
        paper: "#FAFAF7",
        surface: "#FFFFFF",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        card: "0 1px 3px rgba(20,32,26,0.08)",
        intake: "0 12px 40px -12px rgba(20,32,26,0.18)",
      },
    },
  },
  plugins: [],
};

export default config;
