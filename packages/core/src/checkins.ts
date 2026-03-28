import type { CheckIn } from "./schema";

export function buildCheckInRecord(input: {
  date: string;
  completed?: boolean;
  completedAt?: string | null;
  isPartial?: boolean;
  note?: string | null;
}): CheckIn {
  const completed = input.completed ?? true;

  return {
    date: input.date,
    completed,
    completedAt: completed ? input.completedAt ?? new Date(`${input.date}T23:59:59Z`).toISOString() : null,
    isPartial: input.isPartial ?? false,
    note: input.note ?? null,
  };
}
