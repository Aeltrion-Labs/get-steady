use crate::models::{
    BootstrapPayload, CategoryRecord, CheckInInput, CheckInRecord, DebtInput, DebtPaymentInput, DebtRecord,
    EntryFilters, EntryInput, EntryRecord,
};
use rusqlite::{params, params_from_iter, Connection, OptionalExtension, ToSql};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};
use time::{Date, OffsetDateTime};
use uuid::Uuid;

const SCHEMA_VERSION: i64 = 2;

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
    validate_database_integrity(&connection)?;

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

    if applied.unwrap_or_default() < SCHEMA_VERSION {
        connection
            .execute_batch(
                "
                DROP TABLE IF EXISTS check_ins;
                DROP TABLE IF EXISTS entries;
                DROP TABLE IF EXISTS debts;
                DROP TABLE IF EXISTS categories;

                CREATE TABLE IF NOT EXISTS categories (
                  id TEXT PRIMARY KEY,
                  name TEXT NOT NULL UNIQUE,
                  type TEXT NOT NULL CHECK(type IN ('income', 'expense', 'both'))
                );

                CREATE TABLE IF NOT EXISTS debts (
                  id TEXT PRIMARY KEY,
                  name TEXT NOT NULL,
                  lender TEXT,
                  starting_balance_cents INTEGER NOT NULL CHECK(starting_balance_cents >= 0),
                  interest_rate_bps INTEGER CHECK(interest_rate_bps >= 0),
                  minimum_payment_cents INTEGER CHECK(minimum_payment_cents >= 0),
                  due_day INTEGER CHECK(due_day BETWEEN 1 AND 31),
                  created_at TEXT NOT NULL,
                  updated_at TEXT NOT NULL,
                  is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0, 1))
                );

                CREATE TABLE IF NOT EXISTS entries (
                  id TEXT PRIMARY KEY,
                  type TEXT NOT NULL CHECK(type IN ('income', 'expense', 'debt_payment')),
                  amount_cents INTEGER NOT NULL CHECK(amount_cents > 0),
                  category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
                  debt_id TEXT REFERENCES debts(id) ON DELETE RESTRICT,
                  note TEXT,
                  entry_date TEXT NOT NULL CHECK(entry_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
                  created_at TEXT NOT NULL,
                  updated_at TEXT NOT NULL,
                  source TEXT NOT NULL CHECK(source IN ('manual', 'catch_up', 'seed', 'import', 'api', 'cli', 'mcp')),
                  is_estimated INTEGER NOT NULL DEFAULT 0 CHECK(is_estimated IN (0, 1)),
                  CHECK(
                    (type = 'debt_payment' AND debt_id IS NOT NULL AND category_id = 'cat-debt-payment')
                    OR
                    (type IN ('income', 'expense') AND debt_id IS NULL AND category_id IS NOT NULL)
                  )
                );

                CREATE TABLE IF NOT EXISTS check_ins (
                  date TEXT PRIMARY KEY CHECK(date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
                  completed INTEGER NOT NULL DEFAULT 1 CHECK(completed IN (0, 1)),
                  completed_at TEXT,
                  is_partial INTEGER NOT NULL DEFAULT 0 CHECK(is_partial IN (0, 1)),
                  note TEXT,
                  CHECK(
                    (completed = 1 AND is_partial = 0 AND completed_at IS NOT NULL)
                    OR
                    (completed = 0 AND is_partial = 1 AND completed_at IS NULL)
                  )
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
                params![SCHEMA_VERSION, now()],
            )
            .map_err(|error| format!("failed to record migration version: {error}"))?;
    }

    seed_categories(connection)?;
    Ok(())
}

