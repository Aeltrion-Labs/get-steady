## Technology and Architectural Plan

### 1. Recommended stack

**Desktop shell:** Tauri 2
**Frontend:** React + TypeScript + Vite
**State/query layer:** TanStack Query for async boundaries, Zustand for UI state
**Styling:** Tailwind CSS + shadcn/ui
**Charts:** Recharts
**Persistence:** SQLite
**Validation:** Zod
**Local API / shared domain contract:** TypeScript-first service layer with Rust command boundaries only where native access is needed
**Exports:** CSV + XLSX generation in app
**Testing:** Vitest, Playwright, and domain-level integration tests against SQLite
**Packaging/distribution:** GitHub Actions + Tauri bundling/signing pipeline

Tauri is a strong fit here because it is designed for cross-platform desktop apps, works with any frontend framework that compiles to HTML/CSS/JS, and supports native integrations such as tray icons, configuration, notifications, and a broad plugin ecosystem. Its v2 security model also gives you fine-grained permissions and capabilities per window/webview, which is useful for a local-first finance app where the default posture should be locked down. ([Tauri][1])

SQLite is the right default store because it is commonly used as an application file format for desktop software, including financial analysis tools, is a single compact cross-platform file, and supports live backups through the backup API or `VACUUM INTO`. ([SQLite][2])

For agent access, MCP fits your “AI-native but local” goal. MCP is an open standard for connecting AI apps to tools and data, and the current spec defines `stdio` and Streamable HTTP transports, with clients encouraged to support `stdio` whenever possible. That makes `stdio` the clean first transport for local desktop usage. ([Model Context Protocol][3])

---

### 2. Core architecture principles

1. **Local-first, offline-first**

   * The app must work fully offline.
   * Local SQLite file is the source of truth.
   * No cloud account, no forced sync, no server dependency.

2. **Habit-first**

   * Architecture should optimize for fast daily check-ins, catch-up flows, and low-friction editing.
   * The product is not a giant finance suite.

3. **One domain, many surfaces**

   * GUI, CLI, local API, and MCP should all use the same domain services.
   * No duplicate business logic hiding in different entry points.

4. **Portable by design**

   * User data lives in a clearly visible app-data folder.
   * Backup, restore, export, and migration are product features, not afterthoughts.

5. **Security by default**

   * Minimal permissions.
   * No shell access unless explicitly needed.
   * Local API off by default.
   * MCP server opt-in.

---

### 3. Architectural shape

Use a **modular desktop monolith**.

That means one app, one local database, one codebase, but with clean internal module boundaries. For a weekend project that may grow into an open-source tool, this is the sweet spot. It avoids service sprawl while still giving you clean seams for expansion.

#### High-level layers

```text
┌────────────────────────────────────────────┐
│ Desktop UI (React / TypeScript)           │
│ Today • Ledger • Debts • Trends • Settings│
└────────────────────────────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────────┐
│ Application Services / Domain Layer        │
│ Check-in • Entries • Debts • Trends        │
│ Catch-up • Export • Notifications          │
└────────────────────────────────────────────┘
            │                │
            │                ├──────────────┐
            ▼                               ▼
┌───────────────────────┐        ┌───────────────────────┐
│ Persistence Layer     │        │ Integration Surfaces  │
│ SQLite repositories   │        │ CLI • Local API • MCP │
│ Migrations • Backups  │        │                       │
└───────────────────────┘        └───────────────────────┘
            │
            ▼
┌────────────────────────────────────────────┐
│ OS / Native Integrations (Tauri plugins)   │
│ Notifications • Tray • FS • Autostart      │
└────────────────────────────────────────────┘
```

---

### 4. Module plan

#### A. `core/domain`

Pure business rules. No Tauri, no React, no storage details.

Owns:

* entry rules
* category rules
* debt calculations
* consistency tracking
* catch-up flow logic
* summary/trend calculations
* payoff simulation logic

This layer should be test-heavy and boring in the best way. The money brain lives here.

#### B. `core/application`

Use-case orchestrators.

Examples:

* `logExpense`
* `logIncome`
* `completeCheckIn`
* `runCatchUp`
* `recordDebtPayment`
* `generateMonthlySummary`
* `exportWorkbook`
* `simulateExtraPayment`

These call repositories and domain rules.

#### C. `infra/sqlite`

Implements repositories, migrations, backup, restore, and transaction boundaries.

#### D. `infra/desktop`

Tauri-facing code:

* notifications
* tray actions
* file system access
* startup behavior
* native dialogs

#### E. `interfaces/gui`

React application.

#### F. `interfaces/cli`

Commands like:

* `money add expense`
* `money add income`
* `money summary month`
* `money debt list`
* `money export xlsx`

Tauri has an official CLI plugin for app-level command parsing, but I would treat the CLI as a secondary interface, not the primary runtime spine. ([Tauri][4])

#### G. `interfaces/api`

Optional loopback-only local API for automation and extensions.

* Bind to `127.0.0.1` only
* Disabled by default
* Token-based local auth

#### H. `interfaces/mcp`

