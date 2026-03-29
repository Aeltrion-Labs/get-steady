use crate::models::{
    BootstrapPayload, CategoryRecord, CheckInInput, CheckInRecord, DebtInput, DebtPaymentInput,
    DebtRecord, EntryFilters, EntryInput, EntryRecord, OnboardingInput, OnboardingStateRecord,
    UserSettingsInput, UserSettingsRecord,
};
use rusqlite::{params, params_from_iter, Connection, OptionalExtension, ToSql};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};
use time::OffsetDateTime;
use uuid::Uuid;

const SCHEMA_VERSION: i64 = 5;

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
    fs::create_dir_all(&backup_dir)
        .map_err(|error| format!("failed to create backup dir: {error}"))?;
    fs::create_dir_all(&export_dir)
        .map_err(|error| format!("failed to create export dir: {error}"))?;

    let connection =
        Connection::open(&db_path).map_err(|error| format!("failed to open database: {error}"))?;
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
        if row.map_err(|error| format!("failed to read table info for {table}: {error}"))? == column
        {
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
        .map_err(|error| {
            format!("failed to ensure user settings table during legacy repair: {error}")
        })?;

    if table_has_column(connection, "entries", "amount_cents")?
        && !table_has_column(connection, "entries", "amount")?
    {
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

    if table_has_column(connection, "debts", "starting_balance_cents")?
        && !table_has_column(connection, "debts", "balance_current")?
    {
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

    if table_has_column(connection, "debts", "interest_rate_bps")?
        && !table_has_column(connection, "debts", "interest_rate")?
    {
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

    if table_has_column(connection, "debts", "minimum_payment_cents")?
        && !table_has_column(connection, "debts", "minimum_payment")?
    {
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
            VALUES (1, 0, NULL, '19:00', 1, 'simple', 'today', 'system', '19:00', '0,1,2,3,4,5,6', 1, 1, '21:30', '08:00', 1, 'when_missed', 0, ?1)
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
    Ok(OnboardingStateRecord {
        has_completed_onboarding: row.get::<_, i64>(0)? == 1,
        onboarding_completed_at: row.get(1)?,
        daily_check_in_time: row.get(2)?,
        reminders_enabled: row.get::<_, i64>(3)? == 1,
        daily_review_mode: row.get(4)?,
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

pub fn list_entries(
    connection: &Connection,
    filters: Option<EntryFilters>,
) -> Result<Vec<EntryRecord>, String> {
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

fn get_onboarding(connection: &Connection) -> Result<OnboardingStateRecord, String> {
    connection
        .query_row(
            "SELECT has_completed_onboarding, onboarding_completed_at, daily_check_in_time, reminders_enabled, daily_review_mode FROM user_settings WHERE id = 1",
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
    })
}

pub fn save_onboarding(
    app: &AppHandle,
    input: OnboardingInput,
) -> Result<OnboardingStateRecord, String> {
    let (connection, _) = open_connection(app)?;
    connection
        .execute(
            "
            UPDATE user_settings
            SET has_completed_onboarding = 1,
                onboarding_completed_at = ?1,
                daily_check_in_time = ?2,
                reminders_enabled = ?3,
                daily_review_mode = ?4,
                reminder_time = COALESCE(?2, reminder_time),
                updated_at = ?1
            WHERE id = 1
            ",
            params![
                now(),
                input.daily_check_in_time,
                if input.reminders_enabled { 1 } else { 0 },
                input
                    .daily_review_mode
                    .unwrap_or_else(|| "simple".to_string()),
            ],
        )
        .map_err(|error| format!("failed to save onboarding: {error}"))?;

    let _ = input.selected_category_ids;

    get_onboarding(&connection)
}

pub fn save_settings(
    app: &AppHandle,
    input: UserSettingsInput,
) -> Result<UserSettingsRecord, String> {
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
                if input.catch_up_reminder_enabled {
                    1
                } else {
                    0
                },
                if input.debt_due_reminder_enabled {
                    1
                } else {
                    0
                },
                input.quiet_hours_start,
                input.quiet_hours_end,
                if input.weekend_reminders_enabled {
                    1
                } else {
                    0
                },
                input.catch_up_prompt_mode,
                if input.show_advanced_options { 1 } else { 0 },
                now(),
            ],
        )
        .map_err(|error| format!("failed to save user settings: {error}"))?;

    get_settings(&connection)
}

pub fn save_entry(app: &AppHandle, input: EntryInput) -> Result<EntryRecord, String> {
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

fn adjust_debt_balance(
    transaction: &rusqlite::Transaction<'_>,
    debt_id: &str,
    delta: f64,
) -> Result<(), String> {
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

pub fn record_debt_payment(
    app: &AppHandle,
    input: DebtPaymentInput,
) -> Result<EntryRecord, String> {
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
            debt.interest_rate
                .map(|value| value.to_string())
                .unwrap_or_default(),
            debt.minimum_payment
                .map(|value| format!("{value:.2}"))
                .unwrap_or_default(),
            debt.due_day
                .map(|value| value.to_string())
                .unwrap_or_default(),
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
        fs::create_dir_all(parent)
            .map_err(|error| format!("failed to prepare backup directory: {error}"))?;
    }
    if path.exists() {
        fs::remove_file(&path)
            .map_err(|error| format!("failed to replace backup file: {error}"))?;
    }

    connection
        .execute("VACUUM INTO ?1", params![destination])
        .map_err(|error| format!("failed to create backup: {error}"))?;

    Ok(path.display().to_string())
}

fn write_text_file(destination: &str, contents: &str) -> Result<(), String> {
    let path = Path::new(destination);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|error| format!("failed to prepare export directory: {error}"))?;
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

#[cfg(test)]
mod tests {
    use super::*;

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
            .query_row(
                "SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1",
                [],
                |row| row.get(0),
            )
            .expect("schema version");

        assert_eq!(settings_count, 1);
        assert_eq!(version, 5);
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
            .query_row(
                "SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1",
                [],
                |row| row.get(0),
            )
            .expect("schema version");

        assert_eq!(version, 5);
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
            .query_row(
                "SELECT theme_mode FROM user_settings WHERE id = 1",
                [],
                |row| row.get(0),
            )
            .expect("theme mode");
        let version: i64 = connection
            .query_row(
                "SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1",
                [],
                |row| row.get(0),
            )
            .expect("schema version");

        assert_eq!(theme_mode, "system");
        assert_eq!(version, 5);
    }
}
