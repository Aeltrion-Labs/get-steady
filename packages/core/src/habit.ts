import type { CheckIn, Debt, Entry } from "./schema";
import { compareIsoDates, isoDate, listDatesBetween } from "./dates";

export type CalendarDayState = "complete" | "partial" | "missed" | "future";

export type CalendarDay = {
  date: string;
  state: CalendarDayState;
  moneyIn: number;
  moneyOut: number;
  net: number;
  hasEntries: boolean;
  hasDebtPayment: boolean;
  hasDueMarker: boolean;
};

export type CalendarGridCell =
  | {
      kind: "spacer";
      key: string;
    }
  | {
      kind: "day";
      key: string;
      day: CalendarDay;
    };

export type ReminderSettings = {
  remindersEnabled: boolean;
  reminderTime: string;
  reminderDays: number[];
  catchUpReminderEnabled: boolean;
  debtDueReminderEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  weekendRemindersEnabled: boolean;
};

export type ReminderResult = {
  shouldSend: boolean;
  reason?: string;
};

export function buildCalendarMonth(input: {
  month: string;
  today: string;
  entries: Entry[];
  checkIns: CheckIn[];
  debts: Debt[];
}) {
  const [yearText, monthText] = input.month.split("-");
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;
  const firstDate = isoDate(new Date(Date.UTC(year, monthIndex, 1)));
  const lastDate = isoDate(new Date(Date.UTC(year, monthIndex + 1, 0)));
  const leadingSpacerCount = new Date(Date.UTC(year, monthIndex, 1)).getUTCDay();

  const days = listDatesBetween(firstDate, lastDate).map((date) => {
    const dayEntries = input.entries.filter((entry) => entry.entryDate === date);
    const checkIn = input.checkIns.find((item) => item.date === date);
    const moneyIn = dayEntries
      .filter((entry) => entry.type === "income")
      .reduce((total, entry) => total + entry.amount, 0);
    const moneyOut = dayEntries
      .filter((entry) => entry.type !== "income")
      .reduce((total, entry) => total + entry.amount, 0);

    let state: CalendarDayState = "missed";
    if (compareIsoDates(date, input.today) > 0) {
      state = "future";
    } else if (checkIn?.completed) {
      state = "complete";
    } else if (checkIn?.isPartial) {
      state = "partial";
    }

    return {
      date,
      state,
      moneyIn: normalizeMoney(moneyIn),
      moneyOut: normalizeMoney(moneyOut),
      net: normalizeMoney(moneyIn - moneyOut),
      hasEntries: dayEntries.length > 0,
      hasDebtPayment: dayEntries.some((entry) => entry.type === "debt_payment"),
      hasDueMarker: input.debts.some((debt) => debt.isActive && debt.dueDay !== null && isDueSoonMarker(date, debt.dueDay)),
    };
  });

  const missedDays = days.filter((day) => {
    if (day.state !== "missed") {
      return false;
    }
    const firstTrackedDate = input.checkIns
      .filter((checkIn) => (checkIn.completed || checkIn.isPartial) && checkIn.date.startsWith(input.month))
      .sort((left, right) => compareIsoDates(left.date, right.date))
      .at(0)?.date;
    if (!firstTrackedDate) {
      return compareIsoDates(day.date, input.today) < 0;
    }
    return compareIsoDates(day.date, firstTrackedDate) > 0 && compareIsoDates(day.date, input.today) < 0;
  });

  const leadingSpacers: CalendarGridCell[] = Array.from({ length: leadingSpacerCount }, (_, index) => ({
    kind: "spacer",
    key: `leading-${index}`,
  }));
  const dayCells: CalendarGridCell[] = days.map((day) => ({
    kind: "day",
    key: day.date,
    day,
  }));
  const trailingSpacerCount = (7 - ((leadingSpacers.length + dayCells.length) % 7)) % 7;
  const trailingSpacers: CalendarGridCell[] = Array.from({ length: trailingSpacerCount }, (_, index) => ({
    kind: "spacer",
    key: `trailing-${index}`,
  }));

  return {
    month: input.month,
    days,
    grid: [...leadingSpacers, ...dayCells, ...trailingSpacers],
    recovery: {
      oldestMissedDate: missedDays[0]?.date ?? null,
      missedCount: missedDays.length,
    },
  };
}

export function evaluateReminderPlan(input: {
  localDate: string;
  localTime: string;
  localWeekday: number;
  today: string;
  settings: ReminderSettings;
  checkIns: CheckIn[];
  debts: Debt[];
  deliveryHistory: {
    dailyCheckIn: string[];
    catchUpGentleNudge: string[];
    debtDueSoon: string[];
  };
}) {
  return {
    dailyCheckIn: evaluateDailyCheckIn(input),
    catchUpGentleNudge: evaluateCatchUp(input),
    debtDueSoon: input.debts
      .filter((debt) => debt.isActive && debt.dueDay !== null)
      .map((debt) => ({
        debtId: debt.id,
        ...evaluateDebtDue(input, debt),
      })),
  };
}

