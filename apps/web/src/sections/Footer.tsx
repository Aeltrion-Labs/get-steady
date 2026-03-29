import { Github } from "lucide-react";
import { GITHUB_URL, LICENSE_PATH } from "../constants";

export function Footer() {
  return (
    <footer className="border-t border-border/50 px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm text-muted-foreground sm:flex-row">
        <span className="font-display text-base font-semibold text-foreground">Get Steady</span>
        <div className="flex items-center gap-6">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 transition hover:text-foreground"
          >
            <Github className="h-4 w-4" />
            GitHub
          </a>
          <a href={LICENSE_PATH} target="_blank" rel="noopener noreferrer" className="transition hover:text-foreground">
            MIT License
          </a>
        </div>
        <span>© {new Date().getFullYear()} Get Steady</span>
      </div>
    </footer>
  );
}
