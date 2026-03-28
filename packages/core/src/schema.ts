import { z } from "zod";

export const entryTypeSchema = z.enum(["income", "expense", "debt_payment"]);
export const categoryTypeSchema = z.enum(["income", "expense", "both"]);

export const categorySchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  type: categoryTypeSchema,
});

export const entrySchema = z.object({
  id: z.string(),
  type: entryTypeSchema,
  amount: z.number().nonnegative(),
  categoryId: z.string().nullable(),
  debtId: z.string().nullable(),
  note: z.string().nullable(),
  entryDate: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  source: z.enum(["manual", "catch_up", "seed", "import", "api", "cli", "mcp"]),
  isEstimated: z.boolean(),
});

export const debtSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  lender: z.string().nullable(),
  balanceCurrent: z.number(),
  interestRate: z.number().nullable(),
  minimumPayment: z.number().nullable(),
  dueDay: z.number().int().min(1).max(31).nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  isActive: z.boolean(),
});

export const checkInSchema = z.object({
  date: z.string(),
  completed: z.boolean(),
  completedAt: z.string().nullable(),
  isPartial: z.boolean(),
  note: z.string().nullable(),
});

export const todaySummarySchema = z.object({
  todayMoneyIn: z.number(),
  todayMoneyOut: z.number(),
  monthMoneyIn: z.number(),
  monthMoneyOut: z.number(),
  monthNetMargin: z.number(),
  debtOutstanding: z.number(),
  missedCheckInDaysCount: z.number(),
  isTodayCheckedIn: z.boolean(),
});

export type Category = z.infer<typeof categorySchema>;
export type CategoryType = z.infer<typeof categoryTypeSchema>;
export type Entry = z.infer<typeof entrySchema>;
export type EntryType = z.infer<typeof entryTypeSchema>;
export type Debt = z.infer<typeof debtSchema>;
export type CheckIn = z.infer<typeof checkInSchema>;
export type TodaySummary = z.infer<typeof todaySummarySchema>;

export const entryInputSchema = entrySchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const debtInputSchema = debtSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
