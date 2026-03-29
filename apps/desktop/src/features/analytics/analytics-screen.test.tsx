import { render, screen } from "@testing-library/react";
import type { AnalyticsSummary } from "@get-steady/core";
import { AnalyticsScreen } from "./analytics-screen";

const analyticsSummary: AnalyticsSummary = {
  missionStatus: "cashflow_negative",
  primaryMessage: "Cashflow is negative this month, even though debt payments are still happening.",
  secondaryMessage: "Debt payoff is still moving, but monthly breathing room has tightened.",
  confidenceMessage: "Based on complete recent check-ins.",
  hasDataConfidenceWarning: false,
  currentMonth: {
    label: "Mar 2026",
    income: 2200,
    outflow: 2550,
    netMargin: -350,
    debtPayments: 150,
  },
  previousMonth: {
    label: "Feb 2026",
    income: 2400,
    outflow: 2300,
    netMargin: 100,
    debtPayments: 125,
  },
  debtOutstanding: 3200,
  debtPaymentChange: 25,
  netMarginChange: -450,
  estimatedMonthsToDebtFree: 21.33,
  cashflowDirection: "worsening",
  focusItems: [
    "Reduce money out or raise money in before accelerating debt payoff.",
    "Protect at least the current debt payment pace.",
    "Review the spending categories that grew month over month.",
  ],
  debtSeries: [
    { label: "Outstanding", value: 3200 },
    { label: "Paid this month", value: 150 },
  ],
  cashflowSeries: [
    { label: "Feb 2026", income: 2400, outflow: 2300, netMargin: 100 },
    { label: "Mar 2026", income: 2200, outflow: 2550, netMargin: -350 },
  ],
};

describe("AnalyticsScreen", () => {
  it("renders a steady-check analytics view with focus actions", () => {
    render(<AnalyticsScreen summary={analyticsSummary} />);

    expect(screen.getByText("Steady Check")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Cashflow is negative this month, even though debt payments are still happening.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("What needs attention now")).toBeInTheDocument();
    expect(screen.getByText("Debt payoff pace")).toBeInTheDocument();
    expect(screen.getByText("21.3 months")).toBeInTheDocument();
    expect(
      screen.getByText("Reduce money out or raise money in before accelerating debt payoff."),
    ).toBeInTheDocument();
    expect(screen.getByText("Month vs last month")).toBeInTheDocument();
  });
});
