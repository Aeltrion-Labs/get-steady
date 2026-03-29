import { Github } from "lucide-react";
import { GITHUB_URL, LICENSE_PATH } from "../constants";

export function OpenSource() {
  return (
    <section className="border-t border-border/50 px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-20">
          <div>
            <p className="mb-4 text-xs font-medium uppercase tracking-[0.22em] text-primary">
              Open source
            </p>
            <h2 className="font-display text-4xl leading-tight text-foreground md:text-5xl">
              Free forever.
              <br />
              Open by default.
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
              This project exists as a practical alternative for people who want ownership,
              simplicity, and a local-first workflow. No subscription required. Use it, inspect it,
              adapt it, and build on top of it under the MIT License.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-medium text-foreground transition hover:border-primary/40"
              >
                <Github className="h-4 w-4" />
                View the source on GitHub
              </a>
              <a
                href={LICENSE_PATH}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-full border border-border px-6 py-3 text-sm font-medium text-foreground transition hover:border-primary/40"
              >
                Read the license
              </a>
            </div>
          </div>

          <div className="space-y-4">
            {[
              [
                "Free and open source",
                "No subscription required, no pricing tier that gates core features.",
              ],
              [
                "Inspect the code",
                "The full source is on GitHub. Read it, fork it, verify what it does under the MIT License.",
              ],
              ["Portable by design", "Export your data in practical formats and take it anywhere."],
              [
                "Extensible for power users",
                "CLI, API, and MCP extensibility planned for technical audiences.",
              ],
            ].map(([title, body]) => (
              <div key={title} className="rounded-2xl border border-border bg-card/60 px-5 py-4">
                <p className="text-sm font-semibold text-foreground">{title}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
