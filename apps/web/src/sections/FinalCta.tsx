import { Github } from "lucide-react";
import { GITHUB_URL } from "../constants";

export function FinalCta() {
  return (
    <section id="download" className="border-t border-border/50 px-6 py-24">
      <div className="mx-auto max-w-3xl text-center">
        <p className="mb-4 text-xs font-medium uppercase tracking-[0.22em] text-primary">
          Get started
        </p>
        <h2 className="font-display text-4xl leading-tight text-foreground md:text-5xl">
          Start with one honest check-in.
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
          Download the app, log today, and start getting steady with your money. Free, local, and
          open source from day one.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <a
            href={GITHUB_URL + "/releases"}
            target="_blank"
            rel="noopener noreferrer"
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

        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <span>Private by default</span>
          <span aria-hidden="true" className="hidden sm:inline">
            ·
          </span>
          <span>No required account</span>
          <span aria-hidden="true" className="hidden sm:inline">
            ·
          </span>
          <span>Built for consistency, not perfection</span>
        </div>
      </div>
    </section>
  );
}