Local MCP server exposing approved tools and resources.

---

### 5. Recommended runtime model

#### Desktop app

Primary runtime, always present.

#### Local MCP server

Secondary runtime, started only when enabled.

**Phase 1:** `stdio` transport only

* Best for local agent tooling
* Simpler and safer
* No exposed port required

**Phase 2:** optional Streamable HTTP on localhost

* Useful for richer local toolchains or multiple local clients
* Still off by default

That matches the MCP spec’s defined transports and the recommendation that clients support `stdio` whenever possible. ([Model Context Protocol][5])

---

### 6. Data architecture

#### Primary storage

SQLite database file, for example:

```text
<AppData>/YourApp/data/app.db
```

SQLite is well suited to this because it is commonly used as the on-disk format for desktop apps and financial-analysis-style tools, and the file itself is portable across systems. ([SQLite][2])

#### Suggested SQLite settings

* `journal_mode = WAL` for better read/write concurrency during normal app use
* `foreign_keys = ON`
* `busy_timeout` configured
* migrations version table
* `application_id` and `user_version` set

SQLite documents that WAL mode writes changes to a separate write-ahead log and later checkpoints them back into the database; it is commonly used to improve concurrent access patterns. ([SQLite][6])

#### Backup strategy

Support both:

* **Quick backup:** SQLite backup API
* **Clean compact export backup:** `VACUUM INTO`

SQLite’s backup API is intended for copying a live database, while `VACUUM INTO` creates a compact copy and purges deleted content from the backup. ([SQLite][7])

#### Friendly export strategy

Export from domain views, not raw tables:

* `transactions.csv`
* `debts.csv`
* `monthly_summary.csv`
* `yearly_summary.xlsx`
* optional `journal.csv` for check-in history

That keeps your schema flexible while preserving stable exports.

---

### 7. Suggested schema areas

You already have the PRD model. I’d formalize it into these table groups:

#### Core tables

* `entries`
* `categories`
* `debts`
* `debt_payments`
* `check_ins`
* `recurring_templates`

#### Derived/config tables

* `user_preferences`
* `notification_settings`
* `export_profiles`
* `app_metadata`
* `backup_records`

#### Optional future tables

* `goals`
* `milestones`
* `streak_events`
* `audit_log`
* `api_tokens`
* `mcp_permissions`

#### Important design choice

Use an **append-friendly financial model**:

* entries are facts
* summaries are computed
* avoid storing too many mutable aggregates

That will make exports, debugging, and recovery much saner.

---

### 8. UI architecture

Use a **single-window app** first, with modal overlays and tray quick-add.

#### Primary screens

* Today
* Ledger
* Debts
* Trends
* Catch-up
* Settings

#### UI state rules

* Server state from TanStack Query
* Ephemeral UI state in Zustand
* Forms with React Hook Form + Zod
* Charts and summaries fed from read models, not raw query stitching in components

#### Key UX feature

Build a **Quick Add overlay** that can be opened from:

* main UI button
* tray action
* keyboard shortcut

That feature will carry a lot of the daily habit weight.

---

### 9. Tauri integration plan

Use Tauri plugins sparingly and intentionally.

#### Likely plugins

* SQL / SQLite
* Notification
* File system
* Store for tiny app config if needed
* Autostart later
* Tray / menu
* Updater later

Tauri’s docs provide official support for SQL, notifications, file-system access, tray behavior, updater flows, and a plugin/capability system for controlling exposure to the frontend. ([Tauri][8])

#### Security posture

* Use capabilities per window
* Keep dangerous commands blocked unless explicitly granted
* Restrict file access to app data, export folder, and user-chosen paths
* Avoid broad shell permissions

Tauri v2’s permissions and capabilities system is specifically built to grant or deny command exposure to windows/webviews, and filesystem access is blocked by default until allowed through capabilities. Shell access also has scoped restrictions. ([Tauri][9])

---

### 10. CLI, API, and MCP plan

This is where your idea gets its extra sauce.

#### CLI

Purpose:

* power-user entry
* scripting
* cron-style exports
* testability

Examples:

```bash
app add expense --amount 18.42 --category food --note "lunch"
app summary month
app debt pay --debt "Visa" --amount 250
app export xlsx --range this-month
```

#### Local API

Purpose:

* desktop widgets
* automation
* optional local dashboards
* future plugin ecosystem

Rules:

* localhost only
* disabled by default
* token required
* rate limited
* read-only mode option

#### MCP

Purpose:

* let coding agents and assistants query plans, trends, categories, debts, and simulations
* let agents help the user reason over their money habit without owning the data

**Tool examples**

* `entries.add`
* `entries.list`
* `debts.list`
* `debts.simulate_payment`
* `checkins.status`
* `summaries.monthly`
* `exports.generate`

**Resource examples**

* current month summary
* debt accounts snapshot
* spending by category
* check-in history

**Guardrails**

* writes require explicit enablement
* default MCP mode is read-only
* user can revoke tool categories individually

---

### 11. Notifications and gamification architecture

