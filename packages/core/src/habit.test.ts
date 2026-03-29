import { describe, expect, it } from "vitest";
import { buildCalendarMonth, evaluateReminderPlan } from "./habit";

describe("buildCalendarMonth", () => {
  it("derives month day states and totals for recovery-oriented calendar cells", () => {
    const calendar = buildCalendarMonth({
      month: "2026-03",
      today: "2026-03-27",
      entries: [
        {
          id: "entry-income",
          type: "income",
          amount: 1250,
          categoryId: "cat-income",
          debtId: null,
          note: null,
          entryDate: "2026-03-24",
          createdAt: "2026-03-24T10:00:00Z",
          updatedAt: "2026-03-24T10:00:00Z",
          source: "manual",
          isEstimated: false,
        },
        {
          id: "entry-expense",
          type: "expense",
          amount: 80,
          categoryId: "cat-groceries",
          debtId: null,
          note: null,
          entryDate: "2026-03-24",
          createdAt: "2026-03-24T10:00:00Z",
          updatedAt: "2026-03-24T10:00:00Z",
          source: "manual",
          isEstimated: false,
        },
        {
          id: "entry-payment",
          type: "debt_payment",
          amount: 60,
          categoryId: "cat-debt-payment",
          debtId: "debt-card",
          note: null,
          entryDate: "2026-03-26",
          createdAt: "2026-03-26T10:00:00Z",
          updatedAt: "2026-03-26T10:00:00Z",
          source: "manual",
          isEstimated: false,
        },
      ],
      checkIns: [
        {
          date: "2026-03-24",
          completed: true,
          completedAt: "2026-03-24T22:00:00Z",
          isPartial: false,
          note: null,
        },
        {
          date: "2026-03-26",
          completed: false,
          completedAt: null,
          isPartial: true,
          note: null,
        },
      ],
      debts: [
        {
          id: "debt-card",
          name: "Card",
          lender: "Bank",
          balanceCurrent: 500,
          interestRate: null,
          minimumPayment: 50,
          dueDay: 30,
          createdAt: "2026-03-01T00:00:00Z",
          updatedAt: "2026-03-01T00:00:00Z",
          isActive: true,
        },
      ],
    });

    const completed = calendar.days.find((day) => day.date === "2026-03-24");
    const missed = calendar.days.find((day) => day.date === "2026-03-25");
    const partial = calendar.days.find((day) => day.date === "2026-03-26");
    const future = calendar.days.find((day) => day.date === "2026-03-30");

    expect(completed).toMatchObject({
      state: "complete",
      moneyIn: 1250,
      moneyOut: 80,
      net: 1170,
      hasEntries: true,
      hasDebtPayment: false,
      hasDueMarker: false,
    });
    expect(missed).toMatchObject({
      state: "missed",
      hasEntries: false,
      moneyIn: 0,
      moneyOut: 0,
    });
    expect(partial).toMatchObject({
      state: "partial",
      hasDebtPayment: true,
      moneyOut: 60,
      hasDueMarker: false,
    });
    expect(future).toMatchObject({
      state: "future",
      hasDueMarker: true,
    });
    expect(calendar.recovery.oldestMissedDate).toBe("2026-03-25");
    expect(calendar.recovery.missedCount).toBe(1);
    expect(calendar.grid).toHaveLength(35);
    expect(calendar.grid.length % 7).toBe(0);
  });

  it("builds leading spacer cells before the first day of months that start midweek", () => {
    const calendar = buildCalendarMonth({
      month: "2026-04",
      today: "2026-04-15",
      entries: [],
      checkIns: [],
      debts: [],
    });

    expect(calendar.grid.slice(0, 3)).toEqual([
      { kind: "spacer", key: "leading-0" },
      { kind: "spacer", key: "leading-1" },
      { kind: "spacer", key: "leading-2" },
    ]);
    expect(calendar.grid[3]).toMatchObject({
      kind: "day",
      day: { date: "2026-04-01" },
    });
    expect(calendar.grid.length % 7).toBe(0);
  });
});

