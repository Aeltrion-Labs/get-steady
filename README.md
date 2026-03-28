# Get Steady

Get Steady is a local-first desktop app for building a daily money habit through manual tracking, debt balance visibility, and simple daily check-ins.

## Stack

- Tauri 2
- React 19
- TypeScript
- Vite
- Tailwind CSS
- SQLite via Rust + `rusqlite`
- Zod
- TanStack Query
- Vitest

## Workspace Layout

- `apps/desktop`: Tauri desktop app, React UI, native SQLite command layer
- `packages/core`: shared schemas, summary math, catch-up logic, CSV shaping helpers
- `packages/ui`: placeholder for reusable UI primitives
- `docs/plans`: approved design and implementation notes for this MVP pass

## What Is Implemented

- runnable Tauri desktop shell
- React + TypeScript UI with a calm single-window layout
- local SQLite database stored in the app data directory
- schema migration bootstrap and default category seeding
- categories, entries, debts, and check-ins data model
- Today screen with quick add, daily/monthly summaries, debt outstanding, and catch-up prompt
- Ledger screen with add/edit/delete and basic filters
- Debts screen with create/edit/delete and payment recording
- Settings screen with data path visibility, CSV export, and database backup
- CSV export for entries and debts
- SQLite backup to a user-chosen file path

## Intentionally Deferred

- XLSX export
- restore/import UI
- reminder notifications
- recurring templates
- trends/analytics screen
- CLI, local API, and MCP runtime
- payoff simulations beyond current balance + recorded payments

## How To Run

1. Install dependencies:

```bash
pnpm install
```

2. Start the desktop app in development:

```bash
pnpm --filter @get-steady/desktop tauri dev
```

3. Run tests:

```bash
pnpm test
cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml
```

4. Build the frontend bundle:

```bash
pnpm --filter @get-steady/desktop build
```

## Local Data Storage

The SQLite database is created automatically in the Tauri app data directory under:

```text
<app-data>/data/steady.sqlite
```

Backups default to:

```text
<app-data>/backups/
```

Exports default to:

```text
<app-data>/exports/
```

The exact database path is shown in the Settings screen at runtime.

Typical platform-specific app data roots:

- Windows: `%APPDATA%` or `%LOCALAPPDATA%` under the Tauri app identifier path
- macOS: `~/Library/Application Support/`
- Linux: `~/.local/share/`

## Notes

- Debt payments are stored as normal entries linked to a debt and update the debt balance transactionally.
- The UI computes daily/monthly summaries and catch-up state from the shared `@get-steady/core` package.
- Export uses friendly CSV headers. XLSX is not included in this pass.
