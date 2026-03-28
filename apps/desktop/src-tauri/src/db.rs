use crate::models::{
    BootstrapPayload, CategoryRecord, CheckInInput, CheckInRecord, DebtInput, DebtPaymentInput, DebtRecord,
    EntryFilters, EntryInput, EntryRecord,
};
use rusqlite::{params, params_from_iter, Connection, OptionalExtension, ToSql};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};
use time::OffsetDateTime;
use uuid::Uuid;

const SCHEMA_VERSION: i64 = 1;

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

    #[test]
    fn run_migrations_creates_tables() {
        let connection = Connection::open_in_memory().expect("in-memory database");
        run_migrations(&connection).expect("migration success");

        let table_count: i64 = connection
            .query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name IN ('schema_migrations', 'categories', 'entries', 'debts', 'check_ins')",
                [],
                |row| row.get(0),
            )
            .expect("table count");

        assert_eq!(table_count, 5);
    }
}