describe("evaluateReminderPlan", () => {
  it("schedules daily, catch-up, and debt-due reminders without guilt-driven spam", () => {
    const plan = evaluateReminderPlan({
      localDate: "2026-03-27",
      localTime: "19:30",
      localWeekday: 5,
      today: "2026-03-27",
      settings: {
        remindersEnabled: true,
        reminderTime: "19:00",
        reminderDays: [0, 1, 2, 3, 4, 5, 6],
        catchUpReminderEnabled: true,
        debtDueReminderEnabled: true,
        quietHoursStart: "21:30",
        quietHoursEnd: "08:00",
        weekendRemindersEnabled: true,
      },
      checkIns: [
        {
          date: "2026-03-24",
          completed: true,
          completedAt: "2026-03-24T21:00:00Z",
          isPartial: false,
          note: null,
        },
      ],
      debts: [
        {
          id: "debt-card",
          name: "Card",
          lender: "Bank",
          balanceCurrent: 500,
          interestRate: null,
          minimumPayment: 50,
          dueDay: 30,
          createdAt: "2026-03-01T00:00:00Z",
          updatedAt: "2026-03-01T00:00:00Z",
          isActive: true,
        },
      ],
      deliveryHistory: {
        dailyCheckIn: [],
        catchUpGentleNudge: [],
        debtDueSoon: [],
      },
    });

    expect(plan.dailyCheckIn?.shouldSend).toBe(true);
    expect(plan.catchUpGentleNudge?.shouldSend).toBe(true);
    expect(plan.debtDueSoon).toEqual([
      {
        debtId: "debt-card",
        shouldSend: true,
      },
    ]);
  });

  it("suppresses reminders during quiet hours and after a recent catch-up nudge", () => {
    const plan = evaluateReminderPlan({
      localDate: "2026-03-27",
      localTime: "02:00",
      localWeekday: 5,
      today: "2026-03-27",
      settings: {
        remindersEnabled: true,
        reminderTime: "19:00",
        reminderDays: [0, 1, 2, 3, 4, 5, 6],
        catchUpReminderEnabled: true,
        debtDueReminderEnabled: false,
        quietHoursStart: "21:30",
        quietHoursEnd: "08:00",
        weekendRemindersEnabled: true,
      },
      checkIns: [
        {
          date: "2026-03-20",
          completed: true,
          completedAt: "2026-03-20T21:00:00Z",
          isPartial: false,
          note: null,
        },
      ],
      debts: [],
      deliveryHistory: {
        dailyCheckIn: [],
        catchUpGentleNudge: ["2026-03-26T19:05:00Z"],
        debtDueSoon: [],
      },
    });

    expect(plan.dailyCheckIn?.shouldSend).toBe(false);
    expect(plan.dailyCheckIn?.reason).toBe("quiet_hours");
    expect(plan.catchUpGentleNudge?.shouldSend).toBe(false);
    expect(plan.catchUpGentleNudge?.reason).toBe("recently_sent");
  });

  it("uses local weekday scheduling rather than UTC-derived day boundaries", () => {
    const plan = evaluateReminderPlan({
      localDate: "2026-03-29",
      localTime: "19:05",
      localWeekday: 0,
      today: "2026-03-29",
      settings: {
        remindersEnabled: true,
        reminderTime: "19:00",
        reminderDays: [1, 2, 3, 4, 5],
        catchUpReminderEnabled: true,
        debtDueReminderEnabled: true,
        quietHoursStart: "21:30",
        quietHoursEnd: "08:00",
        weekendRemindersEnabled: false,
      },
      checkIns: [],
      debts: [],
      deliveryHistory: {
        dailyCheckIn: [],
        catchUpGentleNudge: [],
        debtDueSoon: [],
      },
    });

    expect(plan.dailyCheckIn?.shouldSend).toBe(false);
    expect(plan.dailyCheckIn?.reason).toBe("not_scheduled_day");
  });
});
