import { useState } from "react";
import type { Category, Debt, TodaySummary } from "@get-steady/core";
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
  onQuickAdd: (input: EntryInput) => Promise<void> | void;
  onMarkTodayComplete: () => Promise<void> | void;
  onMarkDatePartial: (date: string) => Promise<void> | void;
};

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="bg-white/80">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-foreground">{value}</p>
    </Card>
  );
}

export function TodayScreen({
  today,
  summary,
  categories,
  debts,
  missedDates,
  onQuickAdd,
  onMarkTodayComplete,
  onMarkDatePartial,
}: TodayScreenProps) {
  const [activeEntryDate, setActiveEntryDate] = useState(today);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-[32px] border border-border bg-card/90 p-6 shadow-card lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <Badge>Today</Badge>
          <h1 className="font-display text-4xl text-foreground">{formatLongDate(today)}</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Stay close to the day: log what came in, what went out, and close the loop before tomorrow.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Badge className={summary.isTodayCheckedIn ? "border-accent bg-accent/70 text-primary" : ""}>
            {summary.isTodayCheckedIn ? "Checked in" : "Not checked in"}
          </Badge>
          <Button onClick={() => void onMarkTodayComplete()}>Mark today complete</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Today money in" value={formatCurrency(summary.todayMoneyIn)} />
        <SummaryCard label="Today money out" value={formatCurrency(summary.todayMoneyOut)} />
        <SummaryCard label="Month net margin" value={formatCurrency(summary.monthNetMargin)} />
        <SummaryCard label="Debt outstanding" value={formatCurrency(summary.debtOutstanding)} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr,0.9fr]">
        <Card className="space-y-5">
          <div>
            <h2 className="font-display text-2xl text-foreground">Quick add</h2>
            <p className="text-sm text-muted-foreground">
              Use this for the day’s money in, money out, or a debt payment.
              {activeEntryDate !== today ? ` Catch-up date selected: ${formatShortDate(activeEntryDate)}.` : ""}
            </p>
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
            <div>
              <h2 className="font-display text-2xl text-foreground">This month</h2>
              <p className="text-sm text-muted-foreground">A quick cashflow snapshot without building a giant finance suite.</p>
            </div>
            <div className="grid gap-3">
              <div className="flex items-center justify-between rounded-2xl bg-white/80 px-4 py-3">
                <span className="text-sm text-muted-foreground">Money in</span>
                <strong>{formatCurrency(summary.monthMoneyIn)}</strong>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-white/80 px-4 py-3">
                <span className="text-sm text-muted-foreground">Money out</span>
                <strong>{formatCurrency(summary.monthMoneyOut)}</strong>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-accent/70 px-4 py-3">
                <span className="text-sm text-primary">Missed check-in days</span>
                <strong className="text-primary">{summary.missedCheckInDaysCount}</strong>
              </div>
            </div>
          </Card>

          <Card className="space-y-4">
            <div>
              <h2 className="font-display text-2xl text-foreground">Catch up</h2>
              <p className="text-sm text-muted-foreground">
                Missed days are a signal, not a failure. You can mark a day partial and come back later.
              </p>
            </div>
            {missedDates.length === 0 ? (
              <p className="rounded-2xl bg-white/80 px-4 py-3 text-sm text-muted-foreground">No missed days right now.</p>
            ) : (
              <div className="space-y-3">
                {missedDates.map((date) => (
                  <div key={date} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/80 px-4 py-3">
                    <div>
                      <p className="font-medium text-foreground">{formatShortDate(date)}</p>
                      <p className="text-xs text-muted-foreground">Use quick add with this date or mark it partial now.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="secondary" onClick={() => setActiveEntryDate(date)}>
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
