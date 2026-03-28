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
        destructive: token("--destructive"),
        "destructive-foreground": token("--destructive-foreground"),
        success: token("--success"),
        "success-foreground": token("--success-foreground"),
        warning: token("--warning"),
        "warning-foreground": token("--warning-foreground"),
        "chart-income": token("--chart-income"),
        "chart-spending": token("--chart-spending"),
        "chart-debt-payment": token("--chart-debt-payment"),
        "chart-debt-outstanding": token("--chart-debt-outstanding"),
        "chart-comparison": token("--chart-comparison"),
      },
      fontFamily: {
        sans: ["'IBM Plex Sans'", "system-ui", "sans-serif"],
        display: ["'Fraunces'", "Georgia", "serif"],
      },
      boxShadow: {
        card: "var(--shadow-card)",
      },
    },
  },
  plugins: [],
};

export default config;
