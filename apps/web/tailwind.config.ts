import type { Config } from "tailwindcss";

const token = (name: string) => `hsl(var(${name}) / <alpha-value>)`;

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: token("--background"),
        foreground: token("--foreground"),
        card: token("--card"),
        "card-foreground": token("--card-foreground"),
        border: token("--border"),
        muted: token("--muted"),
        "muted-foreground": token("--muted-foreground"),
        accent: token("--accent"),
        "accent-foreground": token("--accent-foreground"),
        primary: token("--primary"),
        "primary-foreground": token("--primary-foreground"),
      },
      fontFamily: {
        sans: ["'IBM Plex Sans'", "system-ui", "sans-serif"],
        display: ["'Fraunces'", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;
