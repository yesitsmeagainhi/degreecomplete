import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: "#1B2A4A", 800: "#0F1D36", 700: "#253A5E", 100: "#E2E8F0", 50: "#F0F4F8" },
        blue: { DEFAULT: "#0063fc", 700: "#0059e3", 600: "#0059e3", 100: "#E0F4FD", 50: "#F0F9FF" },
        gold: { DEFAULT: "#F7941D", 600: "#E8850F", 100: "#FEF0DB", 50: "#FFF8EE" },
        green: { DEFAULT: "#17805A", 700: "#126649", 100: "#E3F3EC" },
        ink: "#1B2A4A",
        mist: "#F0F9FF",
        line: "#E2E8F0",
      },
      fontFamily: {
        serif: ["Newsreader", "Georgia", "serif"],
        sans: ["Figtree", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
      borderRadius: { xl2: "1.25rem" },
      boxShadow: {
        card: "0 1px 3px rgba(27,42,74,.08), 0 8px 24px -8px rgba(27,42,74,.12)",
        "card-hover": "0 4px 12px rgba(27,42,74,.12), 0 16px 40px -12px rgba(27,42,74,.2)",
      },
      maxWidth: { prose: "68ch" },
    },
  },
  plugins: [],
};
export default config;
