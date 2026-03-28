import { useMemo, useState } from "react";
import type { Category } from "@get-steady/core";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";

export type OnboardingSubmission = {
  dailyCheckInTime: string;
  remindersEnabled: boolean;
  selectedCategoryIds: string[];
};

const STEPS = [
  { id: "welcome", label: "Welcome" },
  { id: "habit", label: "Rhythm" },
  { id: "categories", label: "Categories" },
  { id: "finish", label: "Ready" },
] as const;

export function OnboardingFlow({
  categories,
  onComplete,
  onSkip,
}: {
  categories: Category[];
  onComplete: (input: OnboardingSubmission) => Promise<void> | void;
  onSkip: () => Promise<void> | void;
}) {
  const [step, setStep] = useState<(typeof STEPS)[number]["id"]>("welcome");
  const [dailyCheckInTime, setDailyCheckInTime] = useState("19:00");
  const [remindersEnabled] = useState(true);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);

  const selectableCategories = categories.filter((category) => category.type !== "both");
  const activeStepIndex = STEPS.findIndex((item) => item.id === step);
  const selectedLabels = useMemo(
    () => selectableCategories.filter((category) => selectedCategoryIds.includes(category.id)).map((category) => category.name),
    [selectableCategories, selectedCategoryIds],
  );

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center p-6">
      <div className="grid w-full gap-6 xl:grid-cols-[1.05fr,0.95fr]">
        <Card className="relative overflow-hidden border-primary/10 bg-slate-950 px-8 py-10 text-slate-50 shadow-[0_28px_60px_rgba(23,34,46,0.28)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(126,210,222,0.24),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(151,171,203,0.24),transparent_28%)]" />
          <div className="relative space-y-8">
            <Badge className="border-white/15 bg-white/10 text-slate-200">First run</Badge>
            <div className="space-y-4">
              <h1 className="max-w-md font-display text-5xl leading-[1.05] text-white">Own your money habit</h1>
              <p className="max-w-lg text-base leading-7 text-slate-200/88">
                Get Steady is a quiet local console for money awareness. The goal is not perfection. It is helping you
                face today, reduce debt pressure, and keep cashflow visible without a giant budgeting setup.
              </p>
            </div>

            <div className="grid gap-3">
              {[
                "Manual by design, so daily review feels intentional.",
                "Local-first, so your data stays on your machine.",
                "Recovery-friendly, so missed days never become shame loops.",
              ].map((item) => (
                <div key={item} className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-slate-100/88">
                  {item}
                </div>
              ))}
            </div>

            <div className="rounded-[26px] border border-white/10 bg-white/6 p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-300/85">What setup does</p>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <div>
                  <p className="text-sm text-slate-300">Daily rhythm</p>
                  <p className="mt-1 font-medium text-white">Choose a steady check-in time.</p>
                </div>
                <div>
                  <p className="text-sm text-slate-300">Starter context</p>
                  <p className="mt-1 font-medium text-white">Pick the categories you’ll likely touch first.</p>
                </div>
                <div>
                  <p className="text-sm text-slate-300">Fast landing</p>
                  <p className="mt-1 font-medium text-white">Drop into Today ready to log one meaningful entry.</p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="space-y-8 px-8 py-8">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Setup progress</p>
                <p className="mt-1 text-sm text-muted-foreground">Keep this quick. You can refine everything later.</p>
              </div>
              <span className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-primary">
                Step {activeStepIndex + 1} of {STEPS.length}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {STEPS.map((item, index) => {
                const active = index === activeStepIndex;
                const done = index < activeStepIndex;
                return (
                  <div key={item.id} className="space-y-2">
                    <div
                      className={`h-2 rounded-full transition ${
                        done ? "bg-primary" : active ? "bg-primary/55" : "bg-muted"
                      }`}
                    />
                    <p className={`text-xs ${active || done ? "text-foreground" : "text-muted-foreground"}`}>{item.label}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {step === "welcome" ? (
            <div className="space-y-6">
              <div className="space-y-3">
                <h2 className="font-display text-3xl text-foreground">Start simple</h2>
                <p className="text-sm leading-6 text-muted-foreground">
                  We’ll set a daily rhythm and a few starter categories. No bank links, no long questionnaire, no
                  pressure to get everything perfect before you begin.
                </p>
              </div>
              <div className="rounded-[24px] border border-border bg-muted/50 p-5">
                <p className="text-sm text-muted-foreground">
                  Best first outcome: leave setup with a time in mind and enough structure to log your first real day.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => setStep("habit")}>Start setup</Button>
                <Button variant="secondary" onClick={() => void onSkip()}>
                  Skip for now
                </Button>
              </div>
            </div>
          ) : null}

          {step === "habit" ? (
            <div className="space-y-6">
              <div className="space-y-3">
                <h2 className="font-display text-3xl text-foreground">Set your daily rhythm</h2>
                <p className="text-sm leading-6 text-muted-foreground">
                  Pick a time that feels realistic. Evening is a good default because the day’s money in and out is
                  already visible.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-[1fr,0.8fr]">
                <div className="space-y-2">
                  <Label htmlFor="daily-check-in-time">Preferred daily check-in time</Label>
                  <Input
                    id="daily-check-in-time"
                    type="time"
                    value={dailyCheckInTime}
                    onChange={(event) => setDailyCheckInTime(event.target.value)}
                  />
                </div>
                <div className="rounded-[24px] border border-accent bg-accent/50 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-primary/80">Default reminder stance</p>
                  <p className="mt-2 text-sm text-primary">
                    Reminders start calm and local-only. You can tune or disable them later in Settings.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => setStep("categories")}>Continue</Button>
                <Button variant="secondary" onClick={() => setStep("welcome")}>
                  Back
                </Button>
              </div>
            </div>
          ) : null}

          {step === "categories" ? (
            <div className="space-y-6">
              <div className="space-y-3">
                <h2 className="font-display text-3xl text-foreground">Choose your starter categories</h2>
                <p className="text-sm leading-6 text-muted-foreground">
                  Pick the categories you expect to touch first. This keeps Today feeling personal instead of generic.
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {selectableCategories.map((category) => {
                  const checked = selectedCategoryIds.includes(category.id);
                  return (
                    <label
                      key={category.id}
                      className={`flex items-center gap-3 rounded-[22px] border px-4 py-4 text-sm transition ${
                        checked ? "border-primary/25 bg-accent/55" : "border-border bg-muted/35 hover:bg-muted/55"
                      }`}
                    >
                      <input
                        aria-label={category.name}
                        checked={checked}
                        type="checkbox"
                        onChange={(event) =>
                          setSelectedCategoryIds((current) =>
                            event.target.checked
                              ? [...current, category.id]
                              : current.filter((value) => value !== category.id),
                          )
                        }
                      />
                      <span className="font-medium text-foreground">{category.name}</span>
                    </label>
                  );
                })}
              </div>
              <div className="rounded-[24px] border border-border bg-muted/45 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Current selection</p>
                <p className="mt-2 text-sm text-foreground">
                  {selectedLabels.length > 0 ? selectedLabels.join(", ") : "No categories selected yet. You can still continue."}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => setStep("finish")}>Continue</Button>
                <Button variant="secondary" onClick={() => setStep("habit")}>
                  Back
                </Button>
              </div>
            </div>
          ) : null}

          {step === "finish" ? (
            <div className="space-y-6">
              <div className="space-y-3">
                <h2 className="font-display text-3xl text-foreground">You’re ready for today</h2>
                <p className="text-sm leading-6 text-muted-foreground">
                  Start with one income or expense entry, glance at debt if it matters today, and close the loop when
                  the day feels accounted for.
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-[22px] border border-border bg-muted/35 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Daily time</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">{dailyCheckInTime}</p>
                </div>
                <div className="rounded-[22px] border border-border bg-muted/35 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Reminders</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">{remindersEnabled ? "Enabled" : "Disabled"}</p>
                </div>
                <div className="rounded-[22px] border border-border bg-muted/35 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Starter categories</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">{selectedCategoryIds.length}</p>
                </div>
              </div>
              <div className="rounded-[24px] border border-accent bg-accent/45 p-5">
                <p className="text-sm leading-6 text-primary">
                  Missing a few days later is normal. The app is designed to help you recover, not judge you.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={() =>
                    void onComplete({
                      dailyCheckInTime,
                      remindersEnabled,
                      selectedCategoryIds,
                    })
                  }
                >
                  Finish setup
                </Button>
                <Button variant="secondary" onClick={() => setStep("categories")}>
                  Back
                </Button>
              </div>
            </div>
          ) : null}
        </Card>
      </div>
    </div>
  );
}
