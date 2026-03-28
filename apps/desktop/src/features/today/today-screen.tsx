import type { Category, Debt, TodaySummary } from "@get-steady/core";
import { ArrowDownCircle, ArrowUpCircle, CircleAlert, RotateCcw, WalletCards } from "lucide-react";
import type { EntryInput } from "../../lib/api";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { formatCurrency, formatLongDate, formatShortDate } from "../../lib/utils";
import { EntryForm } from "../shared/entry-form";

type TodayScreenProps = {
  today: string;
  summary: TodaySummary;
  categories: Category[];
  debts: Debt[];
  missedDates: string[];
  activeEntryDate: string;
  showCatchUp: boolean;
  onQuickAdd: (input: EntryInput) => Promise<void> | void;
  onSelectEntryDate: (date: string) => void;
  onMarkTodayComplete: () => Promise<void> | void;
  onMarkDatePartial: (date: string) => Promise<void> | void;
};

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="space-y-3 bg-white/80">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-3xl font-semibold tabular-nums text-foreground">{value}</p>
    </Card>
  );
}

export function TodayScreen({
  today,
  summary,
  categories,
  debts,
  missedDates,
  activeEntryDate,
  showCatchUp,
  onQuickAdd,
  onSelectEntryDate,
  onMarkTodayComplete,
  onMarkDatePartial,
}: TodayScreenProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-5 rounded-[32px] border border-border bg-card/95 p-6 shadow-card lg:grid-cols-[1.3fr,0.9fr]">
        <div className="space-y-4">
          <Badge>Today</Badge>
          <div className="space-y-3">
            <h1 className="font-display text-4xl text-foreground">{formatLongDate(today)}</h1>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              Stay close to the day: log what came in, what went out, and close the loop before tomorrow.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:max-w-[34rem]">
            <div className="rounded-[24px] border border-border/80 bg-muted/50 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Check-in state</p>
              <p className="mt-2 text-lg font-semibold text-foreground">
                {summary.isTodayCheckedIn ? "You are closed out for today." : "Today is still open."}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {summary.isTodayCheckedIn ? "Use quick add only if something changed." : "A short pass now keeps tomorrow lighter."}
              </p>
            </div>
            <div className="rounded-[24px] border border-border/80 bg-accent/55 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-primary/80">Recovery posture</p>
              <p className="mt-2 text-lg font-semibold text-foreground">
                {summary.missedCheckInDaysCount === 0 ? "No recovery lane waiting." : `${summary.missedCheckInDaysCount} missed day${summary.missedCheckInDaysCount === 1 ? "" : "s"}`}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Missed days are recoverable. Partial check-ins still keep the habit moving.
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-4 rounded-[28px] border border-border/80 bg-slate-950 px-5 py-5 text-slate-50 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <Badge className="border-white/15 bg-white/10 text-slate-200">
              {summary.isTodayCheckedIn ? "Checked in" : "Not checked in"}
            </Badge>
            <span className="text-xs uppercase tracking-[0.18em] text-slate-400">Daily ritual</span>
          </div>
          <div className="space-y-2">
            <p className="text-2xl font-semibold">Close the day while it is still fresh.</p>
            <p className="text-sm leading-6 text-slate-300">
              Record the important movement, then mark the day complete when you have enough signal to trust the picture.
            </p>
          </div>
          <Button className="w-full bg-white text-slate-950 hover:bg-white/90" onClick={() => void onMarkTodayComplete()}>
            Mark today complete
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Today money in" value={formatCurrency(summary.todayMoneyIn)} />
        <SummaryCard label="Today money out" value={formatCurrency(summary.todayMoneyOut)} />
        <SummaryCard label="Month net margin" value={formatCurrency(summary.monthNetMargin)} />
        <SummaryCard label="Debt outstanding" value={formatCurrency(summary.debtOutstanding)} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr,0.9fr]">
        <Card className="space-y-5 bg-card/95">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Badge className="border-primary/15 bg-accent/60 text-primary">Quick add</Badge>
              <h2 className="mt-3 font-display text-2xl text-foreground">Add today’s signal without friction.</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Use this for the day’s money in, money out, or a debt payment.
                {activeEntryDate !== today ? ` Catch-up date selected: ${formatShortDate(activeEntryDate)}.` : ""}
              </p>
            </div>
            <div className="grid min-w-[220px] gap-3 rounded-[24px] border border-border/80 bg-muted/45 p-4">
              <div className="flex items-center gap-3">
                <ArrowUpCircle className="h-5 w-5 text-success" />
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Money in</p>
                  <p className="text-lg font-semibold tabular-nums text-foreground">{formatCurrency(summary.todayMoneyIn)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <ArrowDownCircle className="h-5 w-5 text-chart-spending" />
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Money out</p>
                  <p className="text-lg font-semibold tabular-nums text-foreground">{formatCurrency(summary.todayMoneyOut)}</p>
                </div>
              </div>
            </div>
          </div>
          <EntryForm
            key={activeEntryDate}
            categories={categories}
            debts={debts}
            initialDate={activeEntryDate}
            submitLabel="Save entry"
            onSubmit={onQuickAdd}
          />
        </Card>

        <div className="space-y-6">
          <Card className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Badge>This month</Badge>
                <h2 className="mt-3 font-display text-2xl text-foreground">Cashflow snapshot</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Enough context to keep your footing without turning the app into a finance dashboard.
                </p>
              </div>
              <WalletCards className="mt-1 h-5 w-5 text-primary" />
            </div>
            <div className="grid gap-3">
              <div className="flex items-center justify-between rounded-[22px] border border-border/70 bg-white/80 px-4 py-3">
                <span className="text-sm text-muted-foreground">Money in</span>
                <strong className="tabular-nums text-foreground">{formatCurrency(summary.monthMoneyIn)}</strong>
              </div>
              <div className="flex items-center justify-between rounded-[22px] border border-border/70 bg-white/80 px-4 py-3">
                <span className="text-sm text-muted-foreground">Money out</span>
                <strong className="tabular-nums text-foreground">{formatCurrency(summary.monthMoneyOut)}</strong>
              </div>
              <div className="flex items-center justify-between rounded-[22px] border border-primary/10 bg-accent/70 px-4 py-3">
                <span className="text-sm text-primary">Missed check-in days</span>
                <strong className="tabular-nums text-primary">{summary.missedCheckInDaysCount}</strong>
              </div>
            </div>
          </Card>

          <Card className="space-y-4 border-warning/35 bg-warning/5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Badge className="border-warning/30 bg-warning/15 text-warning-foreground">Catch up</Badge>
                <h2 className="mt-3 font-display text-2xl text-foreground">Recovery lane</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Missed days are a signal, not a failure. You can mark a day partial and come back later.
                </p>
              </div>
              <RotateCcw className="mt-1 h-5 w-5 text-warning" />
            </div>
            {!showCatchUp ? (
              <div className="rounded-[22px] border border-border/70 bg-white/80 px-4 py-4 text-sm text-muted-foreground">
                Catch-up prompts are hidden in Settings. You can still backfill from Calendar or Ledger.
              </div>
            ) : missedDates.length === 0 ? (
              <div className="rounded-[22px] border border-border/70 bg-white/80 px-4 py-4 text-sm text-muted-foreground">No missed days right now.</div>
            ) : (
              <div className="space-y-3">
                {missedDates.map((date) => (
                  <div
                    key={date}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-warning/20 bg-white/90 px-4 py-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="rounded-full bg-warning/15 p-2 text-warning">
                        <CircleAlert className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{formatShortDate(date)}</p>
                        <p className="text-xs text-muted-foreground">Use quick add with this date or mark it partial now.</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="secondary" onClick={() => onSelectEntryDate(date)}>
                        Fill this day
                      </Button>
                      <Button variant="ghost" onClick={() => void onMarkDatePartial(date)}>
                        Mark partial
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
