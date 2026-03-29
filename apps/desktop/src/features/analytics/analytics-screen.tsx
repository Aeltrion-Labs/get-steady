import type { AnalyticsSummary } from "@get-steady/core";
import { AlertTriangle, ArrowDownCircle, CircleDollarSign, Gauge, TrendingUp } from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Card } from "../../components/ui/card";
import { cn, formatCurrency } from "../../lib/utils";

function formatDelta(value: number) {
  if (value === 0) {
    return "$0.00";
  }

  const sign = value > 0 ? "+" : "-";
  return `${sign}${formatCurrency(Math.abs(value))}`;
}

function formatMonths(value: number | null) {
  if (value == null) {
    return "Not enough history";
  }

  return `${value.toFixed(1)} months`;
}

function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <Card className="bg-card/80">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-foreground">{value}</p>
      <p className="mt-2 text-sm text-muted-foreground">{detail}</p>
    </Card>
  );
}

function SeriesBar({
  label,
  value,
  maxValue,
  tone,
}: {
  label: string;
  value: number;
  maxValue: number;
  tone: "primary" | "warning";
}) {
  const width = maxValue <= 0 ? 0 : Math.max(8, Math.round((value / maxValue) * 100));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <strong className="text-foreground">{formatCurrency(value)}</strong>
      </div>
      <div className="h-3 rounded-full bg-muted">
        <div
          aria-hidden="true"
          className={cn("h-3 rounded-full", tone === "primary" ? "bg-primary" : "bg-warning")}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

export function AnalyticsScreen({ summary }: { summary: AnalyticsSummary }) {
  const cashflowMax = Math.max(
    ...summary.cashflowSeries.flatMap((item) => [item.income, item.outflow]),
    0,
  );
  const debtMax = Math.max(...summary.debtSeries.map((item) => item.value), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-[32px] border border-border bg-card/90 p-6 shadow-card lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <Badge>Analytics</Badge>
          <h1 className="font-display text-4xl text-foreground">Mission Status</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            A short read on whether debt is shrinking and whether this month is staying cashflow
            positive.
          </p>
        </div>
        <Badge
          className={cn(
            "border px-3 py-1 text-sm",
            summary.hasDataConfidenceWarning
              ? "border-warning/30 bg-warning/15 text-warning-foreground"
              : "border-accent bg-accent/70 text-primary",
          )}
        >
          {summary.currentMonth.label} vs {summary.previousMonth.label}
        </Badge>
      </div>

      <Card className="space-y-4 bg-card/85">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Gauge className="h-5 w-5 text-primary" />
              <h2 className="font-display text-3xl text-foreground">Mission read</h2>
            </div>
            <p className="max-w-3xl text-xl font-semibold text-foreground">
              {summary.primaryMessage}
            </p>
            <p className="max-w-3xl text-sm text-muted-foreground">{summary.secondaryMessage}</p>
          </div>
          <div
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium",
              summary.missionStatus === "on_track"
                ? "bg-accent/70 text-primary"
                : "bg-warning/15 text-warning-foreground",
            )}
          >
            <TrendingUp className="h-4 w-4" />
            {summary.missionStatus.replace("_", " ")}
          </div>
        </div>
        <div
          className={cn(
            "flex items-start gap-3 rounded-2xl px-4 py-3 text-sm",
            summary.hasDataConfidenceWarning
              ? "bg-warning/15 text-warning-foreground"
              : "bg-muted text-muted-foreground",
          )}
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{summary.confidenceMessage}</span>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Net margin"
          value={formatCurrency(summary.currentMonth.netMargin)}
          detail={`${formatDelta(summary.netMarginChange)} vs last month`}
        />
        <MetricCard
          label="Debt outstanding"
          value={formatCurrency(summary.debtOutstanding)}
          detail={`${formatCurrency(summary.currentMonth.debtPayments)} paid this month`}
        />
        <MetricCard
          label="Debt free pace"
          value={formatMonths(summary.estimatedMonthsToDebtFree)}
          detail={`${formatDelta(summary.debtPaymentChange)} payment pace vs last month`}
        />
        <MetricCard
          label="Cashflow direction"
          value={summary.cashflowDirection}
          detail={`${summary.currentMonth.label} net: ${formatCurrency(summary.currentMonth.netMargin)}`}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr,0.95fr]">
        <Card className="space-y-5">
          <div>
            <h2 className="font-display text-2xl text-foreground">What needs attention now</h2>
            <p className="text-sm text-muted-foreground">
              The point is to leave with a clear next focus, not to interpret a wall of reporting.
            </p>
          </div>
          <div className="space-y-3">
            {summary.focusItems.map((item) => (
              <div key={item} className="rounded-2xl bg-card/80 px-4 py-3 text-sm text-foreground">
                {item}
              </div>
            ))}
          </div>
        </Card>

        <Card className="space-y-5">
          <div>
            <h2 className="font-display text-2xl text-foreground">Debt trajectory</h2>
            <p className="text-sm text-muted-foreground">
              Current balance alongside this month’s debt payment effort.
            </p>
          </div>
          <div className="space-y-4">
            {summary.debtSeries.map((item) => (
              <SeriesBar
                key={item.label}
                label={item.label}
                value={item.value}
                maxValue={debtMax}
                tone={item.label === "Outstanding" ? "warning" : "primary"}
              />
            ))}
          </div>
        </Card>
      </div>

      <Card className="space-y-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="font-display text-2xl text-foreground">Month vs last month</h2>
            <p className="text-sm text-muted-foreground">
              Income and outflow stay visible, but only to support the mission read.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <CircleDollarSign className="h-4 w-4" />
            <span>
              {summary.previousMonth.label} to {summary.currentMonth.label}
            </span>
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          {summary.cashflowSeries.map((period) => (
            <div key={period.label} className="space-y-4 rounded-[24px] bg-card/80 p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">{period.label}</h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ArrowDownCircle className="h-4 w-4" />
                  <span>{formatCurrency(period.netMargin)} net</span>
                </div>
              </div>
              <SeriesBar
                label="Money in"
                value={period.income}
                maxValue={cashflowMax}
                tone="primary"
              />
              <SeriesBar
                label="Money out"
                value={period.outflow}
                maxValue={cashflowMax}
                tone="warning"
              />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
