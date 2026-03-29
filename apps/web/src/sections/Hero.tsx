import { Github } from "lucide-react";
import { GITHUB_URL } from "../constants";

const BASE = import.meta.env.BASE_URL;

export function Hero() {
  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 pb-20 pt-32 text-center">
      {/* ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-96 w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-4xl">
        <p className="mb-5 text-xs font-medium uppercase tracking-[0.22em] text-primary">
          Daily money habit
        </p>

        <h1 className="font-display text-5xl leading-[1.1] text-foreground md:text-6xl lg:text-7xl">
          Get steady with<br className="hidden sm:block" /> your money.
        </h1>

        <p className="mx-auto mt-7 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
          A free, open source desktop app for tracking money in, money out, and
          debt through a simple daily check-in.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <a
            href="#download"
            className="w-full rounded-full bg-primary px-8 py-3.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 sm:w-auto"
          >
            Download for desktop
          </a>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-full border border-border px-8 py-3.5 text-sm font-medium text-foreground transition hover:border-primary/40 sm:w-auto"
          >
            <Github className="h-4 w-4" />
            View on GitHub
          </a>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <span>Free and open source</span>
          <span aria-hidden="true" className="hidden sm:inline">·</span>
          <span>No required account</span>
          <span aria-hidden="true" className="hidden sm:inline">·</span>
          <span>Your data, your device</span>
        </div>

        <div className="mt-16 overflow-hidden rounded-2xl border border-border/60 shadow-[0_32px_80px_rgba(0,0,0,0.6)]">
          <img
            src={`${BASE}screenshot.png`}
            alt="Get Steady desktop app showing the Today screen with daily check-in, cashflow summary, and catch-up prompts"
            className="w-full"
            width={1280}
            height={832}
          />
        </div>
      </div>
    </section>
  );
}