Keep both as optional modules, not deep hard-coded assumptions.

#### Notification engine

* local scheduler
* morning or evening reminder
* “you missed yesterday” reminder
* weekly review reminder

Tauri’s notification plugin supports notifications from both JavaScript and Rust. ([Tauri][10])

#### Gamification engine

Model as rules + events:

* streak started
* streak maintained
* grace day used
* catch-up recovery completed
* debt milestone reached

Then the UI decides how to render it:

* badge
* subtle animation
* summary card

This keeps gamification lightweight and removable instead of turning into glitter glue on the domain model.

---

### 12. Portability and backup plan

This part is part of the product, not just ops.

#### App data layout

```text
<AppData>/YourApp/
  data/app.db
  backups/
  exports/
  logs/
  config/
```

#### User-facing actions

* reveal data folder
* create backup
* restore backup
* export CSV/XLSX
* import prior export
* move data file

#### Migration path

A user should be able to move to a new machine by copying:

* `app.db`
* or a backup bundle

Because SQLite is a compact single-file cross-platform format, this portability story is very natural. ([SQLite][11])

---

### 13. Build and release plan

#### Repo structure

```text
/apps/desktop
  /src
  /src-tauri
/packages/domain
/packages/application
/packages/ui
/packages/shared
/packages/mcp-server
/packages/cli
```

#### CI/CD

* GitHub Actions
* build matrix for Windows, macOS, Linux
* signed releases for Windows and macOS when ready
* attach installer artifacts to GitHub Releases

Tauri documents GitHub-based build and release flows and supports an updater that can work with either a dynamic server or a static JSON file. ([Tauri][12])

#### Update philosophy

For a local-first privacy-focused app:

* auto-update **off by default**
* manual check or opt-in updater
* release notes visible
* portable builds available too

---

### 14. Recommended implementation phases

#### Phase 0: foundation

* Tauri shell
* React app scaffold
* SQLite connection + migrations
* core domain package
* Today screen skeleton

#### Phase 1: weekend MVP

* manual entry CRUD
* categories
* debt CRUD
* debt payment logging
* daily check-in
* monthly summary
* CSV export
* local notifications

#### Phase 2: product polish

* catch-up mode
* recurring templates
* tray quick-add
* keyboard shortcut
* better summaries/charts
* backup/restore UI
* XLSX export

#### Phase 3: power-user layer

* CLI
* read-only local API
* import/export profiles
* richer filtering/search

#### Phase 4: agent layer

* MCP server over stdio
* read-only tools/resources
* simulations
* optional write-enabled tools behind permission gates

#### Phase 5: ecosystem

* plugin hooks
* theme customization
* optional household mode
* importers from other apps’ CSVs

---

### 15. Opinionated recommendations

Here’s my straight-shot recommendation:

**Use Tauri + React + TypeScript + SQLite.**
Keep **Rust thin** at first. Put most product logic in TypeScript domain/application packages so you can move faster this weekend. Use Tauri for native shell, permissions, notifications, tray, and filesystem. Layer in MCP only after the core app loop feels great.

That keeps the project:

* fast to build
* native enough to feel sharp
* local enough to honor the mission
* open enough for agents and power users
* small enough to actually ship

### 16. Final architecture decision

If I were locking the blueprint today, I’d choose:

* **Tauri 2**
* **React + TypeScript + Vite**
* **SQLite**
* **Domain-driven modular monolith**
* **Single-window desktop app**
* **Tray quick-add**
* **CLI in Phase 3**
* **MCP over stdio in Phase 4**
* **No local HTTP API until there is a real need**

That is the boss move here. Clean. Portable. Shippable. No cloud tax. No feature bloat parade.


[1]: https://v2.tauri.app/?utm_source=chatgpt.com "Tauri 2.0 | Tauri"
[2]: https://sqlite.org/whentouse.html?utm_source=chatgpt.com "Appropriate Uses For SQLite"
[3]: https://modelcontextprotocol.io/docs/getting-started/intro?utm_source=chatgpt.com "Model Context Protocol"
[4]: https://v2.tauri.app/plugin/cli/?utm_source=chatgpt.com "Command Line Interface (CLI)"
[5]: https://modelcontextprotocol.io/specification/2025-03-26/basic/transports?utm_source=chatgpt.com "Transports"
[6]: https://sqlite.org/isolation.html?utm_source=chatgpt.com "Isolation In SQLite"
[7]: https://sqlite.org/backup.html?utm_source=chatgpt.com "SQLite Backup API"
[8]: https://v2.tauri.app/plugin/sql/?utm_source=chatgpt.com "SQL"
[9]: https://v2.tauri.app/security/permissions/?utm_source=chatgpt.com "Permissions"
[10]: https://v2.tauri.app/plugin/notification/?utm_source=chatgpt.com "Notifications"
[11]: https://sqlite.org/appfileformat.html?utm_source=chatgpt.com "SQLite As An Application File Format"
[12]: https://v2.tauri.app/distribute/pipelines/github/?utm_source=chatgpt.com "GitHub"
