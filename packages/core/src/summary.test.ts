import { describe, expect, it } from "vitest";
import { buildCheckInRecord } from "./checkins";
import { buildDebtsCsv, buildEntriesCsv } from "./export";
import { calculateTodaySummary, getMissedCheckInDates } from "./summary";

describe("calculateTodaySummary", () => {
  it("aggregates today, month, debt, and missed-day totals", () => {
    const summary = calculateTodaySummary({
      today: "2026-03-27",
      entries: [
        {
          id: "entry-income",
          type: "income",
          amount: 1200,
          categoryId: "income",
          debtId: null,
          note: "paycheck",
          entryDate: "2026-03-27",
          createdAt: "2026-03-27T12:00:00Z",
          updatedAt: "2026-03-27T12:00:00Z",
          source: "manual",
          isEstimated: false,
        },
        {
          id: "entry-expense",
          type: "expense",
          amount: 80.55,
          categoryId: "groceries",
          debtId: null,
          note: null,
          entryDate: "2026-03-27",
          createdAt: "2026-03-27T12:00:00Z",
          updatedAt: "2026-03-27T12:00:00Z",
          source: "manual",
          isEstimated: false,
        },
        {
          id: "entry-debt",
          type: "debt_payment",
          amount: 150,
          categoryId: "debt-payment",
          debtId: "debt-1",
          note: null,
          entryDate: "2026-03-14",
          createdAt: "2026-03-14T12:00:00Z",
          updatedAt: "2026-03-14T12:00:00Z",
          source: "manual",
          isEstimated: false,
        },
      ],
      debts: [
        {
          id: "debt-1",
          name: "Visa",
          lender: "Bank",
          balanceCurrent: 2450.22,
          interestRate: 21.5,
          minimumPayment: 90,
          dueDay: 15,
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-03-14T00:00:00Z",
          isActive: true,
        },
      ],
      checkIns: [buildCheckInRecord({ date: "2026-03-24" })],
    });

    expect(summary).toEqual({
      todayMoneyIn: 1200,
      todayMoneyOut: 80.55,
      monthMoneyIn: 1200,
      monthMoneyOut: 230.55,
      monthNetMargin: 969.45,
      debtOutstanding: 2450.22,
      missedCheckInDaysCount: 2,
      isTodayCheckedIn: false,
    });
  });
});

describe("getMissedCheckInDates", () => {
  it("returns dates between the last completed day and today", () => {
    expect(
      getMissedCheckInDates(
        [
          buildCheckInRecord({ date: "2026-03-20" }),
          buildCheckInRecord({ date: "2026-03-23", isPartial: true }),
        ],
        "2026-03-27",
      ),
    ).toEqual(["2026-03-24", "2026-03-25", "2026-03-26"]);
  });
});

describe("CSV exporters", () => {
  it("builds friendly CSV content for entries and debts", () => {
    const entriesCsv = buildEntriesCsv([
      {
        id: "entry-1",
        type: "expense",
        amount: 15.5,
        categoryId: "groceries",
        debtId: null,
        note: "milk, eggs",
        entryDate: "2026-03-27",
        createdAt: "2026-03-27T12:00:00Z",
        updatedAt: "2026-03-27T12:00:00Z",
        source: "manual",
        isEstimated: false,
      },
    ]);

    const debtsCsv = buildDebtsCsv([
      {
        id: "debt-1",
        name: "Visa",
        lender: "Bank",
        balanceCurrent: 25,
        interestRate: 19.99,
        minimumPayment: 10,
        dueDay: 9,
        createdAt: "2026-03-01T00:00:00Z",
        updatedAt: "2026-03-27T00:00:00Z",
        isActive: true,
      },
    ]);

    expect(entriesCsv.split("\n")[0]).toContain("Entry ID");
    expect(entriesCsv).toContain("\"milk, eggs\"");
    expect(debtsCsv.split("\n")[0]).toContain("Current Balance");
    expect(debtsCsv).toContain("Visa");
  });
});