function evaluateDailyCheckIn(input: {
  localTime: string;
  localWeekday: number;
  today: string;
  settings: ReminderSettings;
  checkIns: CheckIn[];
  deliveryHistory: {
    dailyCheckIn: string[];
  };
}): ReminderResult {
  if (!input.settings.remindersEnabled) {
    return { shouldSend: false, reason: "disabled" };
  }
  if (isWithinQuietHours(input.localTime, input.settings)) {
    return { shouldSend: false, reason: "quiet_hours" };
  }
  if (!isReminderDay(input.localWeekday, input.settings)) {
    return { shouldSend: false, reason: "not_scheduled_day" };
  }
  if (!hasReachedReminderTime(input.localTime, input.settings.reminderTime)) {
    return { shouldSend: false, reason: "too_early" };
  }
  if (input.checkIns.some((checkIn) => checkIn.date === input.today && (checkIn.completed || checkIn.isPartial))) {
    return { shouldSend: false, reason: "already_checked_in" };
  }
  if (input.deliveryHistory.dailyCheckIn.some((timestamp) => timestamp.startsWith(input.today))) {
    return { shouldSend: false, reason: "already_sent_today" };
  }
  return { shouldSend: true };
}

function evaluateCatchUp(input: {
  localTime: string;
  today: string;
  settings: ReminderSettings;
  checkIns: CheckIn[];
  deliveryHistory: {
    catchUpGentleNudge: string[];
  };
}): ReminderResult {
  if (!input.settings.remindersEnabled || !input.settings.catchUpReminderEnabled) {
    return { shouldSend: false, reason: "disabled" };
  }
  const lastCompleted = input.checkIns
    .filter((checkIn) => checkIn.completed || checkIn.isPartial)
    .sort((left, right) => compareIsoDates(left.date, right.date))
    .at(-1);

  if (!lastCompleted) {
    return { shouldSend: false, reason: "no_history" };
  }

  const missedDays = listDatesBetween(lastCompleted.date, input.today).slice(1);
  if (missedDays.length < 2) {
    return { shouldSend: false, reason: "not_enough_missed_days" };
  }

  const lastSent = input.deliveryHistory.catchUpGentleNudge
    .slice()
    .sort((left, right) => left.localeCompare(right))
    .at(-1);
  if (lastSent) {
    const daysSinceLastSent = differenceInDays(lastSent.slice(0, 10), input.today);
    if (daysSinceLastSent < 3) {
      return { shouldSend: false, reason: "recently_sent" };
    }
  }

  if (isWithinQuietHours(input.localTime, input.settings)) {
    return { shouldSend: false, reason: "quiet_hours" };
  }

  return { shouldSend: true };
}

function evaluateDebtDue(
  input: {
    localTime: string;
    today: string;
    settings: ReminderSettings;
    deliveryHistory: {
      debtDueSoon: string[];
    };
  },
  debt: Debt,
): ReminderResult {
  if (!input.settings.remindersEnabled || !input.settings.debtDueReminderEnabled) {
    return { shouldSend: false, reason: "disabled" };
  }
  if (isWithinQuietHours(input.localTime, input.settings)) {
    return { shouldSend: false, reason: "quiet_hours" };
  }
  if (!hasReachedReminderTime(input.localTime, input.settings.reminderTime)) {
    return { shouldSend: false, reason: "too_early" };
  }

  const dueDay = debt.dueDay;
  if (dueDay === null) {
    return { shouldSend: false, reason: "no_due_day" };
  }
  const [yearText, monthText] = input.today.split("-");
  const dueDate = isoDate(new Date(Date.UTC(Number(yearText), Number(monthText) - 1, dueDay)));
  if (differenceInDays(input.today, dueDate) !== 3) {
    return { shouldSend: false, reason: "not_due_soon" };
  }
  const alreadySent = input.deliveryHistory.debtDueSoon.some((timestamp) => timestamp.startsWith(input.today));
  if (alreadySent) {
    return { shouldSend: false, reason: "already_sent_today" };
  }
  return { shouldSend: true };
}

function isReminderDay(localWeekday: number, settings: ReminderSettings) {
  if (!settings.weekendRemindersEnabled && (localWeekday === 0 || localWeekday === 6)) {
    return false;
  }
  return settings.reminderDays.includes(localWeekday);
}

function hasReachedReminderTime(localTime: string, reminderTime: string) {
  return localTime >= reminderTime;
}

function isWithinQuietHours(localTime: string, settings: ReminderSettings) {
  if (settings.quietHoursStart <= settings.quietHoursEnd) {
    return localTime >= settings.quietHoursStart && localTime < settings.quietHoursEnd;
  }
  return localTime >= settings.quietHoursStart || localTime < settings.quietHoursEnd;
}

function isDueSoonMarker(date: string, dueDay: number) {
  const markerDay = isoDate(new Date(Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, dueDay)));
  return date === markerDay;
}

function differenceInDays(startDate: string, endDate: string) {
  return listDatesBetween(startDate, endDate).length - 1;
}

function normalizeMoney(value: number) {
  return Math.round(value * 100) / 100;
}
