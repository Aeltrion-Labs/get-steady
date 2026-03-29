import { invoke } from "@tauri-apps/api/core";
import type {
  Category,
  CheckIn,
  Debt,
  Entry,
  OnboardingState,
  UserSettings,
} from "@get-steady/core";

export type BootstrapPayload = {
  dataPath: string;
  backupDirectory: string;
  exportDirectory: string;
  categories: Category[];
  entries: Entry[];
  debts: Debt[];
  checkIns: CheckIn[];
  onboarding: OnboardingState;
  settings: UserSettings;
};

export type EntryInput = {
  id?: string;
  type: "income" | "expense" | "debt_payment";
  amount: number;
  categoryId: string | null;
  debtId: string | null;
  note: string | null;
  entryDate: string;
  source: "manual" | "catch_up" | "seed" | "import" | "api" | "cli" | "mcp";
  isEstimated: boolean;
};

export type DebtInput = {
  id?: string;
  name: string;
  lender: string | null;
  balanceCurrent: number;
  interestRate: number | null;
  minimumPayment: number | null;
  dueDay: number | null;
  isActive: boolean;
};

export type DebtPaymentInput = {
  debtId: string;
  amount: number;
  entryDate: string;
  note: string | null;
};

export type CheckInInput = {
  date: string;
  isPartial: boolean;
  note: string | null;
};

export type OnboardingInput = {
  dailyCheckInTime: string | null;
  remindersEnabled: boolean;
  dailyReviewMode?: "simple" | "quick";
  selectedCategoryIds: string[];
};

export type UserSettingsInput = UserSettings;

export async function bootstrapApp() {
  return invoke<BootstrapPayload>("bootstrap_app");
}

export async function saveEntry(input: EntryInput) {
  return invoke<Entry>("save_entry_command", { input });
}

export async function deleteEntry(entryId: string) {
  return invoke<void>("delete_entry_command", { entryId });
}

export async function saveDebt(input: DebtInput) {
  return invoke<Debt>("save_debt_command", { input });
}

export async function deleteDebt(debtId: string) {
  return invoke<void>("delete_debt_command", { debtId });
}

export async function recordDebtPayment(input: DebtPaymentInput) {
  return invoke<Entry>("record_debt_payment_command", { input });
}

export async function markCheckIn(input: CheckInInput) {
  return invoke<CheckIn>("mark_check_in_command", { input });
}

export async function saveOnboarding(input: OnboardingInput) {
  return invoke<OnboardingState>("save_onboarding_command", { input });
}

export async function saveSettings(input: UserSettingsInput) {
  return invoke<UserSettings>("save_settings_command", { input });
}

export async function exportEntriesCsv(destination: string) {
  return invoke<string>("export_entries_csv_command", { destination });
}

export async function exportDebtsCsv(destination: string) {
  return invoke<string>("export_debts_csv_command", { destination });
}

export async function createBackup(destination: string) {
  return invoke<string>("create_backup_command", { destination });
}
