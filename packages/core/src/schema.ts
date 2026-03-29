import { z } from "zod";

export const entryTypeSchema = z.enum(["income", "expense", "debt_payment"]);
export const categoryTypeSchema = z.enum(["income", "expense", "both"]);
export const entrySourceSchema = z.enum([
  "manual",
  "catch_up",
  "seed",
  "import",
  "api",
  "cli",
  "mcp",
]);
export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected date in YYYY-MM-DD format.");
export const hhmmTimeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Expected time in HH:MM format.");

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
  entryDate: isoDateSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  source: entrySourceSchema,
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
  date: isoDateSchema,
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

export const missionStatusSchema = z.enum([
  "on_track",
  "cashflow_negative",
  "debt_stalled",
  "high_risk",
]);
export const analyticsDirectionSchema = z.enum(["improving", "flat", "worsening"]);

export const analyticsPeriodSchema = z.object({
  label: z.string(),
  income: z.number(),
  outflow: z.number(),
  netMargin: z.number(),
  debtPayments: z.number(),
});

export const debtSeriesPointSchema = z.object({
  label: z.string(),
  value: z.number(),
});

export const cashflowSeriesPointSchema = z.object({
  label: z.string(),
  income: z.number(),
  outflow: z.number(),
  netMargin: z.number(),
});

export const analyticsSummarySchema = z.object({
  missionStatus: missionStatusSchema,
  primaryMessage: z.string(),
  secondaryMessage: z.string(),
  confidenceMessage: z.string(),
  hasDataConfidenceWarning: z.boolean(),
  currentMonth: analyticsPeriodSchema,
  previousMonth: analyticsPeriodSchema,
  debtOutstanding: z.number(),
  debtPaymentChange: z.number(),
  netMarginChange: z.number(),
  estimatedMonthsToDebtFree: z.number().nullable(),
  cashflowDirection: analyticsDirectionSchema,
  focusItems: z.array(z.string()),
  debtSeries: z.array(debtSeriesPointSchema),
  cashflowSeries: z.array(cashflowSeriesPointSchema),
});

export const appViewSchema = z.enum([
  "today",
  "calendar",
  "ledger",
  "debts",
  "analytics",
  "settings",
]);
export const catchUpPromptModeSchema = z.enum(["always", "when_missed", "hidden"]);
export const dailyReviewModeSchema = z.enum(["simple", "quick"]);
export const themeModeSchema = z.enum(["system", "light", "dark"]);

export const onboardingStateSchema = z.object({
  hasCompletedOnboarding: z.boolean(),
  onboardingCompletedAt: z.string().nullable().optional(),
  dailyCheckInTime: hhmmTimeSchema.nullable(),
  remindersEnabled: z.boolean(),
  dailyReviewMode: dailyReviewModeSchema,
  selectedCategoryIds: z.array(z.string()),
});

export const userSettingsSchema = z.object({
  defaultView: appViewSchema,
  themeMode: themeModeSchema,
  remindersEnabled: z.boolean(),
  reminderTime: hhmmTimeSchema,
  reminderDays: z.array(z.number().int().min(0).max(6)),
  catchUpReminderEnabled: z.boolean(),
  debtDueReminderEnabled: z.boolean(),
  quietHoursStart: hhmmTimeSchema,
  quietHoursEnd: hhmmTimeSchema,
  weekendRemindersEnabled: z.boolean(),
  catchUpPromptMode: catchUpPromptModeSchema,
  showAdvancedOptions: z.boolean(),
});

export type Category = z.infer<typeof categorySchema>;
export type CategoryType = z.infer<typeof categoryTypeSchema>;
export type Entry = z.infer<typeof entrySchema>;
export type EntryType = z.infer<typeof entryTypeSchema>;
export type EntrySource = z.infer<typeof entrySourceSchema>;
export type Debt = z.infer<typeof debtSchema>;
export type CheckIn = z.infer<typeof checkInSchema>;
export type TodaySummary = z.infer<typeof todaySummarySchema>;
export type MissionStatus = z.infer<typeof missionStatusSchema>;
export type AnalyticsDirection = z.infer<typeof analyticsDirectionSchema>;
export type AnalyticsPeriod = z.infer<typeof analyticsPeriodSchema>;
export type DebtSeriesPoint = z.infer<typeof debtSeriesPointSchema>;
export type CashflowSeriesPoint = z.infer<typeof cashflowSeriesPointSchema>;
export type AnalyticsSummary = z.infer<typeof analyticsSummarySchema>;
export type AppView = z.infer<typeof appViewSchema>;
export type CatchUpPromptMode = z.infer<typeof catchUpPromptModeSchema>;
export type DailyReviewMode = z.infer<typeof dailyReviewModeSchema>;
export type ThemeMode = z.infer<typeof themeModeSchema>;
export type OnboardingState = z.infer<typeof onboardingStateSchema>;
export type UserSettings = z.infer<typeof userSettingsSchema>;

export const entryInputSchema = entrySchema
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .superRefine((value, ctx) => {
    if (value.amount <= 0) {
      ctx.addIssue({
        code: "custom",
        message: "Amount must be greater than zero.",
        path: ["amount"],
      });
    }

    if (value.type === "debt_payment") {
      if (!value.debtId) {
        ctx.addIssue({
          code: "custom",
          message: "Debt payment entries must be linked to a debt.",
          path: ["debtId"],
        });
      }
    } else {
      if (!value.categoryId) {
        ctx.addIssue({
          code: "custom",
          message: "Entries must include a category.",
          path: ["categoryId"],
        });
      }
      if (value.debtId) {
        ctx.addIssue({
          code: "custom",
          message: "Only debt payment entries may include a debt link.",
          path: ["debtId"],
        });
      }
    }
  });

export const debtInputSchema = debtSchema
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .superRefine((value, ctx) => {
    if (value.balanceCurrent < 0) {
      ctx.addIssue({
        code: "custom",
        message: "Balance cannot be negative.",
        path: ["balanceCurrent"],
      });
    }
    if (value.interestRate !== null && value.interestRate < 0) {
      ctx.addIssue({
        code: "custom",
        message: "Interest rate cannot be negative.",
        path: ["interestRate"],
      });
    }
    if (value.minimumPayment !== null && value.minimumPayment < 0) {
      ctx.addIssue({
        code: "custom",
        message: "Minimum payment cannot be negative.",
        path: ["minimumPayment"],
      });
    }
  });

export const checkInInputSchema = z.object({
  date: isoDateSchema,
  isPartial: z.boolean(),
  note: z.string().nullable(),
});

export const onboardingInputSchema = z.object({
  dailyCheckInTime: hhmmTimeSchema.nullable(),
  remindersEnabled: z.boolean(),
  dailyReviewMode: dailyReviewModeSchema.optional(),
  selectedCategoryIds: z.array(z.string()),
});

export type EntryInput = z.infer<typeof entryInputSchema>;
export type DebtInput = z.infer<typeof debtInputSchema> & { id?: string };
export type CheckInInput = z.infer<typeof checkInInputSchema>;
export type OnboardingInput = z.infer<typeof onboardingInputSchema>;
export type UserSettingsInput = z.infer<typeof userSettingsSchema>;
