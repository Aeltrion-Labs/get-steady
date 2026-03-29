import { Github } from "lucide-react";
import { GITHUB_URL } from "../constants";

export function Nav() {
  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <span className="font-display text-xl font-semibold text-foreground">Get Steady</span>
        <div className="flex items-center gap-3">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
          >
            <Github className="h-4 w-4" />
            GitHub
          </a>
          <a
            href="#download"
            className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            Download
          </a>
        </div>
      </div>
    </header>
  );
}
