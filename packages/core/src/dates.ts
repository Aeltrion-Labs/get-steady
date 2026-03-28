const DAY_IN_MS = 24 * 60 * 60 * 1000;

function toUtcDate(value: string): Date {
  return new Date(`${value}T00:00:00Z`);
}

export function isoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function listDatesBetween(startDate: string, endDate: string): string[] {
  const results: string[] = [];
  let cursor = toUtcDate(startDate).getTime();
  const end = toUtcDate(endDate).getTime();

  while (cursor <= end) {
    results.push(isoDate(new Date(cursor)));
    cursor += DAY_IN_MS;
  }

  return results;
}

export function isSameMonth(left: string, right: string): boolean {
  return left.slice(0, 7) === right.slice(0, 7);
}

export function compareIsoDates(left: string, right: string): number {
  return left.localeCompare(right);
}
