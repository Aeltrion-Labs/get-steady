import { useMemo, useState } from "react";
import type { CalendarDay, CalendarGridCell } from "@get-steady/core";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { formatCurrency, formatShortDate } from "../../lib/utils";

type CalendarPayload = {
  month: string;
  recovery: {
    oldestMissedDate: string | null;
    missedCount: number;
  };
  days: CalendarDay[];
  grid: CalendarGridCell[];
};

function buildMonthLabel(month: string) {
  return new Date(`${month}-01T00:00:00`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function getDayTone(day: CalendarDay, isActive: boolean) {
  if (isActive) {
    return "border-primary/40 bg-accent/80 shadow-sm";
  }
  if (day.state === "missed") {
    return "border-warning/35 bg-warning/12 hover:bg-warning/18";
  }
  if (day.state === "partial") {
    return "border-primary/20 bg-accent/55 hover:bg-accent/75";
  }
  if (day.state === "complete") {
    return "border-border bg-card hover:bg-muted/55";
  }
  return "border-border/80 bg-muted/50 text-muted-foreground hover:bg-muted/70";
}

export function CalendarScreen({
  month,
  selectedDate,
  calendar,
  onChangeMonth,
  onJumpToDate,
  onMarkPartial,
}: {
  month: string;
  selectedDate: string | null;
  calendar: CalendarPayload;
  onChangeMonth: (month: string) => void;
  onJumpToDate: (date: string) => void;
  onMarkPartial: (date: string) => Promise<void> | void;
}) {
  const [internalSelectedDate, setInternalSelectedDate] = useState<string | null>(selectedDate);
  const activeDate = internalSelectedDate ?? calendar.recovery.oldestMissedDate ?? calendar.days[0]?.date ?? null;
  const activeDay = useMemo(
    () => calendar.days.find((day) => day.date === activeDate) ?? null,
    [activeDate, calendar.days],
  );

  function shiftMonth(offset: number) {
    const [yearText, monthText] = month.split("-");
    const value = new Date(Date.UTC(Number(yearText), Number(monthText) - 1 + offset, 1));
    onChangeMonth(`${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-[32px] border border-border/80 bg-card/95 p-6 shadow-panel lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <Badge>Calendar</Badge>
          <h1 className="font-display text-4xl text-foreground">{buildMonthLabel(calendar.month)}</h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            See where the month is complete, where recovery is needed, and move directly into catch-up without turning
            history into a guilt dashboard.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => shiftMonth(-1)}>
            Previous month
          </Button>
          <Button variant="secondary" onClick={() => shiftMonth(1)}>
            Next month
          </Button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr,0.85fr]">
        <Card className="space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl text-foreground">Recovery lane</h2>
              <p className="text-sm text-muted-foreground">Missing days are warning-toned, not failure-toned.</p>
            </div>
            <Badge className="border-warning/30 bg-warning/15 text-warning-foreground">{calendar.recovery.missedCount} missed</Badge>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-[24px] border border-warning/25 bg-warning/12 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-warning-foreground/75">Oldest missed day</p>
              <p className="mt-2 text-lg font-semibold text-foreground">
                {calendar.recovery.oldestMissedDate ? formatShortDate(calendar.recovery.oldestMissedDate) : "Nothing pending"}
              </p>
            </div>
            <div className="rounded-[24px] border border-border bg-muted/40 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">This month</p>
              <p className="mt-2 text-lg font-semibold text-foreground">{calendar.recovery.missedCount} day(s) to recover</p>
            </div>
            <div className="rounded-[24px] border border-border bg-muted/40 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Best next move</p>
              <p className="mt-2 text-sm leading-6 text-foreground">
                {calendar.recovery.oldestMissedDate ? "Open the oldest missed day and fill it gently." : "Stay with today and keep the loop short."}
              </p>
            </div>
          </div>
        </Card>

        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-2xl text-foreground">{activeDay ? formatShortDate(activeDay.date) : "Select a day"}</h2>
              <p className="text-sm text-muted-foreground">
                {activeDay ? "Review the day first, then choose the smallest next action." : "Pick a day to inspect and recover."}
              </p>
            </div>
            {activeDay ? (
              <Badge
                className={
                  activeDay.state === "missed"
                    ? "border-warning/30 bg-warning/15 text-warning-foreground"
                    : activeDay.state === "partial"
                      ? "border-primary/20 bg-accent text-primary"
                      : "border-border bg-muted text-foreground"
                }
              >
                {activeDay.state}
              </Badge>
            ) : null}
          </div>
          {activeDay ? (
            <>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-[22px] border border-border bg-muted/35 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Money in</p>
                  <p className="mt-2 text-xl font-semibold tabular-nums text-foreground">{formatCurrency(activeDay.moneyIn)}</p>
                </div>
                <div className="rounded-[22px] border border-border bg-muted/35 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Money out</p>
                  <p className="mt-2 text-xl font-semibold tabular-nums text-foreground">{formatCurrency(activeDay.moneyOut)}</p>
                </div>
                <div className="rounded-[22px] border border-border bg-muted/35 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Net</p>
                  <p className="mt-2 text-xl font-semibold tabular-nums text-foreground">{formatCurrency(activeDay.net)}</p>
                </div>
              </div>

              <div className="rounded-[24px] border border-border bg-muted/30 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">What this means</p>
                <p className="mt-2 text-sm leading-6 text-foreground">
                  {activeDay.state === "missed"
                    ? "Nothing is broken. This day simply needs attention."
                    : activeDay.state === "partial"
                      ? "You already reopened the loop for this day. Finish it when ready."
                      : activeDay.state === "complete"
                        ? "This day is already accounted for."
                        : "Future days stay visible, but they do not need action yet."}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button onClick={() => onJumpToDate(activeDay.date)}>Catch up this day</Button>
                <Button variant="secondary" onClick={() => void onMarkPartial(activeDay.date)}>
                  Mark partial
                </Button>
              </div>
            </>
          ) : null}
        </Card>
      </div>

      <Card className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl text-foreground">Month grid</h2>
            <p className="text-sm text-muted-foreground">Use the grid to scan the month quickly, then inspect one day at a time.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="rounded-full border border-border bg-card px-3 py-1">Complete</span>
            <span className="rounded-full border border-primary/20 bg-accent/70 px-3 py-1">Partial</span>
            <span className="rounded-full border border-warning/30 bg-warning/15 px-3 py-1 text-warning-foreground">Missed</span>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-2 text-center text-xs uppercase tracking-[0.16em] text-muted-foreground">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {calendar.grid.map((cell) => {
            if (cell.kind === "spacer") {
              return <div key={cell.key} aria-hidden="true" className="min-h-[102px] rounded-[22px] border border-transparent" />;
            }

            const day = cell.day;
            const isActive = day.date === activeDate;
            return (
              <button
                key={cell.key}
                className={`min-h-[102px] rounded-[22px] border px-3 py-3 text-left transition ${getDayTone(day, isActive)}`}
                type="button"
                aria-label={String(Number(day.date.slice(-2)))}
                onClick={() => setInternalSelectedDate(day.date)}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-base font-semibold tabular-nums text-foreground">{Number(day.date.slice(-2))}</span>
                  {day.hasDueMarker ? <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">Due</span> : null}
                </div>
                <div className="mt-4 space-y-2">
                  <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{day.state}</div>
                  <div className="flex flex-wrap gap-1">
                    {day.hasEntries ? <span className="rounded-full bg-card/75 px-2 py-1 text-[10px] text-muted-foreground">Logged</span> : null}
                    {day.hasDebtPayment ? <span className="rounded-full bg-card/75 px-2 py-1 text-[10px] text-muted-foreground">Debt</span> : null}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