fn validate_database_integrity(connection: &Connection) -> Result<(), String> {
    let result: String = connection
        .query_row("PRAGMA integrity_check(1)", [], |row| row.get(0))
        .map_err(|error| format!("failed to run integrity check: {error}"))?;

    if result == "ok" {
        Ok(())
    } else {
        Err(format!("database integrity check failed: {result}"))
    }
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
        amount: cents_to_amount(row.get(2)?),
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
        balance_current: cents_to_amount(row.get(3)?),
        interest_rate: bps_to_rate(row.get(4)?),
        minimum_payment: optional_cents_to_amount(row.get(5)?),
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
        "SELECT id, type, amount_cents, category_id, debt_id, note, entry_date, created_at, updated_at, source, is_estimated FROM entries",
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
            "
            SELECT
              d.id,
              d.name,
              d.lender,
              MAX(d.starting_balance_cents - COALESCE(SUM(CASE WHEN e.type = 'debt_payment' THEN e.amount_cents ELSE 0 END), 0), 0) AS current_balance_cents,
              d.interest_rate_bps,
              d.minimum_payment_cents,
              d.due_day,
              d.created_at,
              d.updated_at,
              d.is_active
            FROM debts d
            LEFT JOIN entries e ON e.debt_id = d.id
            GROUP BY d.id, d.name, d.lender, d.starting_balance_cents, d.interest_rate_bps, d.minimum_payment_cents, d.due_day, d.created_at, d.updated_at, d.is_active
            ORDER BY d.is_active DESC, d.name
            ",
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

fn amount_to_cents(value: f64, field_name: &str, allow_zero: bool) -> Result<i64, String> {
    if !value.is_finite() {
        return Err(format!("{field_name} must be a finite number."));
    }

    let scaled = value * 100.0;
    let rounded = scaled.round();
    if (scaled - rounded).abs() > 0.000_001 {
        return Err(format!("{field_name} cannot have more than two decimal places."));
    }

    let cents = rounded as i64;
    if allow_zero {
        if cents < 0 {
            return Err(format!("{field_name} cannot be negative."));
        }
    } else if cents <= 0 {
        return Err(format!("{field_name} must be greater than zero."));
    }

    Ok(cents)
}

fn optional_amount_to_cents(value: Option<f64>, field_name: &str) -> Result<Option<i64>, String> {
    value.map(|amount| amount_to_cents(amount, field_name, true)).transpose()
}

fn cents_to_amount(cents: i64) -> f64 {
    cents as f64 / 100.0
}

fn optional_cents_to_amount(cents: Option<i64>) -> Option<f64> {
    cents.map(cents_to_amount)
}

fn rate_to_bps(value: Option<f64>) -> Result<Option<i64>, String> {
    value.map(|rate| amount_to_cents(rate, "Interest rate", true)).transpose()
}

fn bps_to_rate(value: Option<i64>) -> Option<f64> {
    value.map(|bps| bps as f64 / 100.0)
}

fn require_iso_date(value: &str, field_name: &str) -> Result<(), String> {
    let format = time::format_description::parse("[year]-[month]-[day]")
        .map_err(|error| format!("failed to load date format: {error}"))?;
    Date::parse(value, &format).map_err(|_| format!("{field_name} must use YYYY-MM-DD format."))?;
    Ok(())
}

fn trim_optional(value: Option<String>) -> Option<String> {
    value.and_then(|item| {
        let trimmed = item.trim();
        if trimmed.is_empty() {
            None
        } else {
            Some(trimmed.to_string())
        }
    })
}

fn require_existing_record(connection: &Connection, table: &str, id: &str, label: &str) -> Result<(), String> {
    let sql = format!("SELECT EXISTS(SELECT 1 FROM {table} WHERE id = ?1)");
    let exists: i64 = connection
        .query_row(&sql, params![id], |row| row.get(0))
        .map_err(|error| format!("failed to validate {label}: {error}"))?;

    if exists == 1 {
        Ok(())
    } else {
        Err(format!("{label} was not found."))
    }
}

fn sum_debt_payments_cents(connection: &Connection, debt_id: &str) -> Result<i64, String> {
    connection
        .query_row(
            "SELECT COALESCE(SUM(amount_cents), 0) FROM entries WHERE debt_id = ?1 AND type = 'debt_payment'",
            params![debt_id],
            |row| row.get(0),
        )
        .map_err(|error| format!("failed to sum debt payments: {error}"))
}

fn save_entry_for_connection(connection: &mut Connection, input: EntryInput) -> Result<EntryRecord, String> {
    let entry_type = input.entry_type.trim().to_string();
    if !matches!(entry_type.as_str(), "income" | "expense" | "debt_payment") {
        return Err("Entry type is invalid.".to_string());
    }

    let source = input.source.trim().to_string();
    if !matches!(source.as_str(), "manual" | "catch_up" | "seed" | "import" | "api" | "cli" | "mcp") {
        return Err("Entry source is invalid.".to_string());
    }

    require_iso_date(&input.entry_date, "entry date")?;
    let amount_cents = amount_to_cents(input.amount, "Amount", false)?;
    let note = trim_optional(input.note);
    let is_update = input.id.is_some();
    let entry_id = input.id.unwrap_or_else(|| Uuid::new_v4().to_string());

    if is_update {
        require_existing_record(connection, "entries", &entry_id, "Entry")?;
    }

    let (category_id, debt_id) = if entry_type == "debt_payment" {
        let debt_id = input
            .debt_id
            .map(|value| value.trim().to_string())
            .filter(|value| !value.is_empty())
            .ok_or_else(|| "Debt payment entries must be linked to a debt.".to_string())?;
        require_existing_record(connection, "debts", &debt_id, "Debt")?;
        (Some("cat-debt-payment".to_string()), Some(debt_id))
    } else {
        if input.debt_id.is_some() {
            return Err("Non-debt payment entries cannot be linked to a debt.".to_string());
        }
        let category_id = input
            .category_id
            .map(|value| value.trim().to_string())
            .filter(|value| !value.is_empty())
            .ok_or_else(|| "Entries must include a category.".to_string())?;
        require_existing_record(connection, "categories", &category_id, "Category")?;
        (Some(category_id), None)
    };

    let timestamp = now();
    let transaction = connection
        .transaction()
        .map_err(|error| format!("failed to start entry transaction: {error}"))?;

    transaction
        .execute(
            "
            INSERT INTO entries (id, type, amount_cents, category_id, debt_id, note, entry_date, created_at, updated_at, source, is_estimated)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
            ON CONFLICT(id) DO UPDATE SET
              type = excluded.type,
              amount_cents = excluded.amount_cents,
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
                entry_type,
                amount_cents,
                category_id,
                debt_id,
                note,
                input.entry_date,
                timestamp,
                timestamp,
                source,
                if input.is_estimated { 1 } else { 0 }
            ],
        )
        .map_err(|error| format!("failed to save entry: {error}"))?;

    let entry = transaction
        .query_row(
            "SELECT id, type, amount_cents, category_id, debt_id, note, entry_date, created_at, updated_at, source, is_estimated FROM entries WHERE id = ?1",
            params![entry_id],
            entry_row,
        )
        .map_err(|error| format!("failed to read saved entry: {error}"))?;

    transaction
        .commit()
        .map_err(|error| format!("failed to commit entry transaction: {error}"))?;

    Ok(entry)
}

