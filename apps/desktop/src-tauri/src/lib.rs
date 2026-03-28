mod db;
mod models;

use db::{
    bootstrap, create_backup, delete_debt, delete_entry, export_debts_csv, export_entries_csv, list_entries,
    mark_check_in, open_connection, record_debt_payment, save_debt, save_entry, save_onboarding, save_settings,
};
use models::{BootstrapPayload, CheckInInput, DebtInput, DebtPaymentInput, EntryFilters, EntryInput, OnboardingInput, UserSettingsInput};

#[tauri::command]
fn bootstrap_app(app: tauri::AppHandle) -> Result<BootstrapPayload, String> {
    bootstrap(&app)
}

#[tauri::command]
fn list_entries_command(
    app: tauri::AppHandle,
    filters: Option<EntryFilters>,
) -> Result<Vec<models::EntryRecord>, String> {
    let (connection, _) = open_connection(&app)?;
    list_entries(&connection, filters)
}

#[tauri::command]
fn save_entry_command(app: tauri::AppHandle, input: EntryInput) -> Result<models::EntryRecord, String> {
    save_entry(&app, input)
}

#[tauri::command]
fn delete_entry_command(app: tauri::AppHandle, entry_id: String) -> Result<(), String> {
    delete_entry(&app, entry_id)
}

#[tauri::command]
fn save_debt_command(app: tauri::AppHandle, input: DebtInput) -> Result<models::DebtRecord, String> {
    save_debt(&app, input)
}

#[tauri::command]
fn delete_debt_command(app: tauri::AppHandle, debt_id: String) -> Result<(), String> {
    delete_debt(&app, debt_id)
}

#[tauri::command]
fn record_debt_payment_command(app: tauri::AppHandle, input: DebtPaymentInput) -> Result<models::EntryRecord, String> {
    record_debt_payment(&app, input)
}

#[tauri::command]
fn mark_check_in_command(app: tauri::AppHandle, input: CheckInInput) -> Result<models::CheckInRecord, String> {
    mark_check_in(&app, input)
}

#[tauri::command]
fn save_onboarding_command(app: tauri::AppHandle, input: OnboardingInput) -> Result<models::OnboardingStateRecord, String> {
    save_onboarding(&app, input)
}

#[tauri::command]
fn save_settings_command(app: tauri::AppHandle, input: UserSettingsInput) -> Result<models::UserSettingsRecord, String> {
    save_settings(&app, input)
}

#[tauri::command]
fn export_entries_csv_command(app: tauri::AppHandle, destination: String) -> Result<String, String> {
    export_entries_csv(&app, &destination)
}

#[tauri::command]
fn export_debts_csv_command(app: tauri::AppHandle, destination: String) -> Result<String, String> {
    export_debts_csv(&app, &destination)
}

#[tauri::command]
fn create_backup_command(app: tauri::AppHandle, destination: String) -> Result<String, String> {
    create_backup(&app, &destination)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            bootstrap_app,
            list_entries_command,
            save_entry_command,
            delete_entry_command,
            save_debt_command,
            delete_debt_command,
            record_debt_payment_command,
            mark_check_in_command,
            save_onboarding_command,
            save_settings_command,
            export_entries_csv_command,
            export_debts_csv_command,
            create_backup_command,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
