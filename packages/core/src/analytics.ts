import type {
  AnalyticsDirection,
  AnalyticsPeriod,
  AnalyticsSummary,
  CheckIn,
  Debt,
  Entry,
  MissionStatus,
} from "./schema";
import { analyticsSummarySchema, checkInSchema, debtSchema, entrySchema } from "./schema";
import { getMissedCheckInDates } from "./summary";

function normalizeMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function formatMonthLabel(monthKey: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${monthKey}-01T00:00:00Z`));
}

function getPreviousMonth(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, 1));
  date.setUTCMonth(date.getUTCMonth() - 1);
  return date.toISOString().slice(0, 7);
}

function buildPeriod(label: string): AnalyticsPeriod {
  return {
    label,
    income: 0,
    outflow: 0,
    netMargin: 0,
    debtPayments: 0,
  };
}

function finalizePeriod(period: AnalyticsPeriod): AnalyticsPeriod {
  return {
    ...period,
    income: normalizeMoney(period.income),
    outflow: normalizeMoney(period.outflow),
    debtPayments: normalizeMoney(period.debtPayments),
    netMargin: normalizeMoney(period.income - period.outflow),
  };
}

function calculateDebtFreeMonths(
  debtOutstanding: number,
  monthlyPayments: number[],
): number | null {
  if (debtOutstanding <= 0) {
    return null;
  }
  const currentPace = monthlyPayments[0] ?? 0;
  const fallbackPace = monthlyPayments[1] ?? 0;
  const monthlyPace = currentPace > 0 ? currentPace : fallbackPace;
  if (monthlyPace <= 0) {
    return null;
  }

  return normalizeMoney(debtOutstanding / monthlyPace);
}

function getCashflowDirection(netMarginChange: number): AnalyticsDirection {
  if (netMarginChange > 0.01) {
    return "improving";
  }
  if (netMarginChange < -0.01) {
    return "worsening";
  }
  return "flat";
}

function getMissionStatus(input: {
  debtOutstanding: number;
  currentNetMargin: number;
  currentDebtPayments: number;
  previousDebtPayments: number;
}): MissionStatus {
  if (input.currentNetMargin < 0 && input.currentDebtPayments < input.previousDebtPayments) {
    return "high_risk";
  }

  if (input.currentNetMargin < 0) {
    return "cashflow_negative";
  }

  if (input.debtOutstanding > 0 && input.currentDebtPayments <= 0) {
    return "debt_stalled";
  }

  return "on_track";
}

function buildMessages(
  status: MissionStatus,
  direction: AnalyticsDirection,
): Pick<AnalyticsSummary, "primaryMessage" | "secondaryMessage" | "focusItems"> {
  if (status === "cashflow_negative") {
    return {
      primaryMessage:
        "Cashflow is negative this month, even though debt payments are still happening.",
      secondaryMessage:
        direction === "worsening"
          ? "Debt payoff is still moving, but monthly breathing room has tightened."
          : "Debt payoff is still moving, but cashflow needs attention first.",
      focusItems: [
        "Reduce money out or raise money in before accelerating debt payoff.",
        "Protect at least the current debt payment pace.",
        "Review the spending categories that grew month over month.",
      ],
    };
  }

  if (status === "debt_stalled") {
    return {
      primaryMessage: "Cashflow is positive, but debt progress has stalled.",
      secondaryMessage: "The month is stable enough to restart debt reduction deliberately.",
      focusItems: [
        "Schedule the next debt payment before the month closes.",
        "Protect this month’s positive margin.",
        "Use the debt list to focus on the balance that is most urgent.",
      ],
    };
  }

  if (status === "high_risk") {
    return {
      primaryMessage: "Both cashflow and debt momentum have weakened this month.",
      secondaryMessage: "Stabilize monthly margin first, then rebuild debt payoff pace.",
      focusItems: [
        "Cut money out this week and pause nonessential spending.",
        "Protect at least one debt payment from slipping entirely.",
        "Use catch-up so this read reflects the full month.",
      ],
    };
  }

  return {
    primaryMessage: "On track: cashflow is positive and debt is moving down.",
    secondaryMessage:
      direction === "improving"
        ? "This month is stronger than last month on both breathing room and payoff pace."
        : "Momentum is holding steady. Keep the basics consistent.",
    focusItems: [
      "Stay cashflow positive this month.",
      "Keep debt payments at or above last month.",
    ],
  };
}

export function calculateAnalyticsSummary(input: {
  entries: Entry[];
  debts: Debt[];
  checkIns: CheckIn[];
  today: string;
}): AnalyticsSummary {
  const entries = input.entries.map((entry) => entrySchema.parse(entry));
  const debts = input.debts.map((debt) => debtSchema.parse(debt));
  const checkIns = input.checkIns.map((checkIn) => checkInSchema.parse(checkIn));
  const currentMonthKey = input.today.slice(0, 7);
  const previousMonthKey = getPreviousMonth(currentMonthKey);
  const currentMonth = buildPeriod(formatMonthLabel(currentMonthKey));
  const previousMonth = buildPeriod(formatMonthLabel(previousMonthKey));

  for (const entry of entries) {
    const monthKey = entry.entryDate.slice(0, 7);
    const target =
      monthKey === currentMonthKey
        ? currentMonth
        : monthKey === previousMonthKey
          ? previousMonth
          : null;

    if (!target) {
      continue;
    }

    if (entry.type === "income") {
      target.income += entry.amount;
      continue;
    }

    target.outflow += entry.amount;
    if (entry.type === "debt_payment") {
      target.debtPayments += entry.amount;
    }
  }

  const finalizedCurrent = finalizePeriod(currentMonth);
  const finalizedPrevious = finalizePeriod(previousMonth);
  const debtOutstanding = normalizeMoney(
    debts.filter((debt) => debt.isActive).reduce((total, debt) => total + debt.balanceCurrent, 0),
  );
  const debtPaymentChange = normalizeMoney(
    finalizedCurrent.debtPayments - finalizedPrevious.debtPayments,
  );
  const netMarginChange = normalizeMoney(finalizedCurrent.netMargin - finalizedPrevious.netMargin);
  const cashflowDirection = getCashflowDirection(netMarginChange);
  const missionStatus = getMissionStatus({
    debtOutstanding,
    currentNetMargin: finalizedCurrent.netMargin,
    currentDebtPayments: finalizedCurrent.debtPayments,
    previousDebtPayments: finalizedPrevious.debtPayments,
  });
  const { primaryMessage, secondaryMessage, focusItems } = buildMessages(
    missionStatus,
    cashflowDirection,
  );
  const missedDates = getMissedCheckInDates(checkIns, input.today);
  const isTodayCheckedIn = checkIns.some(
    (checkIn) => checkIn.date === input.today && (checkIn.completed || checkIn.isPartial),
  );
  const hasDataConfidenceWarning = missedDates.length > 0 || !isTodayCheckedIn;
  const confidenceMessage = hasDataConfidenceWarning
    ? "Recent check-in gaps mean this mission read may be missing a day or two."
    : "Based on complete recent check-ins.";
  const estimatedMonthsToDebtFree = calculateDebtFreeMonths(debtOutstanding, [
    finalizedCurrent.debtPayments,
    finalizedPrevious.debtPayments,
  ]);

  return analyticsSummarySchema.parse({
    missionStatus,
    primaryMessage,
    secondaryMessage,
    confidenceMessage,
    hasDataConfidenceWarning,
    currentMonth: finalizedCurrent,
    previousMonth: finalizedPrevious,
    debtOutstanding,
    debtPaymentChange,
    netMarginChange,
    estimatedMonthsToDebtFree,
    cashflowDirection,
    focusItems,
    debtSeries: [
      { label: "Outstanding", value: debtOutstanding },
      { label: "Paid this month", value: finalizedCurrent.debtPayments },
    ],
    cashflowSeries: [
      {
        label: finalizedPrevious.label,
        income: finalizedPrevious.income,
        outflow: finalizedPrevious.outflow,
        netMargin: finalizedPrevious.netMargin,
      },
      {
        label: finalizedCurrent.label,
        income: finalizedCurrent.income,
        outflow: finalizedCurrent.outflow,
        netMargin: finalizedCurrent.netMargin,
      },
    ],
  });
}
