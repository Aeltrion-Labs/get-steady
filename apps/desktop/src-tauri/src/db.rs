use crate::models::{
    BackupRecord, BackupSummaryRecord, BootstrapPayload, CategoryRecord, CheckInInput, CheckInRecord, DebtInput,
    DebtPaymentInput, DebtRecord, EntryFilters, EntryInput, EntryRecord, OnboardingInput, OnboardingStateRecord,
    UserSettingsInput, UserSettingsRecord,
};
use rusqlite::{params, params_from_iter, Connection, OptionalExtension, ToSql};
use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};
use time::{Duration, OffsetDateTime};
use uuid::Uuid;

const SCHEMA_VERSION: i64 = 7;
const BACKUP_RETENTION_POLICY: &str = "7 daily, 4 weekly, 6 monthly";

pub struct AppPaths {
    pub backup_dir: PathBuf,
    pub export_dir: PathBuf,
    pub db_path: PathBuf,
}

pub fn open_connection(app: &AppHandle) -> Result<(Connection, AppPaths), String> {
    let base_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("failed to resolve app data dir: {error}"))?;

    let data_dir = base_dir.join("data");
    let backup_dir = base_dir.join("backups");
    let export_dir = base_dir.join("exports");
    let db_path = data_dir.join("steady.sqlite");

    fs::create_dir_all(&data_dir).map_err(|error| format!("failed to create data dir: {error}"))?;
    fs::create_dir_all(&backup_dir).map_err(|error| format!("failed to create backup dir: {error}"))?;
    fs::create_dir_all(&export_dir).map_err(|error| format!("failed to create export dir: {error}"))?;

    let connection = Connection::open(&db_path).map_err(|error| format!("failed to open database: {error}"))?;
    connection
        .pragma_update(None, "foreign_keys", true)
        .map_err(|error| format!("failed to enable foreign keys: {error}"))?;
    connection
        .pragma_update(None, "journal_mode", "WAL")
        .map_err(|error| format!("failed to enable WAL mode: {error}"))?;
    connection
        .busy_timeout(std::time::Duration::from_secs(5))
        .map_err(|error| format!("failed to set busy timeout: {error}"))?;

    run_migrations(&connection)?;

    Ok((
        connection,
        AppPaths {
            backup_dir,
            export_dir,
            db_path,
        },
    ))
}

fn now() -> String {
    OffsetDateTime::now_utc()
        .format(&time::format_description::well_known::Rfc3339)
        .unwrap_or_else(|_| "1970-01-01T00:00:00Z".to_string())
}

fn is_valid_iso_date(value: &str) -> bool {
    if value.len() != 10 {
        return false;
    }

    let bytes = value.as_bytes();
    if bytes[4] != b'-' || bytes[7] != b'-' {
        return false;
    }

    if !bytes
        .iter()
        .enumerate()
        .all(|(index, byte)| matches!(index, 4 | 7) || byte.is_ascii_digit())
    {
        return false;
    }

    let year = match value[0..4].parse::<i32>() {
        Ok(year) => year,
        Err(_) => return false,
    };
    let month = match value[5..7].parse::<u8>() {
        Ok(month) => month,
        Err(_) => return false,
    };
    let day = match value[8..10].parse::<u8>() {
        Ok(day) => day,
        Err(_) => return false,
    };

    let month = match time::Month::try_from(month) {
        Ok(month) => month,
        Err(_) => return false,
    };

    time::Date::from_calendar_date(year, month, day).is_ok()
}

fn is_valid_hhmm_time(value: &str) -> bool {
    if value.len() != 5 {
        return false;
    }

    let bytes = value.as_bytes();
    if bytes[2] != b':' {
        return false;
    }

    if !bytes
        .iter()
        .enumerate()
        .all(|(index, byte)| index == 2 || byte.is_ascii_digit())
    {
        return false;
    }

    let hour = match value[0..2].parse::<u8>() {
        Ok(hour) => hour,
        Err(_) => return false,
    };
    let minute = match value[3..5].parse::<u8>() {
        Ok(minute) => minute,
        Err(_) => return false,
    };

    hour < 24 && minute < 60
}

fn validate_entry_input(input: &EntryInput) -> Result<(), String> {
    match input.entry_type.as_str() {
        "income" | "expense" | "debt_payment" => {}
        _ => return Err("Entry type must be income, expense, or debt_payment.".to_string()),
    }

    if !input.amount.is_finite() || input.amount <= 0.0 {
        return Err("Entry amount must be greater than zero.".to_string());
    }

    if !is_valid_iso_date(&input.entry_date) {
        return Err("Entry date must use YYYY-MM-DD format.".to_string());
    }

    match input.source.as_str() {
        "manual" | "catch_up" | "seed" | "import" | "api" | "cli" | "mcp" => {}
        _ => return Err("Entry source is invalid.".to_string()),
    }

    if input.entry_type == "debt_payment" {
        if input.debt_id.as_deref().map(str::trim).unwrap_or("").is_empty() {
            return Err("Debt payment entries must be linked to a debt.".to_string());
        }
    } else {
        if input.category_id.as_deref().map(str::trim).unwrap_or("").is_empty() {
            return Err("Entries must include a category.".to_string());
        }
        if input.debt_id.is_some() {
            return Err("Only debt payment entries may include a debt link.".to_string());
        }
    }

    Ok(())
}

fn validate_debt_input(input: &DebtInput) -> Result<(), String> {
    if input.name.trim().is_empty() {
        return Err("Debt name is required.".to_string());
    }
    if !input.balance_current.is_finite() || input.balance_current < 0.0 {
        return Err("Debt balance cannot be negative.".to_string());
    }
    if input
        .interest_rate
        .is_some_and(|value| !value.is_finite() || value < 0.0)
    {
        return Err("Interest rate cannot be negative.".to_string());
    }
    if input
        .minimum_payment
        .is_some_and(|value| !value.is_finite() || value < 0.0)
    {
        return Err("Minimum payment cannot be negative.".to_string());
    }
    if input.due_day.is_some_and(|value| !(1..=31).contains(&value)) {
        return Err("Due day must be between 1 and 31.".to_string());
    }

    Ok(())
}

fn validate_check_in_input(input: &CheckInInput) -> Result<(), String> {
    if !is_valid_iso_date(&input.date) {
        return Err("Check-in date must use YYYY-MM-DD format.".to_string());
    }
    Ok(())
}

fn validate_onboarding_input(input: &OnboardingInput) -> Result<(), String> {
    if let Some(time) = &input.daily_check_in_time {
        if !is_valid_hhmm_time(time) {
            return Err("Daily check-in time must use HH:MM format.".to_string());
        }
    }

    if input
        .daily_review_mode
        .as_deref()
        .is_some_and(|value| value != "simple" && value != "quick")
    {
        return Err("Daily review mode must be simple or quick.".to_string());
    }

    Ok(())
}

fn validate_user_settings_input(input: &UserSettingsInput) -> Result<(), String> {
    match input.default_view.as_str() {
        "today" | "calendar" | "ledger" | "debts" | "analytics" | "settings" => {}
        _ => return Err("Default view is invalid.".to_string()),
    }

    match input.theme_mode.as_str() {
        "system" | "light" | "dark" => {}
        _ => return Err("Theme mode is invalid.".to_string()),
    }

    match input.catch_up_prompt_mode.as_str() {
        "always" | "when_missed" | "hidden" => {}
        _ => return Err("Catch-up prompt mode is invalid.".to_string()),
    }

    if !is_valid_hhmm_time(&input.reminder_time) {
        return Err("Reminder time must use HH:MM format.".to_string());
    }
    if !is_valid_hhmm_time(&input.quiet_hours_start) {
        return Err("Quiet-hours start must use HH:MM format.".to_string());
    }
    if !is_valid_hhmm_time(&input.quiet_hours_end) {
        return Err("Quiet-hours end must use HH:MM format.".to_string());
    }
    if input.reminder_days.iter().any(|value| !(0..=6).contains(value)) {
        return Err("Reminder days must stay between 0 and 6.".to_string());
    }

    Ok(())
}

