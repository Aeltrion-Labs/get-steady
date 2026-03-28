import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#f5f1e8",
        foreground: "#1b1f18",
        card: "#fffaf0",
        border: "#d9cfbd",
        muted: "#efe7d7",
        "muted-foreground": "#6e675d",
        accent: "#d8e7c2",
        primary: "#345c45",
        destructive: "#8f3a2f",
      },
      fontFamily: {
        sans: ["'IBM Plex Sans'", "system-ui", "sans-serif"],
        display: ["'Fraunces'", "Georgia", "serif"],
      },
      boxShadow: {
        card: "0 18px 40px rgba(52, 92, 69, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
