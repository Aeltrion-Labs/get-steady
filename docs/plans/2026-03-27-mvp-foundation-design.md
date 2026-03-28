# Get Steady MVP Foundation Design

## Scope

This initial slice builds a runnable local-first desktop app with a real SQLite-backed data model, usable UI, CSV export, and database backup. The target is a calm daily workflow centered on quick manual entry, debt balance tracking, check-ins, and catch-up for missed days.

The first version intentionally excludes bank sync, cloud features, payoff projections, restore/import UI, notifications, local API, CLI, and MCP runtime support. The architecture leaves room for those later without delaying the MVP.

## Architecture

The repository will use a small shared-package layout:

- `apps/desktop`: Tauri 2 desktop shell, React UI, Tailwind styling, Tauri command boundary, SQLite integration, export and backup wiring.
- `packages/core`: shared Zod schemas, domain utilities, summary math, catch-up logic, and application services.
- `packages/ui`: lightweight reusable UI helpers/components only where reuse is immediate.

This is a modular desktop monolith. The UI stays thin over service functions, and persistence is hidden behind repositories so future CLI/API/MCP entry points can reuse the same core logic.

## Persistence Model

SQLite is the source of truth and lives in the Tauri app data directory. On bootstrap the app will:

- resolve the app data path
- create the data directory
- open the SQLite database
- enable foreign keys and WAL mode
- create a schema migration table
- run versioned migrations
- seed default categories if no categories exist

Tables for the initial slice:

- `categories`
- `entries`
- `debts`
- `check_ins`
- `schema_migrations`

Debt payments are represented as normal entries with `type = debt_payment` and a linked `debt_id`. When a debt payment is recorded, the service layer will update the linked debt balance in the same transaction.

## Product Flows

### Today

- shows current date
- shows check-in completion state
- supports quick-add for expense and income
- shows today totals and current month totals
- shows debt outstanding summary
- allows marking today complete
- shows missed check-in count and a catch-up list if needed

### Ledger

- lists entries
- filters by type, category, and simple date range
- supports add, edit, and delete
- supports backdated entries

### Debts

- create, edit, delete debt accounts
- show active debt balances
- record debt payments
- keep debt balance current and visible

### Settings

- show local data path
- export entries CSV
- export debts CSV
- create a timestamped backup copy of the database

## Service Layer

Shared services in `packages/core` will own:

- entry validation and normalization
- debt payment rules
- daily/monthly summary calculation
- missed-day detection and check-in status
- catch-up date generation
- export row shaping

The desktop app will provide repository implementations and Tauri commands for the frontend to call.

## Error Handling

- forms use Zod validation
- repository/service failures return typed app errors
- destructive actions require confirmation
- export and backup failures surface user-readable messages
- debt deletion is blocked if linked entries exist unless future work introduces reassignment

## Testing Strategy

Test-first development will focus on `packages/core` behavior and critical persistence/service boundaries. The first pass will cover:

- summary math
- missed-day calculation
- check-in status transitions
- debt payment balance updates
- CSV row formatting for exports

UI verification will rely on build/test passes and a working Tauri app shell for this initial implementation.

## Deferred Work

- XLSX export
- restore/import UI
- notifications/reminders
- recurring templates
- charts and trends screen
- payoff simulation
- local API, CLI, MCP server