fn run_migrations(connection: &Connection) -> Result<(), String> {
    connection
        .execute_batch(
            "
            CREATE TABLE IF NOT EXISTS schema_migrations (
              version INTEGER PRIMARY KEY,
              applied_at TEXT NOT NULL
            );
            ",
        )
        .map_err(|error| format!("failed to create migration table: {error}"))?;

    let applied: Option<i64> = connection
        .query_row(
            "SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1",
            [],
            |row| row.get(0),
        )
        .optional()
        .map_err(|error| format!("failed to read migration state: {error}"))?;

    let applied = applied.unwrap_or_default();

    if applied < 2 {
        connection
            .execute_batch(
                "
                CREATE TABLE IF NOT EXISTS categories (
                  id TEXT PRIMARY KEY,
                  name TEXT NOT NULL UNIQUE,
                  type TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS debts (
                  id TEXT PRIMARY KEY,
                  name TEXT NOT NULL,
                  lender TEXT,
                  balance_current REAL NOT NULL,
                  interest_rate REAL,
                  minimum_payment REAL,
                  due_day INTEGER,
                  created_at TEXT NOT NULL,
                  updated_at TEXT NOT NULL,
                  is_active INTEGER NOT NULL DEFAULT 1
                );

                CREATE TABLE IF NOT EXISTS entries (
                  id TEXT PRIMARY KEY,
                  type TEXT NOT NULL,
                  amount REAL NOT NULL,
                  category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
                  debt_id TEXT REFERENCES debts(id) ON DELETE RESTRICT,
                  note TEXT,
                  entry_date TEXT NOT NULL,
                  created_at TEXT NOT NULL,
                  updated_at TEXT NOT NULL,
                  source TEXT NOT NULL,
                  is_estimated INTEGER NOT NULL DEFAULT 0
                );

                CREATE TABLE IF NOT EXISTS check_ins (
                  date TEXT PRIMARY KEY,
                  completed INTEGER NOT NULL DEFAULT 1,
                  completed_at TEXT,
                  is_partial INTEGER NOT NULL DEFAULT 0,
                  note TEXT
                );

                CREATE TABLE IF NOT EXISTS user_settings (
                  id INTEGER PRIMARY KEY CHECK (id = 1),
                  has_completed_onboarding INTEGER NOT NULL DEFAULT 0,
                  onboarding_completed_at TEXT,
                  daily_check_in_time TEXT,
                  reminders_enabled INTEGER NOT NULL DEFAULT 1,
                  daily_review_mode TEXT NOT NULL DEFAULT 'simple',
                  default_view TEXT NOT NULL DEFAULT 'today',
                  reminder_time TEXT NOT NULL DEFAULT '19:00',
                  reminder_days TEXT NOT NULL DEFAULT '0,1,2,3,4,5,6',
                  catch_up_reminder_enabled INTEGER NOT NULL DEFAULT 1,
                  debt_due_reminder_enabled INTEGER NOT NULL DEFAULT 1,
                  quiet_hours_start TEXT NOT NULL DEFAULT '21:30',
                  quiet_hours_end TEXT NOT NULL DEFAULT '08:00',
                  weekend_reminders_enabled INTEGER NOT NULL DEFAULT 1,
                  catch_up_prompt_mode TEXT NOT NULL DEFAULT 'when_missed',
                  show_advanced_options INTEGER NOT NULL DEFAULT 0,
                  updated_at TEXT NOT NULL
                );

                CREATE INDEX IF NOT EXISTS idx_entries_entry_date ON entries(entry_date);
                CREATE INDEX IF NOT EXISTS idx_entries_type ON entries(type);
                CREATE INDEX IF NOT EXISTS idx_entries_category ON entries(category_id);
                CREATE INDEX IF NOT EXISTS idx_entries_debt ON entries(debt_id);
                ",
            )
            .map_err(|error| format!("failed to apply schema migration: {error}"))?;

        connection
            .execute(
                "INSERT OR REPLACE INTO schema_migrations (version, applied_at) VALUES (?1, ?2)",
                params![2_i64, now()],
            )
            .map_err(|error| format!("failed to record migration version: {error}"))?;
    }

    if applied < 3 {
        connection
            .execute_batch(
                "
                CREATE TABLE IF NOT EXISTS user_settings (
                  id INTEGER PRIMARY KEY CHECK (id = 1),
                  has_completed_onboarding INTEGER NOT NULL DEFAULT 0,
                  onboarding_completed_at TEXT,
                  daily_check_in_time TEXT,
                  selected_category_ids TEXT NOT NULL DEFAULT '',
                  reminders_enabled INTEGER NOT NULL DEFAULT 1,
                  daily_review_mode TEXT NOT NULL DEFAULT 'simple',
                  default_view TEXT NOT NULL DEFAULT 'today',
                  theme_mode TEXT NOT NULL DEFAULT 'system',
                  reminder_time TEXT NOT NULL DEFAULT '19:00',
                  reminder_days TEXT NOT NULL DEFAULT '0,1,2,3,4,5,6',
                  catch_up_reminder_enabled INTEGER NOT NULL DEFAULT 1,
                  debt_due_reminder_enabled INTEGER NOT NULL DEFAULT 1,
                  quiet_hours_start TEXT NOT NULL DEFAULT '21:30',
                  quiet_hours_end TEXT NOT NULL DEFAULT '08:00',
                  weekend_reminders_enabled INTEGER NOT NULL DEFAULT 1,
                  catch_up_prompt_mode TEXT NOT NULL DEFAULT 'when_missed',
                  show_advanced_options INTEGER NOT NULL DEFAULT 0,
                  updated_at TEXT NOT NULL
                );
                ",
            )
            .map_err(|error| format!("failed to apply user settings migration: {error}"))?;

        connection
            .execute(
                "INSERT OR REPLACE INTO schema_migrations (version, applied_at) VALUES (?1, ?2)",
                params![SCHEMA_VERSION, now()],
            )
            .map_err(|error| format!("failed to record migration version: {error}"))?;
    }

    if applied < 4 {
        repair_legacy_money_columns(connection)?;
        connection
            .execute(
                "INSERT OR REPLACE INTO schema_migrations (version, applied_at) VALUES (?1, ?2)",
                params![SCHEMA_VERSION, now()],
            )
            .map_err(|error| format!("failed to record migration version: {error}"))?;
    }

    if applied < 5 {
        connection
            .execute_batch(
                "
                ALTER TABLE user_settings ADD COLUMN theme_mode TEXT NOT NULL DEFAULT 'system';
                ",
            )
            .or_else(|error| {
                if error.to_string().contains("duplicate column name") {
                    Ok(())
                } else {
                    Err(error)
                }
            })
            .map_err(|error| format!("failed to add theme mode column: {error}"))?;

        connection
            .execute(
                "INSERT OR REPLACE INTO schema_migrations (version, applied_at) VALUES (?1, ?2)",
                params![SCHEMA_VERSION, now()],
            )
            .map_err(|error| format!("failed to record migration version: {error}"))?;
    }

    if applied < 6 {
        connection
            .execute_batch(
                "
                CREATE TABLE IF NOT EXISTS backup_records (
                  id TEXT PRIMARY KEY,
                  kind TEXT NOT NULL,
                  status TEXT NOT NULL,
                  file_path TEXT NOT NULL,
                  file_name TEXT NOT NULL,
                  created_at TEXT NOT NULL,
                  completed_at TEXT,
                  size_bytes INTEGER,
                  error_message TEXT,
                  triggered_by TEXT NOT NULL
                );

                CREATE INDEX IF NOT EXISTS idx_backup_records_created_at ON backup_records(created_at DESC);
                CREATE INDEX IF NOT EXISTS idx_backup_records_kind_status ON backup_records(kind, status);
                ",
            )
            .map_err(|error| format!("failed to create backup records table: {error}"))?;

        connection
            .execute(
                "INSERT OR REPLACE INTO schema_migrations (version, applied_at) VALUES (?1, ?2)",
                params![SCHEMA_VERSION, now()],
            )
            .map_err(|error| format!("failed to record migration version: {error}"))?;
    }

    if applied < 7 {
        connection
            .execute_batch(
                "
                ALTER TABLE user_settings ADD COLUMN selected_category_ids TEXT NOT NULL DEFAULT '';
                ",
            )
            .or_else(|error| {
                if error.to_string().contains("duplicate column name") {
                    Ok(())
                } else {
                    Err(error)
                }
            })
            .map_err(|error| format!("failed to add selected category ids column: {error}"))?;

        connection
            .execute(
                "INSERT OR REPLACE INTO schema_migrations (version, applied_at) VALUES (?1, ?2)",
                params![SCHEMA_VERSION, now()],
            )
            .map_err(|error| format!("failed to record migration version: {error}"))?;
    }

    seed_categories(connection)?;
    seed_user_settings(connection)?;
    Ok(())
}

fn table_has_column(connection: &Connection, table: &str, column: &str) -> Result<bool, String> {
    let pragma = format!("PRAGMA table_info({table})");
    let mut statement = connection
        .prepare(&pragma)
        .map_err(|error| format!("failed to inspect table {table}: {error}"))?;
    let rows = statement
        .query_map([], |row| row.get::<_, String>(1))
        .map_err(|error| format!("failed to query table info for {table}: {error}"))?;

    for row in rows {
        if row.map_err(|error| format!("failed to read table info for {table}: {error}"))? == column {
            return Ok(true);
        }
    }

    Ok(false)
}

fn repair_legacy_money_columns(connection: &Connection) -> Result<(), String> {
    connection
        .execute_batch(
            "
            CREATE TABLE IF NOT EXISTS user_settings (
              id INTEGER PRIMARY KEY CHECK (id = 1),
              has_completed_onboarding INTEGER NOT NULL DEFAULT 0,
              onboarding_completed_at TEXT,
              daily_check_in_time TEXT,
              selected_category_ids TEXT NOT NULL DEFAULT '',
              reminders_enabled INTEGER NOT NULL DEFAULT 1,
              daily_review_mode TEXT NOT NULL DEFAULT 'simple',
                  default_view TEXT NOT NULL DEFAULT 'today',
                  theme_mode TEXT NOT NULL DEFAULT 'system',
                  reminder_time TEXT NOT NULL DEFAULT '19:00',
              reminder_days TEXT NOT NULL DEFAULT '0,1,2,3,4,5,6',
              catch_up_reminder_enabled INTEGER NOT NULL DEFAULT 1,
              debt_due_reminder_enabled INTEGER NOT NULL DEFAULT 1,
              quiet_hours_start TEXT NOT NULL DEFAULT '21:30',
              quiet_hours_end TEXT NOT NULL DEFAULT '08:00',
              weekend_reminders_enabled INTEGER NOT NULL DEFAULT 1,
              catch_up_prompt_mode TEXT NOT NULL DEFAULT 'when_missed',
              show_advanced_options INTEGER NOT NULL DEFAULT 0,
              updated_at TEXT NOT NULL
            );
            ",
        )
        .map_err(|error| format!("failed to ensure user settings table during legacy repair: {error}"))?;

    if table_has_column(connection, "entries", "amount_cents")? && !table_has_column(connection, "entries", "amount")? {
        connection
            .execute_batch(
                "
                ALTER TABLE entries ADD COLUMN amount REAL;
                UPDATE entries
                SET amount = amount_cents / 100.0
                WHERE amount IS NULL;
                ",
            )
            .map_err(|error| format!("failed to migrate entry amounts: {error}"))?;
    }

    if table_has_column(connection, "debts", "starting_balance_cents")? && !table_has_column(connection, "debts", "balance_current")? {
        connection
            .execute_batch(
                "
                ALTER TABLE debts ADD COLUMN balance_current REAL;
                UPDATE debts
                SET balance_current = MAX(
                  (
                    starting_balance_cents - COALESCE(
                      (
                        SELECT SUM(amount_cents)
                        FROM entries
                        WHERE entries.debt_id = debts.id
                          AND entries.type = 'debt_payment'
                      ),
                      0
                    )
                  ) / 100.0,
                  0
                )
                WHERE balance_current IS NULL;
                ",
            )
            .map_err(|error| format!("failed to migrate debt balances: {error}"))?;
    }

    if table_has_column(connection, "debts", "interest_rate_bps")? && !table_has_column(connection, "debts", "interest_rate")? {
        connection
            .execute_batch(
                "
                ALTER TABLE debts ADD COLUMN interest_rate REAL;
                UPDATE debts
                SET interest_rate = interest_rate_bps / 100.0
                WHERE interest_rate IS NULL;
                ",
            )
            .map_err(|error| format!("failed to migrate debt interest rates: {error}"))?;
    }

    if table_has_column(connection, "debts", "minimum_payment_cents")? && !table_has_column(connection, "debts", "minimum_payment")? {
        connection
            .execute_batch(
                "
                ALTER TABLE debts ADD COLUMN minimum_payment REAL;
                UPDATE debts
                SET minimum_payment = minimum_payment_cents / 100.0
                WHERE minimum_payment IS NULL;
                ",
            )
            .map_err(|error| format!("failed to migrate debt minimum payments: {error}"))?;
    }

    Ok(())
}

fn seed_categories(connection: &Connection) -> Result<(), String> {
    let categories = [
        ("cat-groceries", "Groceries", "expense"),
        ("cat-dining", "Dining", "expense"),
        ("cat-gas", "Gas", "expense"),
        ("cat-rent", "Rent", "expense"),
        ("cat-utilities", "Utilities", "expense"),
        ("cat-entertainment", "Entertainment", "expense"),
        ("cat-income", "Income", "income"),
        ("cat-debt-payment", "Debt Payment", "expense"),
    ];

    for (id, name, category_type) in categories {
        connection
            .execute(
                "INSERT OR IGNORE INTO categories (id, name, type) VALUES (?1, ?2, ?3)",
                params![id, name, category_type],
            )
            .map_err(|error| format!("failed to seed categories: {error}"))?;
    }

    Ok(())
}

fn seed_user_settings(connection: &Connection) -> Result<(), String> {
    connection
        .execute(
            "
            INSERT OR IGNORE INTO user_settings (
              id,
              has_completed_onboarding,
              onboarding_completed_at,
              daily_check_in_time,
              selected_category_ids,
              reminders_enabled,
              daily_review_mode,
              default_view,
              theme_mode,
              reminder_time,
              reminder_days,
              catch_up_reminder_enabled,
              debt_due_reminder_enabled,
              quiet_hours_start,
              quiet_hours_end,
              weekend_reminders_enabled,
              catch_up_prompt_mode,
              show_advanced_options,
              updated_at
            )
            VALUES (1, 0, NULL, '19:00', '', 1, 'simple', 'today', 'system', '19:00', '0,1,2,3,4,5,6', 1, 1, '21:30', '08:00', 1, 'when_missed', 0, ?1)
            ",
            params![now()],
        )
        .map_err(|error| format!("failed to seed user settings: {error}"))?;

    Ok(())
}

fn category_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<CategoryRecord> {
    Ok(CategoryRecord {
        id: row.get(0)?,
        name: row.get(1)?,
        category_type: row.get(2)?,
    })
}

fn entry_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<EntryRecord> {
    Ok(EntryRecord {
        id: row.get(0)?,
        entry_type: row.get(1)?,
        amount: row.get(2)?,
        category_id: row.get(3)?,
        debt_id: row.get(4)?,
        note: row.get(5)?,
        entry_date: row.get(6)?,
        created_at: row.get(7)?,
        updated_at: row.get(8)?,
        source: row.get(9)?,
        is_estimated: row.get::<_, i64>(10)? == 1,
    })
}

fn debt_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<DebtRecord> {
    Ok(DebtRecord {
        id: row.get(0)?,
        name: row.get(1)?,
        lender: row.get(2)?,
        balance_current: row.get(3)?,
        interest_rate: row.get(4)?,
        minimum_payment: row.get(5)?,
        due_day: row.get(6)?,
        created_at: row.get(7)?,
        updated_at: row.get(8)?,
        is_active: row.get::<_, i64>(9)? == 1,
    })
}

fn check_in_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<CheckInRecord> {
    Ok(CheckInRecord {
        date: row.get(0)?,
        completed: row.get::<_, i64>(1)? == 1,
        completed_at: row.get(2)?,
        is_partial: row.get::<_, i64>(3)? == 1,
        note: row.get(4)?,
    })
}

fn onboarding_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<OnboardingStateRecord> {
    let selected_category_ids: String = row.get(5)?;
    Ok(OnboardingStateRecord {
        has_completed_onboarding: row.get::<_, i64>(0)? == 1,
        onboarding_completed_at: row.get(1)?,
        daily_check_in_time: row.get(2)?,
        reminders_enabled: row.get::<_, i64>(3)? == 1,
        daily_review_mode: row.get(4)?,
        selected_category_ids: parse_string_list(&selected_category_ids),
    })
}

fn settings_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<UserSettingsRecord> {
    let reminder_days: String = row.get(4)?;
    Ok(UserSettingsRecord {
        default_view: row.get(0)?,
        theme_mode: row.get(1)?,
        reminders_enabled: row.get::<_, i64>(2)? == 1,
        reminder_time: row.get(3)?,
        reminder_days: parse_reminder_days(&reminder_days),
        catch_up_reminder_enabled: row.get::<_, i64>(5)? == 1,
        debt_due_reminder_enabled: row.get::<_, i64>(6)? == 1,
        quiet_hours_start: row.get(7)?,
        quiet_hours_end: row.get(8)?,
        weekend_reminders_enabled: row.get::<_, i64>(9)? == 1,
        catch_up_prompt_mode: row.get(10)?,
        show_advanced_options: row.get::<_, i64>(11)? == 1,
    })
}

fn backup_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<BackupRecord> {
    Ok(BackupRecord {
        id: row.get(0)?,
        kind: row.get(1)?,
        status: row.get(2)?,
        file_path: row.get(3)?,
        file_name: row.get(4)?,
        created_at: row.get(5)?,
        completed_at: row.get(6)?,
        size_bytes: row.get(7)?,
        error_message: row.get(8)?,
        triggered_by: row.get(9)?,
    })
}

fn list_categories(connection: &Connection) -> Result<Vec<CategoryRecord>, String> {
    let mut statement = connection
        .prepare("SELECT id, name, type FROM categories ORDER BY name")
        .map_err(|error| format!("failed to prepare category query: {error}"))?;

    let rows = statement
        .query_map([], category_row)
        .map_err(|error| format!("failed to query categories: {error}"))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("failed to map categories: {error}"))
}