fn delete_entry_for_connection(connection: &mut Connection, entry_id: String) -> Result<(), String> {
    require_existing_record(connection, "entries", &entry_id, "Entry")?;

    let transaction = connection
        .transaction()
        .map_err(|error| format!("failed to start delete transaction: {error}"))?;

    let deleted = transaction
        .execute("DELETE FROM entries WHERE id = ?1", params![entry_id])
        .map_err(|error| format!("failed to delete entry: {error}"))?;

    if deleted != 1 {
        return Err("Entry delete failed.".to_string());
    }

    transaction
        .commit()
        .map_err(|error| format!("failed to commit entry deletion: {error}"))?;

    Ok(())
}

fn save_debt_for_connection(connection: &mut Connection, input: DebtInput) -> Result<DebtRecord, String> {
    let name = input.name.trim();
    if name.is_empty() {
        return Err("Debt name is required.".to_string());
    }

    let balance_current_cents = amount_to_cents(input.balance_current, "Current balance", true)?;
    let minimum_payment_cents = optional_amount_to_cents(input.minimum_payment, "Minimum payment")?;
    let interest_rate_bps = rate_to_bps(input.interest_rate)?;
    if let Some(due_day) = input.due_day {
        if !(1..=31).contains(&due_day) {
            return Err("Due day must be between 1 and 31.".to_string());
        }
    }

    let is_update = input.id.is_some();
    let debt_id = input.id.unwrap_or_else(|| Uuid::new_v4().to_string());
    if is_update {
        require_existing_record(connection, "debts", &debt_id, "Debt")?;
    }

    let total_paid_cents = sum_debt_payments_cents(connection, &debt_id)?;
    let starting_balance_cents = balance_current_cents
        .checked_add(total_paid_cents)
        .ok_or_else(|| "Debt balance is too large.".to_string())?;
    let timestamp = now();

    connection
        .execute(
            "
            INSERT INTO debts (id, name, lender, starting_balance_cents, interest_rate_bps, minimum_payment_cents, due_day, created_at, updated_at, is_active)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
            ON CONFLICT(id) DO UPDATE SET
              name = excluded.name,
              lender = excluded.lender,
              starting_balance_cents = excluded.starting_balance_cents,
              interest_rate_bps = excluded.interest_rate_bps,
              minimum_payment_cents = excluded.minimum_payment_cents,
              due_day = excluded.due_day,
              updated_at = excluded.updated_at,
              is_active = excluded.is_active
            ",
            params![
                debt_id,
                name,
                trim_optional(input.lender),
                starting_balance_cents,
                interest_rate_bps,
                minimum_payment_cents,
                input.due_day,
                timestamp,
                timestamp,
                if input.is_active { 1 } else { 0 }
            ],
        )
        .map_err(|error| format!("failed to save debt: {error}"))?;

    list_debts(connection)?
        .into_iter()
        .find(|debt| debt.id == debt_id)
        .ok_or_else(|| "failed to read saved debt".to_string())
}

