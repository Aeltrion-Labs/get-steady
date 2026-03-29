import {
  CalendarCheck,
  ArrowLeftRight,
  TrendingDown,
  RotateCcw,
  HardDrive,
  Tags,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const features: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: CalendarCheck,
    title: "Daily check-ins",
    description:
      "A focused home screen built around today, so staying current feels manageable rather than burdensome.",
  },
  {
    icon: ArrowLeftRight,
    title: "Money in and money out",
    description:
      "See what came in, what went out, and how the month is shaping up without hunting through reports.",
  },
  {
    icon: TrendingDown,
    title: "Debt progress",
    description:
      "Track balances, log payments, and keep debt visible so cashflow decisions stay grounded in reality.",
  },
  {
    icon: Tags,
    title: "Category awareness",
    description:
      "See where money is going so spending habits are easier to confront and adjust over time.",
  },
  {
    icon: RotateCcw,
    title: "Catch-up flow",
    description:
      "Miss a few days? Pick back up where you left off without friction, guilt, or a broken streak.",
  },
  {
    icon: HardDrive,
    title: "Local-first storage",
    description:
      "Your data lives on your machine, works offline, and stays portable. Export it whenever you want.",
  },
];

export function Features() {
  return (
    <section className="border-t border-border/50 px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mb-14 text-center">
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.22em] text-primary">
            What it does
          </p>
          <h2 className="font-display text-4xl leading-tight text-foreground md:text-5xl">
            Built to help you steady spending,<br className="hidden lg:block" /> debt, and cashflow.
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="rounded-2xl border border-border bg-card/60 p-6 transition hover:border-primary/30 hover:bg-card/80"
            >
              <div className="mb-4 inline-flex rounded-xl border border-border bg-muted p-2.5">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="mb-2 text-base font-semibold text-foreground">{title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