pub fn list_entries(connection: &Connection, filters: Option<EntryFilters>) -> Result<Vec<EntryRecord>, String> {
    let mut sql = String::from(
        "SELECT id, type, amount, category_id, debt_id, note, entry_date, created_at, updated_at, source, is_estimated FROM entries",
    );
    let mut clauses: Vec<String> = Vec::new();
    let mut values: Vec<String> = Vec::new();

    if let Some(filters) = filters {
        if let Some(entry_type) = filters.entry_type {
            clauses.push("type = ?".to_string());
            values.push(entry_type);
        }
        if let Some(category_id) = filters.category_id {
            clauses.push("category_id = ?".to_string());
            values.push(category_id);
        }
        if let Some(start_date) = filters.start_date {
            clauses.push("entry_date >= ?".to_string());
            values.push(start_date);
        }
        if let Some(end_date) = filters.end_date {
            clauses.push("entry_date <= ?".to_string());
            values.push(end_date);
        }
    }

    if !clauses.is_empty() {
        sql.push_str(" WHERE ");
        sql.push_str(&clauses.join(" AND "));
    }

    sql.push_str(" ORDER BY entry_date DESC, created_at DESC");

    let mut statement = connection
        .prepare(&sql)
        .map_err(|error| format!("failed to prepare entry query: {error}"))?;

    let params: Vec<&dyn ToSql> = values.iter().map(|value| value as &dyn ToSql).collect();
    let rows = statement
        .query_map(params_from_iter(params), entry_row)
        .map_err(|error| format!("failed to query entries: {error}"))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("failed to map entries: {error}"))
}

fn list_debts(connection: &Connection) -> Result<Vec<DebtRecord>, String> {
    let mut statement = connection
        .prepare(
            "SELECT id, name, lender, balance_current, interest_rate, minimum_payment, due_day, created_at, updated_at, is_active FROM debts ORDER BY is_active DESC, name",
        )
        .map_err(|error| format!("failed to prepare debt query: {error}"))?;

    let rows = statement
        .query_map([], debt_row)
        .map_err(|error| format!("failed to query debts: {error}"))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("failed to map debts: {error}"))
}

fn list_check_ins(connection: &Connection) -> Result<Vec<CheckInRecord>, String> {
    let mut statement = connection
        .prepare("SELECT date, completed, completed_at, is_partial, note FROM check_ins ORDER BY date DESC")
        .map_err(|error| format!("failed to prepare check-in query: {error}"))?;

    let rows = statement
        .query_map([], check_in_row)
        .map_err(|error| format!("failed to query check-ins: {error}"))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("failed to map check-ins: {error}"))
}

fn list_backup_records(connection: &Connection) -> Result<Vec<BackupRecord>, String> {
    let mut statement = connection
        .prepare(
            "
            SELECT id, kind, status, file_path, file_name, created_at, completed_at, size_bytes, error_message, triggered_by
            FROM backup_records
            ORDER BY created_at DESC
            ",
        )
        .map_err(|error| format!("failed to prepare backup query: {error}"))?;

    let rows = statement
        .query_map([], backup_row)
        .map_err(|error| format!("failed to query backups: {error}"))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("failed to map backups: {error}"))
}

