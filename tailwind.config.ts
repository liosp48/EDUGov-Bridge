import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        institution: {
          DEFAULT: "#0F4C81",
          dark: "#0A3560",
          light: "#1E6BA8",
        },
        faso: {
          green: "#009E49",
          red: "#EF2B2D",
          gold: "#FCD116",
        },
        surface: "#F6F8FB",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 3px 0 rgb(15 76 129 / 0.08), 0 4px 14px -4px rgb(15 76 129 / 0.12)",
      },
    },
  },
  plugins: [],
};
export default config;
