import { describe, expect, it } from "vitest";
import { calculateAnalyticsSummary } from "./analytics";
import { buildCheckInRecord } from "./checkins";

describe("calculateAnalyticsSummary", () => {
  it("classifies healthy momentum with positive cashflow and debt payoff pace", () => {
    const summary = calculateAnalyticsSummary({
      today: "2026-03-27",
      entries: [
        {
          id: "income-this-month",
          type: "income",
          amount: 4200,
          categoryId: "income",
          debtId: null,
          note: null,
          entryDate: "2026-03-03",
          createdAt: "2026-03-03T12:00:00Z",
          updatedAt: "2026-03-03T12:00:00Z",
          source: "manual",
          isEstimated: false,
        },
        {
          id: "expense-this-month",
          type: "expense",
          amount: 2500,
          categoryId: "living",
          debtId: null,
          note: null,
          entryDate: "2026-03-10",
          createdAt: "2026-03-10T12:00:00Z",
          updatedAt: "2026-03-10T12:00:00Z",
          source: "manual",
          isEstimated: false,
        },
        {
          id: "debt-this-month",
          type: "debt_payment",
          amount: 300,
          categoryId: "debt-payment",
          debtId: "debt-1",
          note: null,
          entryDate: "2026-03-15",
          createdAt: "2026-03-15T12:00:00Z",
          updatedAt: "2026-03-15T12:00:00Z",
          source: "manual",
          isEstimated: false,
        },
        {
          id: "income-last-month",
          type: "income",
          amount: 4000,
          categoryId: "income",
          debtId: null,
          note: null,
          entryDate: "2026-02-03",
          createdAt: "2026-02-03T12:00:00Z",
          updatedAt: "2026-02-03T12:00:00Z",
          source: "manual",
          isEstimated: false,
        },
        {
          id: "expense-last-month",
          type: "expense",
          amount: 2550,
          categoryId: "living",
          debtId: null,
          note: null,
          entryDate: "2026-02-08",
          createdAt: "2026-02-08T12:00:00Z",
          updatedAt: "2026-02-08T12:00:00Z",
          source: "manual",
          isEstimated: false,
        },
        {
          id: "debt-last-month",
          type: "debt_payment",
          amount: 250,
          categoryId: "debt-payment",
          debtId: "debt-1",
          note: null,
          entryDate: "2026-02-18",
          createdAt: "2026-02-18T12:00:00Z",
          updatedAt: "2026-02-18T12:00:00Z",
          source: "manual",
          isEstimated: false,
        },
      ],
      debts: [
        {
          id: "debt-1",
          name: "Visa",
          lender: "Bank",
          balanceCurrent: 1800,
          interestRate: 21.5,
          minimumPayment: 90,
          dueDay: 15,
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-03-15T00:00:00Z",
          isActive: true,
        },
      ],
      checkIns: [
        buildCheckInRecord({ date: "2026-03-24" }),
        buildCheckInRecord({ date: "2026-03-26" }),
      ],
    });

    expect(summary).toMatchObject({
      missionStatus: "on_track",
      currentMonth: {
        income: 4200,
        outflow: 2800,
        netMargin: 1400,
        debtPayments: 300,
      },
      previousMonth: {
        income: 4000,
        outflow: 2800,
        netMargin: 1200,
        debtPayments: 250,
      },
      debtOutstanding: 1800,
      debtPaymentChange: 50,
      netMarginChange: 200,
      estimatedMonthsToDebtFree: 6,
      hasDataConfidenceWarning: true,
      focusItems: [
        "Stay cashflow positive this month.",
        "Keep debt payments at or above last month.",
      ],
    });

    expect(summary.primaryMessage).toContain("On track");
    expect(summary.confidenceMessage).toContain("check-in");
  });

  it("surfaces cashflow-negative risk even when debt payments continue", () => {
    const summary = calculateAnalyticsSummary({
      today: "2026-03-27",
      entries: [
        {
          id: "income-this-month",
          type: "income",
          amount: 2000,
          categoryId: "income",
          debtId: null,
          note: null,
          entryDate: "2026-03-03",
          createdAt: "2026-03-03T12:00:00Z",
          updatedAt: "2026-03-03T12:00:00Z",
          source: "manual",
          isEstimated: false,
        },
        {
          id: "expense-this-month",
          type: "expense",
          amount: 2300,
          categoryId: "living",
          debtId: null,
          note: null,
          entryDate: "2026-03-10",
          createdAt: "2026-03-10T12:00:00Z",
          updatedAt: "2026-03-10T12:00:00Z",
          source: "manual",
          isEstimated: false,
        },
        {
          id: "debt-this-month",
          type: "debt_payment",
          amount: 150,
          categoryId: "debt-payment",
          debtId: "debt-1",
          note: null,
          entryDate: "2026-03-12",
          createdAt: "2026-03-12T12:00:00Z",
          updatedAt: "2026-03-12T12:00:00Z",
          source: "manual",
          isEstimated: false,
        },
        {
          id: "income-last-month",
          type: "income",
          amount: 2200,
          categoryId: "income",
          debtId: null,
          note: null,
          entryDate: "2026-02-03",
          createdAt: "2026-02-03T12:00:00Z",
          updatedAt: "2026-02-03T12:00:00Z",
          source: "manual",
          isEstimated: false,
        },
        {
          id: "expense-last-month",
          type: "expense",
          amount: 2100,
          categoryId: "living",
          debtId: null,
          note: null,
          entryDate: "2026-02-10",
          createdAt: "2026-02-10T12:00:00Z",
          updatedAt: "2026-02-10T12:00:00Z",
          source: "manual",
          isEstimated: false,
        },
      ],
      debts: [
        {
          id: "debt-1",
          name: "Visa",
          lender: "Bank",
          balanceCurrent: 3200,
          interestRate: 21.5,
          minimumPayment: 90,
          dueDay: 15,
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-03-12T00:00:00Z",
          isActive: true,
        },
      ],
      checkIns: [buildCheckInRecord({ date: "2026-03-27" })],
    });

    expect(summary.missionStatus).toBe("cashflow_negative");
    expect(summary.primaryMessage).toContain("Cashflow is negative");
    expect(summary.focusItems[0]).toBe("Reduce money out or raise money in before accelerating debt payoff.");
    expect(summary.estimatedMonthsToDebtFree).toBe(21.33);
    expect(summary.hasDataConfidenceWarning).toBe(false);
  });
});
