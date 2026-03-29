import type { Debt, Entry } from "./schema";

function escapeCsvValue(value: string | number | null): string {
  if (value === null) {
    return "";
  }

  const text = String(value);
  if (text.includes(",") || text.includes('"') || text.includes("\n")) {
    return `"${text.replaceAll('"', '""')}"`;
  }

  return text;
}

export function buildEntriesCsv(entries: Entry[]): string {
  const header = [
    "Entry ID",
    "Type",
    "Amount",
    "Category ID",
    "Debt ID",
    "Note",
    "Entry Date",
    "Estimated",
    "Source",
    "Created At",
    "Updated At",
  ];

  const rows = entries.map((entry) => [
    entry.id,
    entry.type,
    entry.amount.toFixed(2),
    entry.categoryId,
    entry.debtId,
    entry.note,
    entry.entryDate,
    entry.isEstimated ? "Yes" : "No",
    entry.source,
    entry.createdAt,
    entry.updatedAt,
  ]);

  return [header, ...rows]
    .map((row) => row.map((cell) => escapeCsvValue(cell)).join(","))
    .join("\n");
}

export function buildDebtsCsv(debts: Debt[]): string {
  const header = [
    "Debt ID",
    "Name",
    "Lender",
    "Current Balance",
    "Interest Rate",
    "Minimum Payment",
    "Due Day",
    "Active",
    "Created At",
    "Updated At",
  ];

  const rows = debts.map((debt) => [
    debt.id,
    debt.name,
    debt.lender,
    debt.balanceCurrent.toFixed(2),
    debt.interestRate,
    debt.minimumPayment,
    debt.dueDay,
    debt.isActive ? "Yes" : "No",
    debt.createdAt,
    debt.updatedAt,
  ]);

  return [header, ...rows]
    .map((row) => row.map((cell) => escapeCsvValue(cell)).join(","))
    .join("\n");
}