fn insert_backup_record(connection: &Connection, record: &BackupRecord) -> Result<(), String> {
    connection
        .execute(
            "
            INSERT OR REPLACE INTO backup_records (
              id, kind, status, file_path, file_name, created_at, completed_at, size_bytes, error_message, triggered_by
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
            ",
            params![
                record.id,
                record.kind,
                record.status,
                record.file_path,
                record.file_name,
                record.created_at,
                record.completed_at,
                record.size_bytes,
                record.error_message,
                record.triggered_by
            ],
        )
        .map_err(|error| format!("failed to save backup record: {error}"))?;
    Ok(())
}

fn validate_backup_file(path: &Path) -> Result<(), String> {
    if !path.exists() {
        return Err("Backup file does not exist.".to_string());
    }

    let connection = Connection::open(path).map_err(|error| format!("failed to open backup file: {error}"))?;
    let result: String = connection
        .query_row("PRAGMA integrity_check(1)", [], |row| row.get(0))
        .map_err(|error| format!("failed to run backup integrity check: {error}"))?;

    if result == "ok" {
        Ok(())
    } else {
        Err(format!("backup integrity check failed: {result}"))
    }
}

fn build_backup_filename(kind: &str, created_at: &str) -> Result<String, String> {
    let timestamp = OffsetDateTime::parse(created_at, &time::format_description::well_known::Rfc3339)
        .map_err(|error| format!("failed to parse backup timestamp: {error}"))?;
    Ok(format!(
        "steady-{kind}-{:04}{:02}{:02}-{:02}{:02}{:02}.sqlite",
        timestamp.year(),
        u8::from(timestamp.month()),
        timestamp.day(),
        timestamp.hour(),
        timestamp.minute(),
        timestamp.second()
    ))
}

fn create_backup_for_connection(
    connection: &mut Connection,
    backup_dir: &Path,
    kind: &str,
    triggered_by: &str,
) -> Result<BackupRecord, String> {
    let created_at = now();
    let file_name = build_backup_filename(kind, &created_at)?;
    let file_path = backup_dir.join(&file_name);
    let backup_id = Uuid::new_v4().to_string();
    fs::create_dir_all(backup_dir).map_err(|error| format!("failed to prepare backup directory: {error}"))?;

    if file_path.exists() {
        fs::remove_file(&file_path).map_err(|error| format!("failed to replace existing backup file: {error}"))?;
    }

    let result = connection.execute("VACUUM INTO ?1", params![file_path.display().to_string()]);
    if let Err(error) = result {
        let failure_record = BackupRecord {
            id: backup_id,
            kind: kind.to_string(),
            status: "failed".to_string(),
            file_path: file_path.display().to_string(),
            file_name: file_name.clone(),
            created_at: created_at.clone(),
            completed_at: Some(now()),
            size_bytes: None,
            error_message: Some(format!("failed to create backup: {error}")),
            triggered_by: triggered_by.to_string(),
        };
        let _ = insert_backup_record(connection, &failure_record);
        return Err(format!("failed to create backup: {error}"));
    }

    let size_bytes = match validate_backup_file(&file_path).and_then(|_| {
        fs::metadata(&file_path)
            .map(|metadata| metadata.len() as i64)
            .map_err(|error| format!("failed to read backup metadata: {error}"))
    }) {
        Ok(size_bytes) => size_bytes,
        Err(error) => {
            let failure_record = BackupRecord {
                id: backup_id.clone(),
                kind: kind.to_string(),
                status: "failed".to_string(),
                file_path: file_path.display().to_string(),
                file_name: file_name.clone(),
                created_at: created_at.clone(),
                completed_at: Some(now()),
                size_bytes: None,
                error_message: Some(error.clone()),
                triggered_by: triggered_by.to_string(),
            };
            let _ = insert_backup_record(connection, &failure_record);
            return Err(error);
        }
    };
    let record = BackupRecord {
        id: backup_id,
        kind: kind.to_string(),
        status: "success".to_string(),
        file_path: file_path.display().to_string(),
        file_name,
        created_at,
        completed_at: Some(now()),
        size_bytes: Some(size_bytes),
        error_message: None,
        triggered_by: triggered_by.to_string(),
    };
    insert_backup_record(connection, &record)?;
    Ok(record)
}

#[cfg(test)]
fn backup_record_for_retention(id: &str, created_at: &str) -> BackupRecord {
    BackupRecord {
        id: id.to_string(),
        kind: "auto".to_string(),
        status: "success".to_string(),
        file_path: format!("C:\\temp\\{id}.sqlite"),
        file_name: format!("{id}.sqlite"),
        created_at: created_at.to_string(),
        completed_at: Some(created_at.to_string()),
        size_bytes: Some(1),
        error_message: None,
        triggered_by: "scheduler".to_string(),
    }
}

fn select_automatic_backup_ids_to_keep(records: &[BackupRecord]) -> Result<HashSet<String>, String> {
    let mut sorted = records
        .iter()
        .filter(|record| record.kind == "auto" && record.status == "success")
        .collect::<Vec<_>>();
    sorted.sort_by(|left, right| right.created_at.cmp(&left.created_at));

    let mut keep = HashSet::new();
    let mut daily = HashSet::new();
    let mut weekly = HashSet::new();
    let mut monthly = HashSet::new();

    for record in sorted {
        let timestamp = OffsetDateTime::parse(&record.created_at, &time::format_description::well_known::Rfc3339)
            .map_err(|error| format!("failed to parse backup timestamp: {error}"))?;
        let daily_key = format!("{:04}-{:02}-{:02}", timestamp.year(), u8::from(timestamp.month()), timestamp.day());
        let weekly_key = format!("{:04}-W{:02}", timestamp.to_iso_week_date().0, timestamp.to_iso_week_date().1);
        let monthly_key = format!("{:04}-{:02}", timestamp.year(), u8::from(timestamp.month()));

        let mut should_keep = false;
        if daily.len() < 7 && daily.insert(daily_key) {
            should_keep = true;
        }
        if weekly.len() < 4 && weekly.insert(weekly_key) {
            should_keep = true;
        }
        if monthly.len() < 6 && monthly.insert(monthly_key) {
            should_keep = true;
        }

        if should_keep {
            keep.insert(record.id.clone());
        }
    }

    Ok(keep)
}

fn prune_automatic_backups(connection: &Connection) -> Result<(), String> {
    let records = list_backup_records(connection)?;
    let keep_ids = select_automatic_backup_ids_to_keep(&records)?;

    for record in records
        .iter()
        .filter(|record| record.kind == "auto" && record.status == "success" && !keep_ids.contains(&record.id))
    {
        let path = Path::new(&record.file_path);
        if path.exists() {
            fs::remove_file(path).map_err(|error| format!("failed to prune backup file: {error}"))?;
        }
        connection
            .execute("DELETE FROM backup_records WHERE id = ?1", params![record.id])
            .map_err(|error| format!("failed to prune backup record: {error}"))?;
    }

    Ok(())
}

fn restore_backup_from_file(live_db_path: &Path, backup_path: &Path, backup_dir: &Path) -> Result<(), String> {
    validate_backup_file(backup_path)?;

    let pre_restore_record = if live_db_path.exists() {
        let mut live_connection = Connection::open(live_db_path).map_err(|error| format!("failed to open live database: {error}"))?;
        let record = create_backup_for_connection(&mut live_connection, backup_dir, "pre-restore", "restore")?;
        drop(live_connection);
        Some(record)
    } else {
        None
    };

    let wal_path = live_db_path.with_extension("sqlite-wal");
    let shm_path = live_db_path.with_extension("sqlite-shm");
    if wal_path.exists() {
        let _ = fs::remove_file(&wal_path);
    }
    if shm_path.exists() {
        let _ = fs::remove_file(&shm_path);
    }
    if live_db_path.exists() {
        fs::remove_file(live_db_path).map_err(|error| format!("failed to remove live database: {error}"))?;
    }

    fs::copy(backup_path, live_db_path).map_err(|error| format!("failed to replace live database: {error}"))?;
    validate_backup_file(live_db_path)?;

    let restored_connection = Connection::open(live_db_path).map_err(|error| format!("failed to open restored database: {error}"))?;
    run_migrations(&restored_connection)?;
    if let Some(record) = pre_restore_record {
        insert_backup_record(&restored_connection, &record)?;
    }
    Ok(())
}

fn get_backup_summary(connection: &Connection) -> Result<BackupSummaryRecord, String> {
    let last_successful_automatic_backup_at: Option<String> = connection
        .query_row(
            "SELECT created_at FROM backup_records WHERE kind = 'auto' AND status = 'success' ORDER BY created_at DESC LIMIT 1",
            [],
            |row| row.get(0),
        )
        .optional()
        .map_err(|error| format!("failed to load latest automatic backup: {error}"))?;

    let next_automatic_backup_due_at = last_successful_automatic_backup_at
        .as_deref()
        .and_then(|value| OffsetDateTime::parse(value, &time::format_description::well_known::Rfc3339).ok())
        .map(|timestamp| (timestamp + Duration::hours(24)).format(&time::format_description::well_known::Rfc3339).unwrap_or_default());

    Ok(BackupSummaryRecord {
        last_successful_automatic_backup_at,
        next_automatic_backup_due_at,
        retention_policy: BACKUP_RETENTION_POLICY.to_string(),
    })
}

fn get_onboarding(connection: &Connection) -> Result<OnboardingStateRecord, String> {
    connection
        .query_row(
            "SELECT has_completed_onboarding, onboarding_completed_at, daily_check_in_time, reminders_enabled, daily_review_mode, selected_category_ids FROM user_settings WHERE id = 1",
            [],
            onboarding_row,
        )
        .map_err(|error| format!("failed to load onboarding state: {error}"))
}

fn get_settings(connection: &Connection) -> Result<UserSettingsRecord, String> {
    connection
        .query_row(
            "SELECT default_view, theme_mode, reminders_enabled, reminder_time, reminder_days, catch_up_reminder_enabled, debt_due_reminder_enabled, quiet_hours_start, quiet_hours_end, weekend_reminders_enabled, catch_up_prompt_mode, show_advanced_options FROM user_settings WHERE id = 1",
            [],
            settings_row,
        )
        .map_err(|error| format!("failed to load user settings: {error}"))
}

pub fn bootstrap(app: &AppHandle) -> Result<BootstrapPayload, String> {
    let (connection, paths) = open_connection(app)?;

    Ok(BootstrapPayload {
        data_path: paths.db_path.display().to_string(),
        backup_directory: paths.backup_dir.display().to_string(),
        export_directory: paths.export_dir.display().to_string(),
        categories: list_categories(&connection)?,
        entries: list_entries(&connection, None)?,
        debts: list_debts(&connection)?,
        check_ins: list_check_ins(&connection)?,
        onboarding: get_onboarding(&connection)?,
        settings: get_settings(&connection)?,
        backup_summary: get_backup_summary(&connection)?,
        backups: list_backup_records(&connection)?,
    })
}

pub fn save_onboarding(app: &AppHandle, input: OnboardingInput) -> Result<OnboardingStateRecord, String> {
    validate_onboarding_input(&input)?;
    let (connection, _) = open_connection(app)?;
    connection
        .execute(
            "
            UPDATE user_settings
            SET has_completed_onboarding = 1,
                onboarding_completed_at = ?1,
                daily_check_in_time = ?2,
                selected_category_ids = ?3,
                reminders_enabled = ?4,
                daily_review_mode = ?5,
                reminder_time = COALESCE(?2, reminder_time),
                updated_at = ?1
            WHERE id = 1
            ",
            params![
                now(),
                input.daily_check_in_time,
                serialize_string_list(&input.selected_category_ids),
                if input.reminders_enabled { 1 } else { 0 },
                input.daily_review_mode.unwrap_or_else(|| "simple".to_string()),
            ],
        )
        .map_err(|error| format!("failed to save onboarding: {error}"))?;

    get_onboarding(&connection)
}

pub fn save_settings(app: &AppHandle, input: UserSettingsInput) -> Result<UserSettingsRecord, String> {
    validate_user_settings_input(&input)?;
    let (connection, _) = open_connection(app)?;
    connection
        .execute(
            "
            UPDATE user_settings
            SET default_view = ?1,
                theme_mode = ?2,
                reminders_enabled = ?3,
                reminder_time = ?4,
                reminder_days = ?5,
                catch_up_reminder_enabled = ?6,
                debt_due_reminder_enabled = ?7,
                quiet_hours_start = ?8,
                quiet_hours_end = ?9,
                weekend_reminders_enabled = ?10,
                catch_up_prompt_mode = ?11,
                show_advanced_options = ?12,
                updated_at = ?13
            WHERE id = 1
            ",
            params![
                input.default_view,
                input.theme_mode,
                if input.reminders_enabled { 1 } else { 0 },
                input.reminder_time,
                serialize_reminder_days(&input.reminder_days),
                if input.catch_up_reminder_enabled { 1 } else { 0 },
                if input.debt_due_reminder_enabled { 1 } else { 0 },
                input.quiet_hours_start,
                input.quiet_hours_end,
                if input.weekend_reminders_enabled { 1 } else { 0 },
                input.catch_up_prompt_mode,
                if input.show_advanced_options { 1 } else { 0 },
                now(),
            ],
        )
        .map_err(|error| format!("failed to save user settings: {error}"))?;

    get_settings(&connection)
}

pub fn save_entry(app: &AppHandle, input: EntryInput) -> Result<EntryRecord, String> {
    validate_entry_input(&input)?;
    let (connection, _) = open_connection(app)?;
    let entry_id = input.id.unwrap_or_else(|| Uuid::new_v4().to_string());
    let existing: Option<(String, Option<String>, f64)> = connection
        .query_row(
            "SELECT type, debt_id, amount FROM entries WHERE id = ?1",
            params![entry_id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        )
        .optional()
        .map_err(|error| format!("failed to load existing entry: {error}"))?;

    let timestamp = now();
    let transaction = connection
        .unchecked_transaction()
        .map_err(|error| format!("failed to start entry transaction: {error}"))?;

    if let Some((entry_type, debt_id, amount)) = existing {
        if entry_type == "debt_payment" {
            if let Some(debt_id) = debt_id {
                adjust_debt_balance(&transaction, &debt_id, amount)?;
            }
        }
    }

    if input.entry_type == "debt_payment" {
        let debt_id = input
            .debt_id
            .as_ref()
            .ok_or_else(|| "Debt payment entries must be linked to a debt.".to_string())?;
        adjust_debt_balance(&transaction, debt_id, -input.amount)?;
    }

    transaction
        .execute(
            "
            INSERT INTO entries (id, type, amount, category_id, debt_id, note, entry_date, created_at, updated_at, source, is_estimated)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
            ON CONFLICT(id) DO UPDATE SET
              type = excluded.type,
              amount = excluded.amount,
              category_id = excluded.category_id,
              debt_id = excluded.debt_id,
              note = excluded.note,
              entry_date = excluded.entry_date,
              updated_at = excluded.updated_at,
              source = excluded.source,
              is_estimated = excluded.is_estimated
            ",
            params![
                entry_id,
                input.entry_type,
                input.amount,
                input.category_id,
                input.debt_id,
                input.note,
                input.entry_date,
                timestamp,
                timestamp,
                input.source,
                if input.is_estimated { 1 } else { 0 }
            ],
        )
        .map_err(|error| format!("failed to save entry: {error}"))?;

    let entry = transaction
        .query_row(
            "SELECT id, type, amount, category_id, debt_id, note, entry_date, created_at, updated_at, source, is_estimated FROM entries WHERE id = ?1",
            params![entry_id],
            entry_row,
        )
        .map_err(|error| format!("failed to read saved entry: {error}"))?;

    transaction
        .commit()
        .map_err(|error| format!("failed to commit entry transaction: {error}"))?;

    Ok(entry)
}

pub fn delete_entry(app: &AppHandle, entry_id: String) -> Result<(), String> {
    let (connection, _) = open_connection(app)?;
    let existing: Option<(String, Option<String>, f64)> = connection
        .query_row(
            "SELECT type, debt_id, amount FROM entries WHERE id = ?1",
            params![entry_id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        )
        .optional()
        .map_err(|error| format!("failed to load entry for deletion: {error}"))?;

    let transaction = connection
        .unchecked_transaction()
        .map_err(|error| format!("failed to start delete transaction: {error}"))?;

    if let Some((entry_type, debt_id, amount)) = existing {
        if entry_type == "debt_payment" {
            if let Some(debt_id) = debt_id {
                adjust_debt_balance(&transaction, &debt_id, amount)?;
            }
        }
    }

    transaction
        .execute("DELETE FROM entries WHERE id = ?1", params![entry_id])
        .map_err(|error| format!("failed to delete entry: {error}"))?;

    transaction
        .commit()
        .map_err(|error| format!("failed to commit entry deletion: {error}"))?;

    Ok(())
}

fn adjust_debt_balance(transaction: &rusqlite::Transaction<'_>, debt_id: &str, delta: f64) -> Result<(), String> {
    let current_balance: f64 = transaction
        .query_row(
            "SELECT balance_current FROM debts WHERE id = ?1",
            params![debt_id],
            |row| row.get(0),
        )
        .map_err(|error| format!("failed to load debt balance: {error}"))?;

    let next_balance = (current_balance + delta).max(0.0);
    transaction
        .execute(
            "UPDATE debts SET balance_current = ?1, updated_at = ?2 WHERE id = ?3",
            params![next_balance, now(), debt_id],
        )
        .map_err(|error| format!("failed to update debt balance: {error}"))?;
    Ok(())
}

pub fn save_debt(app: &AppHandle, input: DebtInput) -> Result<DebtRecord, String> {
    validate_debt_input(&input)?;
    let (connection, _) = open_connection(app)?;
    let debt_id = input.id.unwrap_or_else(|| Uuid::new_v4().to_string());
    let timestamp = now();

    connection
        .execute(
            "
            INSERT INTO debts (id, name, lender, balance_current, interest_rate, minimum_payment, due_day, created_at, updated_at, is_active)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
            ON CONFLICT(id) DO UPDATE SET
              name = excluded.name,
              lender = excluded.lender,
              balance_current = excluded.balance_current,
              interest_rate = excluded.interest_rate,
              minimum_payment = excluded.minimum_payment,
              due_day = excluded.due_day,
              updated_at = excluded.updated_at,
              is_active = excluded.is_active
            ",
            params![
                debt_id,
                input.name,
                input.lender,
                input.balance_current,
                input.interest_rate,
                input.minimum_payment,
                input.due_day,
                timestamp,
                timestamp,
                if input.is_active { 1 } else { 0 }
            ],
        )
        .map_err(|error| format!("failed to save debt: {error}"))?;

    connection
        .query_row(
            "SELECT id, name, lender, balance_current, interest_rate, minimum_payment, due_day, created_at, updated_at, is_active FROM debts WHERE id = ?1",
            params![debt_id],
            debt_row,
        )
        .map_err(|error| format!("failed to read saved debt: {error}"))
}

pub fn delete_debt(app: &AppHandle, debt_id: String) -> Result<(), String> {
    let (connection, _) = open_connection(app)?;
    let linked_entries: i64 = connection
        .query_row(
            "SELECT COUNT(*) FROM entries WHERE debt_id = ?1",
            params![debt_id],
            |row| row.get(0),
        )
        .map_err(|error| format!("failed to count linked debt entries: {error}"))?;

    if linked_entries > 0 {
        return Err("Delete blocked because this debt already has related entries.".to_string());
    }

    connection
        .execute("DELETE FROM debts WHERE id = ?1", params![debt_id])
        .map_err(|error| format!("failed to delete debt: {error}"))?;

    Ok(())
}

pub fn record_debt_payment(app: &AppHandle, input: DebtPaymentInput) -> Result<EntryRecord, String> {
    save_entry(
        app,
        EntryInput {
            id: None,
            entry_type: "debt_payment".to_string(),
            amount: input.amount,
            category_id: Some("cat-debt-payment".to_string()),
            debt_id: Some(input.debt_id),
            note: input.note,
            entry_date: input.entry_date,
            source: "manual".to_string(),
            is_estimated: false,
        },
    )
}

pub fn mark_check_in(app: &AppHandle, input: CheckInInput) -> Result<CheckInRecord, String> {
    validate_check_in_input(&input)?;
    let (connection, _) = open_connection(app)?;
    let completed = if input.is_partial { 0 } else { 1 };
    let completed_at = if input.is_partial { None } else { Some(now()) };

    connection
        .execute(
            "
            INSERT INTO check_ins (date, completed, completed_at, is_partial, note)
            VALUES (?1, ?2, ?3, ?4, ?5)
            ON CONFLICT(date) DO UPDATE SET
              completed = excluded.completed,
              completed_at = excluded.completed_at,
              is_partial = excluded.is_partial,
              note = excluded.note
            ",
            params![
                input.date,
                completed,
                completed_at,
                if input.is_partial { 1 } else { 0 },
                input.note
            ],
        )
        .map_err(|error| format!("failed to save check-in: {error}"))?;

    connection
        .query_row(
            "SELECT date, completed, completed_at, is_partial, note FROM check_ins WHERE date = ?1",
            params![input.date],
            check_in_row,
        )
        .map_err(|error| format!("failed to read saved check-in: {error}"))
}

pub fn export_entries_csv(app: &AppHandle, destination: &str) -> Result<String, String> {
    let (connection, _) = open_connection(app)?;
    let entries = list_entries(&connection, None)?;
    let mut csv = String::from("Entry ID,Type,Amount,Category ID,Debt ID,Note,Entry Date,Estimated,Source,Created At,Updated At\n");

    for entry in entries {
        csv.push_str(&format!(
            "{},{},{:.2},{},{},{},{},{},{},{},{}\n",
            csv_value(&entry.id),
            csv_value(&entry.entry_type),
            entry.amount,
            csv_optional(entry.category_id.as_deref()),
            csv_optional(entry.debt_id.as_deref()),
            csv_optional(entry.note.as_deref()),
            csv_value(&entry.entry_date),
            if entry.is_estimated { "Yes" } else { "No" },
            csv_value(&entry.source),
            csv_value(&entry.created_at),
            csv_value(&entry.updated_at),
        ));
    }

    write_text_file(destination, &csv)?;
    Ok(destination.to_string())
}

pub fn export_debts_csv(app: &AppHandle, destination: &str) -> Result<String, String> {
    let (connection, _) = open_connection(app)?;
    let debts = list_debts(&connection)?;
    let mut csv = String::from("Debt ID,Name,Lender,Current Balance,Interest Rate,Minimum Payment,Due Day,Active,Created At,Updated At\n");

    for debt in debts {
        csv.push_str(&format!(
            "{},{},{},{:.2},{},{},{},{},{},{}\n",
            csv_value(&debt.id),
            csv_value(&debt.name),
            csv_optional(debt.lender.as_deref()),
            debt.balance_current,
            debt.interest_rate.map(|value| value.to_string()).unwrap_or_default(),
            debt.minimum_payment.map(|value| format!("{value:.2}")).unwrap_or_default(),
            debt.due_day.map(|value| value.to_string()).unwrap_or_default(),
            if debt.is_active { "Yes" } else { "No" },
            csv_value(&debt.created_at),
            csv_value(&debt.updated_at),
        ));
    }

    write_text_file(destination, &csv)?;
    Ok(destination.to_string())
}

pub fn create_backup(app: &AppHandle, destination: &str) -> Result<String, String> {
    let (connection, _) = open_connection(app)?;
    let path = PathBuf::from(destination);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| format!("failed to prepare backup directory: {error}"))?;
    }
    if path.exists() {
        fs::remove_file(&path).map_err(|error| format!("failed to replace backup file: {error}"))?;
    }

    connection
        .execute("VACUUM INTO ?1", params![destination])
        .map_err(|error| format!("failed to create backup: {error}"))?;

    Ok(path.display().to_string())
}

pub fn list_backups(app: &AppHandle) -> Result<Vec<BackupRecord>, String> {
    let (connection, _) = open_connection(app)?;
    list_backup_records(&connection)
}

fn find_backup_record(connection: &Connection, backup_id: &str) -> Result<BackupRecord, String> {
    connection
        .query_row(
            "
            SELECT id, kind, status, file_path, file_name, created_at, completed_at, size_bytes, error_message, triggered_by
            FROM backup_records
            WHERE id = ?1
            ",
            params![backup_id],
            backup_row,
        )
        .map_err(|error| format!("failed to load backup record: {error}"))
}

fn automatic_backup_is_due(last_successful_automatic_backup_at: Option<&str>) -> Result<bool, String> {
    let Some(last_successful_automatic_backup_at) = last_successful_automatic_backup_at else {
        return Ok(true);
    };

    let last_backup = OffsetDateTime::parse(last_successful_automatic_backup_at, &time::format_description::well_known::Rfc3339)
        .map_err(|error| format!("failed to parse automatic backup timestamp: {error}"))?;
    Ok(OffsetDateTime::now_utc() >= last_backup + Duration::hours(24))
}

pub fn create_managed_manual_backup(app: &AppHandle) -> Result<BackupRecord, String> {
    let (mut connection, paths) = open_connection(app)?;
    create_backup_for_connection(&mut connection, &paths.backup_dir, "manual", "user")
}

pub fn run_automatic_backup_if_due(app: &AppHandle) -> Result<Option<BackupRecord>, String> {
    let (mut connection, paths) = open_connection(app)?;
    let summary = get_backup_summary(&connection)?;
    if !automatic_backup_is_due(summary.last_successful_automatic_backup_at.as_deref())? {
        return Ok(None);
    }

    let record = create_backup_for_connection(&mut connection, &paths.backup_dir, "auto", "scheduler")?;
    prune_automatic_backups(&connection)?;
    Ok(Some(record))
}

pub fn restore_backup(app: &AppHandle, backup_id: &str) -> Result<(), String> {
    let (connection, paths) = open_connection(app)?;
    let record = find_backup_record(&connection, backup_id)?;
    if record.status != "success" {
        return Err("Only successful backups can be restored.".to_string());
    }
    let backup_path = PathBuf::from(record.file_path);
    drop(connection);

    restore_backup_from_file(&paths.db_path, &backup_path, &paths.backup_dir)
}

fn write_text_file(destination: &str, contents: &str) -> Result<(), String> {
    let path = Path::new(destination);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| format!("failed to prepare export directory: {error}"))?;
    }

    fs::write(path, contents).map_err(|error| format!("failed to write file: {error}"))
}

