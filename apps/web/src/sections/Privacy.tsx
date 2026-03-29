import { Shield, WifiOff, Download } from "lucide-react";

const pillars = [
  {
    icon: Shield,
    title: "No required account",
    description:
      "The app works without creating an account, signing up for a service, or handing over your financial data.",
  },
  {
    icon: WifiOff,
    title: "Works offline",
    description:
      "Everything runs locally. There is no cloud dependency, no sync service, and no outage that affects your data.",
  },
  {
    icon: Download,
    title: "Export whenever you want",
    description:
      "Your entries and debt records export to CSV at any time. Your data is yours to move, archive, or delete.",
  },
];

export function Privacy() {
  return (
    <section className="px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-3xl border border-border/60 bg-card/40 px-8 py-16 md:px-14">
          <div className="mb-14 max-w-2xl">
            <p className="mb-4 text-xs font-medium uppercase tracking-[0.22em] text-primary">
              Private by default
            </p>
            <h2 className="font-display text-4xl leading-tight text-foreground md:text-5xl">
              Your data stays with you.
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
              The app stores data locally and is designed for portability from the start. No
              required cloud account. No lock-in. No need to hand over your financial life just to
              build a steadier routine.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            {pillars.map(({ icon: Icon, title, description }) => (
              <div key={title} className="space-y-3">
                <div className="inline-flex rounded-xl border border-border bg-muted p-2.5">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">{title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