fn mark_check_in_for_connection(connection: &mut Connection, input: CheckInInput) -> Result<CheckInRecord, String> {
    require_iso_date(&input.date, "check-in date")?;
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
                trim_optional(input.note)
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
    })
}

pub fn save_entry(app: &AppHandle, input: EntryInput) -> Result<EntryRecord, String> {
    let (mut connection, _) = open_connection(app)?;
    save_entry_for_connection(&mut connection, input)
}

pub fn delete_entry(app: &AppHandle, entry_id: String) -> Result<(), String> {
    let (mut connection, _) = open_connection(app)?;
    delete_entry_for_connection(&mut connection, entry_id)
}

pub fn save_debt(app: &AppHandle, input: DebtInput) -> Result<DebtRecord, String> {
    let (mut connection, _) = open_connection(app)?;
    save_debt_for_connection(&mut connection, input)
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
    let (mut connection, _) = open_connection(app)?;
    mark_check_in_for_connection(&mut connection, input)
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

#[cfg(test)]
mod tests {
    use super::*;

    fn setup_connection() -> Connection {
        let connection = Connection::open_in_memory().expect("in-memory database");
        run_migrations(&connection).expect("migration success");
        connection
    }

    fn debt_input(balance_current: f64) -> DebtInput {
        DebtInput {
            id: None,
            name: "Visa".to_string(),
            lender: Some("Bank".to_string()),
            balance_current,
            interest_rate: Some(21.5),
            minimum_payment: Some(55.0),
            due_day: Some(12),
            is_active: true,
        }
    }

    fn expense_entry_input() -> EntryInput {
        EntryInput {
            id: None,
            entry_type: "expense".to_string(),
            amount: 24.50,
            category_id: Some("cat-groceries".to_string()),
            debt_id: None,
            note: Some("groceries".to_string()),
            entry_date: "2026-03-27".to_string(),
            source: "manual".to_string(),
            is_estimated: false,
        }
    }

    fn debt_payment_entry_input(debt_id: &str, amount: f64) -> EntryInput {
        EntryInput {
            id: None,
            entry_type: "debt_payment".to_string(),
            amount,
            category_id: Some("cat-debt-payment".to_string()),
            debt_id: Some(debt_id.to_string()),
            note: Some("payment".to_string()),
            entry_date: "2026-03-27".to_string(),
            source: "manual".to_string(),
            is_estimated: false,
        }
    }

    #[test]
    fn run_migrations_creates_tables() {
        let connection = setup_connection();

        let table_count: i64 = connection
            .query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name IN ('schema_migrations', 'categories', 'entries', 'debts', 'check_ins')",
                [],
                |row| row.get(0),
            )
            .expect("table count");

        assert_eq!(table_count, 5);
    }

    #[test]
    fn save_entry_rejects_invalid_date_and_illegal_debt_links() {
        let mut connection = setup_connection();
        let debt = save_debt_for_connection(&mut connection, debt_input(1000.0)).expect("debt saved");

        let invalid_date_error = save_entry_for_connection(
            &mut connection,
            EntryInput {
                entry_date: "03/27/2026".to_string(),
                ..expense_entry_input()
            },
        )
        .expect_err("invalid date should fail");
        assert!(invalid_date_error.contains("entry date"));

        let invalid_link_error = save_entry_for_connection(
            &mut connection,
            EntryInput {
                debt_id: Some(debt.id),
                ..expense_entry_input()
            },
        )
        .expect_err("expense entries should not allow debt links");
        assert!(invalid_link_error.contains("Non-debt payment entries"));
    }

    #[test]
    fn debt_balance_is_computed_from_payments_on_create_edit_and_delete() {
        let mut connection = setup_connection();
        let debt = save_debt_for_connection(&mut connection, debt_input(1000.0)).expect("debt saved");

        let payment = save_entry_for_connection(&mut connection, debt_payment_entry_input(&debt.id, 125.0)).expect("payment saved");
        let after_create = list_debts(&connection).expect("debts after create");
        assert_eq!(after_create[0].balance_current, 875.0);

        save_entry_for_connection(
            &mut connection,
            EntryInput {
                id: Some(payment.id.clone()),
                amount: 150.0,
                ..debt_payment_entry_input(&debt.id, 125.0)
            },
        )
        .expect("payment edit saved");
        let after_edit = list_debts(&connection).expect("debts after edit");
        assert_eq!(after_edit[0].balance_current, 850.0);

        delete_entry_for_connection(&mut connection, payment.id).expect("payment deleted");
        let after_delete = list_debts(&connection).expect("debts after delete");
        assert_eq!(after_delete[0].balance_current, 1000.0);
    }

    #[test]
    fn updating_debt_current_balance_rebases_starting_balance_without_drift() {
        let mut connection = setup_connection();
        let debt = save_debt_for_connection(&mut connection, debt_input(1000.0)).expect("debt saved");

        save_entry_for_connection(&mut connection, debt_payment_entry_input(&debt.id, 200.0)).expect("payment saved");
        let rebased = save_debt_for_connection(
            &mut connection,
            DebtInput {
                id: Some(debt.id),
                balance_current: 900.0,
                ..debt_input(1000.0)
            },
        )
        .expect("debt rebased");

        assert_eq!(rebased.balance_current, 900.0);
        let listed = list_debts(&connection).expect("debts listed");
        assert_eq!(listed[0].balance_current, 900.0);
    }

    #[test]
    fn schema_rejects_invalid_raw_rows() {
        let connection = setup_connection();

        let bad_type_error = connection
            .execute(
                "INSERT INTO entries (id, type, amount_cents, category_id, debt_id, note, entry_date, created_at, updated_at, source, is_estimated)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
                params![
                    "entry-1",
                    "weird",
                    1200_i64,
                    "cat-groceries",
                    Option::<String>::None,
                    Option::<String>::None,
                    "2026-03-27",
                    now(),
                    now(),
                    "manual",
                    0_i64
                ],
            )
            .expect_err("invalid type should fail");
        assert!(bad_type_error.to_string().contains("CHECK"));

        let negative_money_error = connection
            .execute(
                "INSERT INTO debts (id, name, lender, starting_balance_cents, interest_rate_bps, minimum_payment_cents, due_day, created_at, updated_at, is_active)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
                params![
                    "debt-1",
                    "Visa",
                    Option::<String>::None,
                    -500_i64,
                    Option::<i64>::None,
                    Option::<i64>::None,
                    Option::<i64>::None,
                    now(),
                    now(),
                    1_i64
                ],
            )
            .expect_err("negative balance should fail");
        assert!(negative_money_error.to_string().contains("CHECK"));
    }
}
