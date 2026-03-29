import { invoke } from "@tauri-apps/api/core";
import type {
  Category,
  CheckIn,
  CheckInInput as CoreCheckInInput,
  Debt,
  DebtInput as CoreDebtInput,
  Entry,
  EntryInput as CoreEntryInput,
  OnboardingInput as CoreOnboardingInput,
  OnboardingState,
  UserSettings,
  UserSettingsInput as CoreUserSettingsInput,
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
  backupSummary: BackupSummary;
  backups: BackupRecord[];
};

export type BackupRecord = {
  id: string;
  kind: "auto" | "manual" | "pre-restore" | string;
  status: "success" | "failed" | string;
  filePath: string;
  fileName: string;
  createdAt: string;
  completedAt: string | null;
  sizeBytes: number | null;
  errorMessage: string | null;
  triggeredBy: string;
};

export type BackupSummary = {
  lastSuccessfulAutomaticBackupAt: string | null;
  nextAutomaticBackupDueAt: string | null;
  retentionPolicy: string;
};

export type EntryInput = CoreEntryInput & { id?: string };
export type DebtInput = CoreDebtInput;
export type CheckInInput = CoreCheckInInput;
export type OnboardingInput = CoreOnboardingInput;
export type UserSettingsInput = CoreUserSettingsInput;

export type DebtPaymentInput = {
  debtId: string;
  amount: number;
  entryDate: string;
  note: string | null;
};

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

export async function listBackups() {
  return invoke<BackupRecord[]>("list_backups_command");
}

export async function createManualBackup() {
  return invoke<BackupRecord>("create_manual_backup_command");
}

export async function runAutomaticBackup() {
  return invoke<BackupRecord | null>("run_automatic_backup_command");
}

export async function restoreBackup(backupId: string) {
  return invoke<void>("restore_backup_command", { backupId });
}
