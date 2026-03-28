import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#f7f9fb",
        foreground: "#202833",
        card: "#ffffff",
        border: "#d7dfe7",
        muted: "#edf2f6",
        "muted-foreground": "#5f6d7b",
        accent: "#e2f1f3",
        primary: "#2f7480",
        destructive: "#cf5747",
        success: "#3e8967",
        warning: "#d79a32",
      },
      fontFamily: {
        sans: ["'IBM Plex Sans'", "system-ui", "sans-serif"],
        display: ["'Fraunces'", "Georgia", "serif"],
      },
      boxShadow: {
        card: "0 18px 40px rgba(38, 60, 84, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
