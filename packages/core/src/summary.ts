import type { CheckIn, Debt, Entry, TodaySummary } from "./schema";
import { checkInSchema, debtSchema, entrySchema } from "./schema";
import { compareIsoDates, isSameMonth, listDatesBetween } from "./dates";

function normalizeMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function calculateTodaySummary(input: {
  entries: Entry[];
  debts: Debt[];
  checkIns: CheckIn[];
  today: string;
}): TodaySummary {
  const entries = input.entries.map((entry) => entrySchema.parse(entry));
  const debts = input.debts.map((debt) => debtSchema.parse(debt));
  const checkIns = input.checkIns.map((checkIn) => checkInSchema.parse(checkIn));

  let todayMoneyIn = 0;
  let todayMoneyOut = 0;
  let monthMoneyIn = 0;
  let monthMoneyOut = 0;

  for (const entry of entries) {
    const isToday = entry.entryDate === input.today;
    const isCurrentMonth = isSameMonth(entry.entryDate, input.today);

    if (entry.type === "income") {
      if (isToday) {
        todayMoneyIn += entry.amount;
      }

      if (isCurrentMonth) {
        monthMoneyIn += entry.amount;
      }
    } else {
      if (isToday) {
        todayMoneyOut += entry.amount;
      }

      if (isCurrentMonth) {
        monthMoneyOut += entry.amount;
      }
    }
  }

  const debtOutstanding = debts
    .filter((debt) => debt.isActive)
    .reduce((total, debt) => total + debt.balanceCurrent, 0);

  const missedDates = getMissedCheckInDates(checkIns, input.today);
  const todayCheckIn = checkIns.find((checkIn) => checkIn.date === input.today);

  return {
    todayMoneyIn: normalizeMoney(todayMoneyIn),
    todayMoneyOut: normalizeMoney(todayMoneyOut),
    monthMoneyIn: normalizeMoney(monthMoneyIn),
    monthMoneyOut: normalizeMoney(monthMoneyOut),
    monthNetMargin: normalizeMoney(monthMoneyIn - monthMoneyOut),
    debtOutstanding: normalizeMoney(debtOutstanding),
    missedCheckInDaysCount: missedDates.length,
    isTodayCheckedIn: Boolean(todayCheckIn && (todayCheckIn.completed || todayCheckIn.isPartial)),
  };
}

export function getMissedCheckInDates(checkIns: CheckIn[], today: string): string[] {
  const normalized = checkIns
    .map((checkIn) => checkInSchema.parse(checkIn))
    .filter((checkIn) => checkIn.completed || checkIn.isPartial)
    .sort((left, right) => compareIsoDates(left.date, right.date));

  if (normalized.length === 0) {
    return [];
  }

  const lastCompleted = normalized[normalized.length - 1];

  if (compareIsoDates(lastCompleted.date, today) >= 0) {
    return [];
  }

  return listDatesBetween(lastCompleted.date, today).slice(1, -1);
}