fn csv_value(value: &str) -> String {
    if value.contains(',') || value.contains('"') || value.contains('\n') {
        format!("\"{}\"", value.replace('"', "\"\""))
    } else {
        value.to_string()
    }
}

fn csv_optional(value: Option<&str>) -> String {
    value.map(csv_value).unwrap_or_default()
}

fn parse_reminder_days(value: &str) -> Vec<i64> {
    value
        .split(',')
        .filter_map(|item| item.trim().parse::<i64>().ok())
        .collect()
}

fn serialize_reminder_days(value: &[i64]) -> String {
    value
        .iter()
        .map(|item| item.to_string())
        .collect::<Vec<_>>()
        .join(",")
}

fn parse_string_list(value: &str) -> Vec<String> {
    value
        .split(',')
        .filter_map(|item| {
            let trimmed = item.trim();
            (!trimmed.is_empty()).then(|| trimmed.to_string())
        })
        .collect()
}

fn serialize_string_list(value: &[String]) -> String {
    value.join(",")
}

#[cfg(test)]
mod tests {
    use super::*;

    fn unique_temp_dir(label: &str) -> PathBuf {
        let path = std::env::temp_dir().join(format!("get-steady-{label}-{}", Uuid::new_v4()));
        fs::create_dir_all(&path).expect("temp dir created");
        path
    }

    #[test]
    fn run_migrations_creates_tables() {
        let connection = Connection::open_in_memory().expect("in-memory database");
        run_migrations(&connection).expect("migration success");

        let table_count: i64 = connection
            .query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name IN ('schema_migrations', 'categories', 'entries', 'debts', 'check_ins', 'user_settings')",
                [],
                |row| row.get(0),
            )
            .expect("table count");

        assert_eq!(table_count, 6);
    }

    #[test]
    fn run_migrations_upgrades_legacy_v2_database_with_user_settings() {
        let connection = Connection::open_in_memory().expect("in-memory database");
        connection
            .execute_batch(
                "
                CREATE TABLE schema_migrations (
                  version INTEGER PRIMARY KEY,
                  applied_at TEXT NOT NULL
                );

                INSERT INTO schema_migrations (version, applied_at) VALUES (2, '2026-03-27T00:00:00Z');

                CREATE TABLE categories (
                  id TEXT PRIMARY KEY,
                  name TEXT NOT NULL UNIQUE,
                  type TEXT NOT NULL
                );
                ",
            )
            .expect("legacy schema setup");

        run_migrations(&connection).expect("migration success");

        let settings_count: i64 = connection
            .query_row("SELECT COUNT(*) FROM user_settings", [], |row| row.get(0))
            .expect("user settings count");
        let version: i64 = connection
            .query_row("SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1", [], |row| row.get(0))
            .expect("schema version");

        assert_eq!(settings_count, 1);
        assert_eq!(version, SCHEMA_VERSION);
    }

    #[test]
    fn run_migrations_repairs_legacy_cents_schema_for_boot_queries() {
        let connection = Connection::open_in_memory().expect("in-memory database");
        connection
            .execute_batch(
                "
                CREATE TABLE schema_migrations (
                  version INTEGER PRIMARY KEY,
                  applied_at TEXT NOT NULL
                );

                INSERT INTO schema_migrations (version, applied_at) VALUES (3, '2026-03-27T00:00:00Z');

                CREATE TABLE categories (
                  id TEXT PRIMARY KEY,
                  name TEXT NOT NULL UNIQUE,
                  type TEXT NOT NULL
                );

                CREATE TABLE debts (
                  id TEXT PRIMARY KEY,
                  name TEXT NOT NULL,
                  lender TEXT,
                  starting_balance_cents INTEGER NOT NULL,
                  interest_rate_bps INTEGER,
                  minimum_payment_cents INTEGER,
                  due_day INTEGER,
                  created_at TEXT NOT NULL,
                  updated_at TEXT NOT NULL,
                  is_active INTEGER NOT NULL DEFAULT 1
                );

                CREATE TABLE entries (
                  id TEXT PRIMARY KEY,
                  type TEXT NOT NULL,
                  amount_cents INTEGER NOT NULL,
                  category_id TEXT,
                  debt_id TEXT,
                  note TEXT,
                  entry_date TEXT NOT NULL,
                  created_at TEXT NOT NULL,
                  updated_at TEXT NOT NULL,
                  source TEXT NOT NULL,
                  is_estimated INTEGER NOT NULL DEFAULT 0
                );

                CREATE TABLE check_ins (
                  date TEXT PRIMARY KEY,
                  completed INTEGER NOT NULL DEFAULT 1,
                  completed_at TEXT,
                  is_partial INTEGER NOT NULL DEFAULT 0,
                  note TEXT
                );

                INSERT INTO debts (
                  id, name, lender, starting_balance_cents, interest_rate_bps, minimum_payment_cents, due_day, created_at, updated_at, is_active
                ) VALUES (
                  'debt-1', 'Visa', 'Bank', 100000, 2150, 5500, 12, '2026-03-01T00:00:00Z', '2026-03-01T00:00:00Z', 1
                );

                INSERT INTO entries (
                  id, type, amount_cents, category_id, debt_id, note, entry_date, created_at, updated_at, source, is_estimated
                ) VALUES (
                  'entry-1', 'debt_payment', 12500, 'cat-debt-payment', 'debt-1', 'payment', '2026-03-27', '2026-03-27T00:00:00Z', '2026-03-27T00:00:00Z', 'manual', 0
                );
                ",
            )
            .expect("legacy cents schema setup");

        run_migrations(&connection).expect("migration success");

        let entries = list_entries(&connection, None).expect("entries list");
        let debts = list_debts(&connection).expect("debts list");
        let version: i64 = connection
            .query_row("SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1", [], |row| row.get(0))
            .expect("schema version");

        assert_eq!(version, SCHEMA_VERSION);
        assert_eq!(entries.len(), 1);
        assert_eq!(entries[0].amount, 125.0);
        assert_eq!(debts.len(), 1);
        assert_eq!(debts[0].balance_current, 875.0);
        assert_eq!(debts[0].interest_rate, Some(21.5));
        assert_eq!(debts[0].minimum_payment, Some(55.0));
    }

    #[test]
    fn run_migrations_adds_theme_mode_for_bootstrapped_settings() {
        let connection = Connection::open_in_memory().expect("in-memory database");
        connection
            .execute_batch(
                "
                CREATE TABLE schema_migrations (
                  version INTEGER PRIMARY KEY,
                  applied_at TEXT NOT NULL
                );

                INSERT INTO schema_migrations (version, applied_at) VALUES (4, '2026-03-27T00:00:00Z');

                CREATE TABLE categories (
                  id TEXT PRIMARY KEY,
                  name TEXT NOT NULL,
                  type TEXT NOT NULL,
                  created_at TEXT NOT NULL,
                  updated_at TEXT NOT NULL
                );

                CREATE TABLE user_settings (
                  id INTEGER PRIMARY KEY CHECK (id = 1),
                  has_completed_onboarding INTEGER NOT NULL DEFAULT 0,
                  onboarding_completed_at TEXT,
                  daily_check_in_time TEXT,
                  selected_category_ids TEXT NOT NULL DEFAULT '',
                  reminders_enabled INTEGER NOT NULL DEFAULT 1,
                  daily_review_mode TEXT NOT NULL DEFAULT 'simple',
                  default_view TEXT NOT NULL DEFAULT 'today',
                  reminder_time TEXT NOT NULL DEFAULT '19:00',
                  reminder_days TEXT NOT NULL DEFAULT '0,1,2,3,4,5,6',
                  catch_up_reminder_enabled INTEGER NOT NULL DEFAULT 1,
                  debt_due_reminder_enabled INTEGER NOT NULL DEFAULT 1,
                  quiet_hours_start TEXT NOT NULL DEFAULT '21:30',
                  quiet_hours_end TEXT NOT NULL DEFAULT '08:00',
                  weekend_reminders_enabled INTEGER NOT NULL DEFAULT 1,
                  catch_up_prompt_mode TEXT NOT NULL DEFAULT 'when_missed',
                  show_advanced_options INTEGER NOT NULL DEFAULT 0,
                  updated_at TEXT NOT NULL
                );

                INSERT INTO user_settings (
                  id,
                  has_completed_onboarding,
                  onboarding_completed_at,
                  daily_check_in_time,
                  reminders_enabled,
                  daily_review_mode,
                  default_view,
                  reminder_time,
                  reminder_days,
                  catch_up_reminder_enabled,
                  debt_due_reminder_enabled,
                  quiet_hours_start,
                  quiet_hours_end,
                  weekend_reminders_enabled,
                  catch_up_prompt_mode,
                  show_advanced_options,
                  updated_at
                ) VALUES (
                  1,
                  1,
                  '2026-03-01T00:00:00Z',
                  '18:30',
                  1,
                  'simple',
                  'today',
                  '18:30',
                  '1,2,3,4,5',
                  1,
                  1,
                  '22:00',
                  '07:00',
                  1,
                  'when_missed',
                  0,
                  '2026-03-27T00:00:00Z'
                );
                ",
            )
            .expect("legacy settings schema");

        run_migrations(&connection).expect("migration success");

        let theme_mode: String = connection
            .query_row("SELECT theme_mode FROM user_settings WHERE id = 1", [], |row| row.get(0))
            .expect("theme mode");
        let version: i64 = connection
            .query_row("SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1", [], |row| row.get(0))
            .expect("schema version");

        assert_eq!(theme_mode, "system");
        assert_eq!(version, SCHEMA_VERSION);
    }

    #[test]
    fn validate_entry_input_rejects_invalid_values() {
        let baseline = EntryInput {
            id: None,
            entry_type: "expense".to_string(),
            amount: 12.5,
            category_id: Some("cat-groceries".to_string()),
            debt_id: None,
            note: None,
            entry_date: "2026-03-28".to_string(),
            source: "manual".to_string(),
            is_estimated: false,
        };

        assert!(validate_entry_input(&baseline).is_ok());
        assert!(validate_entry_input(&EntryInput {
            entry_type: "weird".to_string(),
            ..baseline.clone()
        })
        .is_err());
        assert!(validate_entry_input(&EntryInput {
            amount: 0.0,
            ..baseline.clone()
        })
        .is_err());
        assert!(validate_entry_input(&EntryInput {
            entry_date: "03/28/2026".to_string(),
            ..baseline.clone()
        })
        .is_err());
        assert!(validate_entry_input(&EntryInput {
            debt_id: Some("debt-1".to_string()),
            ..baseline
        })
        .is_err());
    }

    #[test]
    fn validate_debt_input_rejects_invalid_values() {
        let baseline = DebtInput {
            id: None,
            name: "Visa".to_string(),
            lender: None,
            balance_current: 100.0,
            interest_rate: Some(12.5),
            minimum_payment: Some(25.0),
            due_day: Some(15),
            is_active: true,
        };

        assert!(validate_debt_input(&baseline).is_ok());
        assert!(validate_debt_input(&DebtInput {
            name: "   ".to_string(),
            ..baseline.clone()
        })
        .is_err());
        assert!(validate_debt_input(&DebtInput {
            balance_current: -1.0,
            ..baseline.clone()
        })
        .is_err());
        assert!(validate_debt_input(&DebtInput {
            due_day: Some(40),
            ..baseline
        })
        .is_err());
    }

    #[test]
    fn validate_onboarding_and_settings_reject_invalid_values() {
        let onboarding = OnboardingInput {
            daily_check_in_time: Some("7pm".to_string()),
            reminders_enabled: true,
            daily_review_mode: Some("deep".to_string()),
            selected_category_ids: vec![],
        };
        assert!(validate_onboarding_input(&onboarding).is_err());

        let settings = UserSettingsInput {
            default_view: "weird".to_string(),
            theme_mode: "blue".to_string(),
            reminders_enabled: true,
            reminder_time: "25:99".to_string(),
            reminder_days: vec![0, 7],
            catch_up_reminder_enabled: true,
            debt_due_reminder_enabled: true,
            quiet_hours_start: "21:30".to_string(),
            quiet_hours_end: "08:00".to_string(),
            weekend_reminders_enabled: true,
            catch_up_prompt_mode: "sometimes".to_string(),
            show_advanced_options: false,
        };
        assert!(validate_user_settings_input(&settings).is_err());
    }

    #[test]
    fn validate_check_in_input_rejects_invalid_date() {
        let input = CheckInInput {
            date: "2026/03/28".to_string(),
            is_partial: false,
            note: None,
        };

        assert!(validate_check_in_input(&input).is_err());
    }

    #[test]
    fn get_onboarding_round_trips_selected_category_ids() {
        let connection = Connection::open_in_memory().expect("in-memory database");
        run_migrations(&connection).expect("migration success");

        connection
            .execute(
                "
                UPDATE user_settings
                SET has_completed_onboarding = 1,
                    daily_check_in_time = '18:45',
                    selected_category_ids = ?1,
                    reminders_enabled = 1,
                    daily_review_mode = 'simple',
                    updated_at = ?2
                WHERE id = 1
                ",
                params![serialize_string_list(&["cat-groceries".to_string(), "cat-gas".to_string()]), now()],
            )
            .expect("update onboarding");

        let onboarding = get_onboarding(&connection).expect("load onboarding");

        assert!(onboarding.has_completed_onboarding);
        assert_eq!(onboarding.daily_check_in_time.as_deref(), Some("18:45"));
        assert_eq!(onboarding.selected_category_ids, vec!["cat-groceries", "cat-gas"]);
    }

    #[test]
    fn create_backup_writes_valid_snapshot_and_records_metadata() {
        let mut connection = Connection::open_in_memory().expect("in-memory database");
        run_migrations(&connection).expect("migration success");
        let backup_dir = unique_temp_dir("backup-create");

        let record = create_backup_for_connection(&mut connection, &backup_dir, "manual", "user").expect("backup created");

        assert!(Path::new(&record.file_path).exists());
        validate_backup_file(Path::new(&record.file_path)).expect("backup validates");

        let records = list_backup_records(&connection).expect("backup records");
        assert_eq!(records.len(), 1);
        assert_eq!(records[0].kind, "manual");
        assert_eq!(records[0].status, "success");
        assert!(records[0].size_bytes.unwrap_or_default() > 0);
    }

    #[test]
    fn automatic_backup_due_logic_requires_rolling_24_hours() {
        assert!(automatic_backup_is_due(None).expect("no last backup should be due"));
        assert!(
            !automatic_backup_is_due(Some(&now())).expect("fresh backup should not be due"),
            "automatic backup should not rerun before 24 hours have elapsed"
        );
    }

    #[test]
    fn backup_summary_uses_latest_successful_automatic_backup_only() {
        let connection = Connection::open_in_memory().expect("in-memory database");
        run_migrations(&connection).expect("migration success");

        insert_backup_record(
            &connection,
            &BackupRecord {
                id: "manual-1".to_string(),
                kind: "manual".to_string(),
                status: "success".to_string(),
                file_path: "C:\\backups\\manual.sqlite".to_string(),
                file_name: "manual.sqlite".to_string(),
                created_at: "2026-03-20T12:00:00Z".to_string(),
                completed_at: Some("2026-03-20T12:00:02Z".to_string()),
                size_bytes: Some(1024),
                error_message: None,
                triggered_by: "user".to_string(),
            },
        )
        .expect("insert manual backup");
        insert_backup_record(
            &connection,
            &BackupRecord {
                id: "auto-failed".to_string(),
                kind: "auto".to_string(),
                status: "failed".to_string(),
                file_path: "C:\\backups\\failed.sqlite".to_string(),
                file_name: "failed.sqlite".to_string(),
                created_at: "2026-03-21T12:00:00Z".to_string(),
                completed_at: Some("2026-03-21T12:00:02Z".to_string()),
                size_bytes: None,
                error_message: Some("disk full".to_string()),
                triggered_by: "scheduler".to_string(),
            },
        )
        .expect("insert failed auto backup");
        insert_backup_record(
            &connection,
            &BackupRecord {
                id: "auto-success".to_string(),
                kind: "auto".to_string(),
                status: "success".to_string(),
                file_path: "C:\\backups\\auto.sqlite".to_string(),
                file_name: "auto.sqlite".to_string(),
                created_at: "2026-03-22T12:00:00Z".to_string(),
                completed_at: Some("2026-03-22T12:00:02Z".to_string()),
                size_bytes: Some(2048),
                error_message: None,
                triggered_by: "scheduler".to_string(),
            },
        )
        .expect("insert successful auto backup");

        let summary = get_backup_summary(&connection).expect("backup summary");

        assert_eq!(
            summary.last_successful_automatic_backup_at,
            Some("2026-03-22T12:00:00Z".to_string())
        );
        assert_eq!(
            summary.next_automatic_backup_due_at,
            Some("2026-03-23T12:00:00Z".to_string())
        );
    }

    #[test]
    fn hybrid_retention_keeps_daily_weekly_and_monthly_automatic_backups() {
        let records = vec![
            backup_record_for_retention("b1", "2026-03-28T12:00:00Z"),
            backup_record_for_retention("b2", "2026-03-27T12:00:00Z"),
            backup_record_for_retention("b3", "2026-03-26T12:00:00Z"),
            backup_record_for_retention("b4", "2026-03-25T12:00:00Z"),
            backup_record_for_retention("b5", "2026-03-24T12:00:00Z"),
            backup_record_for_retention("b6", "2026-03-23T12:00:00Z"),
            backup_record_for_retention("b7", "2026-03-22T12:00:00Z"),
            backup_record_for_retention("b8", "2026-03-15T12:00:00Z"),
            backup_record_for_retention("b9", "2026-02-15T12:00:00Z"),
            backup_record_for_retention("b10", "2026-01-15T12:00:00Z"),
            backup_record_for_retention("b11", "2025-12-15T12:00:00Z"),
            backup_record_for_retention("b12", "2025-11-15T12:00:00Z"),
            backup_record_for_retention("b13", "2025-10-15T12:00:00Z"),
            backup_record_for_retention("b14", "2025-09-15T12:00:00Z"),
        ];

        let keep_ids = select_automatic_backup_ids_to_keep(&records).expect("retention selection");

        assert!(keep_ids.contains("b1"));
        assert!(keep_ids.contains("b7"));
        assert!(keep_ids.contains("b8"));
        assert!(keep_ids.contains("b9"));
        assert!(keep_ids.contains("b13"));
        assert!(!keep_ids.contains("b14"));
    }

    #[test]
    fn prune_automatic_backups_preserves_manual_and_pre_restore_records() {
        let connection = Connection::open_in_memory().expect("in-memory database");
        run_migrations(&connection).expect("migration success");
        let backup_dir = unique_temp_dir("backup-prune");
        fs::create_dir_all(&backup_dir).expect("backup dir");

        for day in 1..=10 {
            let file_path = backup_dir.join(format!("auto-{day}.sqlite"));
            fs::write(&file_path, b"auto").expect("auto backup file");
            insert_backup_record(
                &connection,
                &BackupRecord {
                    id: format!("auto-{day}"),
                    kind: "auto".to_string(),
                    status: "success".to_string(),
                    file_path: file_path.display().to_string(),
                    file_name: format!("auto-{day}.sqlite"),
                    created_at: format!("2026-03-{day:02}T12:00:00Z"),
                    completed_at: Some(format!("2026-03-{day:02}T12:00:01Z")),
                    size_bytes: Some(4),
                    error_message: None,
                    triggered_by: "scheduler".to_string(),
                },
            )
            .expect("insert auto backup record");
        }

        for kind in ["manual", "pre-restore"] {
            let file_path = backup_dir.join(format!("{kind}.sqlite"));
            fs::write(&file_path, kind.as_bytes()).expect("non auto backup file");
            insert_backup_record(
                &connection,
                &BackupRecord {
                    id: kind.to_string(),
                    kind: kind.to_string(),
                    status: "success".to_string(),
                    file_path: file_path.display().to_string(),
                    file_name: format!("{kind}.sqlite"),
                    created_at: "2026-03-28T23:00:00Z".to_string(),
                    completed_at: Some("2026-03-28T23:00:01Z".to_string()),
                    size_bytes: Some(8),
                    error_message: None,
                    triggered_by: "user".to_string(),
                },
            )
            .expect("insert non auto backup record");
        }

        prune_automatic_backups(&connection).expect("prune automatic backups");
        let remaining = list_backup_records(&connection).expect("remaining backups");

        assert!(remaining.iter().any(|record| record.id == "manual"));
        assert!(remaining.iter().any(|record| record.id == "pre-restore"));
        assert!(Path::new(&backup_dir.join("manual.sqlite")).exists());
        assert!(Path::new(&backup_dir.join("pre-restore.sqlite")).exists());
    }

    #[test]
    fn restore_backup_creates_pre_restore_backup_before_replacing_live_database() {
        let temp_dir = unique_temp_dir("backup-restore");
        let live_db_path = temp_dir.join("live.sqlite");
        let backup_dir = temp_dir.join("backups");
        fs::create_dir_all(&backup_dir).expect("backup dir");

        let mut live_connection = Connection::open(&live_db_path).expect("live db");
        run_migrations(&live_connection).expect("migrations");
        live_connection
            .execute(
                "INSERT INTO categories (id, name, type) VALUES (?1, ?2, ?3)",
                params!["cat-custom", "Custom", "expense"],
            )
            .expect("seed custom category");
        live_connection
            .execute(
                "INSERT INTO entries (id, type, amount, category_id, debt_id, note, entry_date, created_at, updated_at, source, is_estimated)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
                params![
                    "entry-before",
                    "expense",
                    12.50_f64,
                    "cat-custom",
                    Option::<String>::None,
                    Option::<String>::None,
                    "2026-03-28",
                    now(),
                    now(),
                    "manual",
                    0_i64
                ],
            )
            .expect("insert original entry");

        let source_backup = create_backup_for_connection(&mut live_connection, &backup_dir, "manual", "user").expect("source backup");

        live_connection
            .execute(
                "DELETE FROM entries WHERE id = ?1",
                params!["entry-before"],
            )
            .expect("delete original entry");
        live_connection
            .execute(
                "INSERT INTO entries (id, type, amount, category_id, debt_id, note, entry_date, created_at, updated_at, source, is_estimated)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
                params![
                    "entry-after",
                    "expense",
                    75.00_f64,
                    "cat-custom",
                    Option::<String>::None,
                    Option::<String>::None,
                    "2026-03-28",
                    now(),
                    now(),
                    "manual",
                    0_i64
                ],
            )
            .expect("insert changed entry");
        drop(live_connection);

        restore_backup_from_file(&live_db_path, Path::new(&source_backup.file_path), &backup_dir).expect("restore succeeds");

        let restored_connection = Connection::open(&live_db_path).expect("restored live db");
        let entry_ids: Vec<String> = restored_connection
            .prepare("SELECT id FROM entries ORDER BY id")
            .expect("entry query")
            .query_map([], |row| row.get(0))
            .expect("entry rows")
            .collect::<Result<Vec<_>, _>>()
            .expect("entry ids");

        assert_eq!(entry_ids, vec!["entry-before".to_string()]);

        let pre_restore_count = fs::read_dir(&backup_dir)
            .expect("backup dir contents")
            .filter_map(|entry| entry.ok())
            .filter(|entry| entry.file_name().to_string_lossy().contains("pre-restore"))
            .count();
        assert_eq!(pre_restore_count, 1);
    }

    #[test]
    fn restore_rejects_invalid_backup_and_does_not_create_pre_restore_snapshot() {
        let temp_dir = unique_temp_dir("backup-restore-invalid");
        let live_db_path = temp_dir.join("live.sqlite");
        let backup_dir = temp_dir.join("backups");
        fs::create_dir_all(&backup_dir).expect("backup dir");

        let live_connection = Connection::open(&live_db_path).expect("live db");
        run_migrations(&live_connection).expect("migrations");
        drop(live_connection);

        let invalid_backup_path = backup_dir.join("invalid.sqlite");
        fs::write(&invalid_backup_path, b"not-a-sqlite-file").expect("invalid backup file");

        let error = restore_backup_from_file(&live_db_path, &invalid_backup_path, &backup_dir).expect_err("restore should fail");

        assert!(
            error.contains("failed to open backup file")
                || error.contains("backup integrity check failed")
                || error.contains("failed to run backup integrity check")
        );
        let pre_restore_count = fs::read_dir(&backup_dir)
            .expect("backup dir contents")
            .filter_map(|entry| entry.ok())
            .filter(|entry| entry.file_name().to_string_lossy().contains("pre-restore"))
            .count();
        assert_eq!(pre_restore_count, 0);
    }
}
