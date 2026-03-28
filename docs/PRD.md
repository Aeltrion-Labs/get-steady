# PRD: Local-First Daily Money Habit Tracker
**Status:** Draft  
**Type:** Product Requirements Document  
**Platform:** Cross-platform desktop app  
**License Goal:** Free and open source  
**Primary Users:** Individuals who want to manually track spending, reduce debt, improve daily money awareness, and retain full control of their data

---

## 1. Product Summary

This product is a local-first desktop app designed to help people build a daily money habit through intentional manual entry, simple trend visibility, and lightweight motivation.

It is not a traditional budgeting app and does not aim to automate finances through bank connections. Instead, it emphasizes daily awareness, personal accountability, and progress through consistent check-ins. Users manually log money in and money out, review how they are tracking, and stay engaged without subscriptions, cloud dependency, or vendor lock-in.

This product is intended as an alternative for people who:
- want a free option
- prefer full ownership of their data
- believe manual entry creates stronger financial awareness
- want a calm, focused experience rather than an overbuilt finance platform

---

## 2. Problem Statement

Many finance apps optimize for automation, aggregation, and passive reporting. While convenient, this often causes users to disengage from the actual habit of paying attention to their spending. When awareness drops, behavior often follows.

Other apps that emphasize manual tracking and debt progress provide real value, but some users still face barriers such as:
- recurring subscription cost
- dependence on cloud sync or accounts
- limited data portability
- lack of extensibility for local workflows, power users, and AI tools

There is room for a local-first alternative that focuses on:
- daily financial awareness
- low-friction manual entry
- debt and cashflow visibility
- zero subscription cost
- full data ownership
- open APIs, CLI, and MCP support for advanced workflows

---

## 3. Product Vision

Build a thoughtful, habit-forming desktop app that helps users improve their financial awareness one daily check-in at a time, while keeping all data local, portable, and fully under user control.

---

## 4. Positioning

### Core Positioning
A free, local-first desktop app for building a daily money habit through manual entry, debt tracking, and cashflow awareness.

### Key Differentiators
- **Local-first by default**  
  No required account, no cloud dependency, no vendor lock-in.

- **Manual entry as a feature, not a limitation**  
  The app is designed to reinforce awareness and habit formation.

- **Open and extensible**  
  SQLite-based, export-friendly, and exposed through CLI, API, and MCP.

- **Desktop-native experience**  
  Notifications, tray quick-add, keyboard shortcuts, and offline reliability.

- **Calm gamification**  
  Encourages consistency and recovery without turning personal finance into a gimmick.

### Positioning Guardrails
- Do not frame the product as a clone of existing manual finance apps.
- Do not use "freedom" terminology in product language.
- Do not attack paid alternatives. Position this as a complementary option for users with different needs and priorities.

---

## 5. Goals

### Primary Goals
1. Help users build a daily check-in habit around spending and cashflow.
2. Make manual entry fast enough to sustain over time.
3. Provide clear visibility into money in, money out, and debt progress.
4. Ensure the user fully owns and controls their data.
5. Make the product free and open source.
6. Provide clean extensibility through CLI, API, and MCP.

### Secondary Goals
1. Create a polished, motivating desktop experience.
2. Support easy export to common formats such as CSV and XLSX.
3. Allow users to recover easily after missing several days.
4. Establish a solid local-first architecture that is easy to port across machines.

---

## 6. Non-Goals

The following are explicitly out of scope for the initial product vision:
- automatic bank aggregation
- credit score monitoring
- investment portfolio management
- tax filing workflows
- advanced household accounting
- ads, upsells, or subscription monetization
- cloud-first collaboration
- gamification that feels childish, loud, or manipulative

---

## 7. Target Users

### Primary User
An individual who wants to improve their financial behavior through consistent awareness and manual tracking, especially around debt payoff and spending control.

### Example User Traits
- overwhelmed by traditional budgeting apps
- distrustful of bank-linked finance tools
- price-sensitive
- motivated by visible progress
- wants a routine, not just reports
- values data ownership and exportability
- may be technical or privacy-conscious, but product should also work for non-technical users

### Secondary User
A power user who wants:
- CLI access
- scripting
- local API integration
- AI assistant workflows via MCP
- clean exports into spreadsheets or personal analytics systems

---

## 8. Product Principles

1. **Habit over automation**  
   The product should reinforce daily awareness, not replace it.

2. **Recovery over perfection**  
   Missing a few days should not feel like failure. Catching up should be simple.

3. **Data belongs to the user**  
   The source of truth lives locally in a portable, well-structured format.

4. **Simple beats clever**  
   The experience should be calm, direct, and easy to trust.

5. **Manual does not mean tedious**  
   The UI should make intentional entry fast and satisfying.

6. **Open by design**  
   Core functionality should be accessible via GUI, CLI, and machine-readable interfaces.

---

## 9. Core Use Cases

### Daily Use Cases
- Log today's expenses and income
- Review today's total money out
- Review monthly trend
- Check how debt balances are progressing
- See whether spending is above or below recent norms
- Get a gentle reminder to check in

### Weekly / Monthly Use Cases
- Catch up after missing a few days
- Review where money went this week
- Review debt reduction progress
- Export current data to CSV/XLSX
- Review recurring bills and upcoming obligations

### Power User Use Cases
- Add entries via CLI
- Query current balances from a local API
- Use AI tools to summarize patterns
- Simulate payoff scenarios via MCP or CLI
- Integrate data into spreadsheet or personal dashboard workflows

---

## 10. Feature Set

## 10.1 MVP Features

### A. Daily Check-In
The main home experience should revolve around a daily check-in flow.

**Requirements:**
- Show current date and check-in status
- Allow quick entry of expenses and income
- Allow amount, category, optional note, date, and account/debt target selection
- Support keyboard-first flow
- Provide a clear "done for today" state
- Show simple daily totals

### B. Transaction Logging
Users can manually create and edit financial entries.

**Requirements:**
- expense and income entry types
- categories
- optional tags
- notes/memo
- backdated entries
- editable history
- delete with confirmation
- recurring entry templates

### C. Debt Tracking
Users can define debts and log payments against them.

**Requirements:**
- create debt accounts
- store current balance, interest rate, minimum payment, optional due date
- log debt payments
- show debt balance trend over time
- estimate payoff progress based on user-entered data

### D. Cashflow Visibility
Users should see practical summaries, not complicated budget systems.

**Requirements:**
- monthly money in
- monthly money out
- net margin
- category breakdown
- debt payment totals
- streak / consistency summary

### E. Catch-Up Mode
Users must be able to recover from gaps without friction or shame.

**Requirements:**
- detect missed check-in days
- offer catch-up workflow for missing dates
- allow quick-copy of recurring items
- allow incomplete days to be marked as estimated or partial
- let users skip and come back later

### F. Local Data Ownership
All product data should live locally.

**Requirements:**
- SQLite database as primary store
- local backups
- restore from backup
- user-readable export formats
- no account required

### G. Export
Users should be able to leave with clean data at any time.

**Requirements:**
- export transactions to CSV
- export debt/account summaries to CSV
- export workbook-style XLSX
- preserve friendly column names
- allow date range filtering for export

### H. Notifications
Support the habit through simple reminders.

**Requirements:**
- local desktop reminders
- configurable reminder time
- reminders can be disabled
- reminder copy should be gentle and practical

---

## 10.2 Post-MVP Features

### A. Lightweight Gamification
Designed to support consistency without becoming distracting.

**Candidate features:**
- streaks with grace days
- weekly completion badge
- comeback badge after missed days
- debt milestone markers
- monthly consistency summary
- "clean week" or "fully logged week" recognition

### B. Native Convenience
- tray icon quick add
- global shortcut to open entry modal
- small desktop widget or mini-summary mode
- launch at startup option

### C. AI-Native Capabilities
- natural language transaction entry
- weekly summary generation
- category pattern explanation
- scenario simulations
- plain-language questions over local data

### D. MCP / CLI / Local API
- full CRUD for entries, debts, categories
- reporting endpoints
- scenario runner
- import/export commands
- schema documentation for external tools

### E. Shared or Household Mode
Potential later feature for multiple profiles or households on one local install.

---

## 11. Experience Design

## 11.1 UX Goals
- Make daily use take less than two minutes
- Keep the home screen focused on today
- Reduce clutter and configuration fatigue
- Make backfilling painless
- Ensure the app feels trustworthy, calm, and fast

## 11.2 Proposed Core Screens

### 1. Home / Today
Purpose: anchor the daily habit

**Contents:**
- today's date
- check-in status
- quick add expense/income
- today's totals
- current month money in/out
- short trend card
- debt summary snapshot
- reminder of missed days if applicable

### 2. Activity / Ledger
Purpose: view, filter, edit, and search entries

**Contents:**
- list of entries
- filters by date/category/type
- edit/delete actions
- bulk export

### 3. Debts
Purpose: define and track obligations

**Contents:**
- debt account cards
- payment history
- progress trends
- scenario estimator

### 4. Trends
Purpose: understand where money is going

**Contents:**
- monthly net margin
- spending by category
- debt payment totals
- consistency chart
- rolling 7-day / 30-day views

### 5. Catch-Up Flow
Purpose: recover from missed days

**Contents:**
- missing dates list
- quick add for each day
- apply recurring items
- mark as partial / estimated
- continue later

### 6. Settings
Purpose: keep control local and transparent

**Contents:**
- reminders
- theme
- export
- backup / restore
- data path
- integrations
- CLI/API/MCP config

---

## 12. Functional Requirements

## 12.1 Data Entry
- User can create income or expense entries.
- User can assign category and optional notes.
- User can select entry date.
- User can edit and delete entries.
- User can create templates for repeated entries.

## 12.2 Debt Management
- User can create multiple debt records.
- User can store starting and current balances.
- User can log payments against a debt.
- User can see balance history and payoff estimates.

## 12.3 Daily Habit Support
- App can determine whether a day has been checked in.
- App can remind the user to check in.
- App can detect missing days and offer catch-up mode.

## 12.4 Reporting
- App can show daily, weekly, and monthly summaries.
- App can calculate net cashflow for date ranges.
- App can display spending by category.
- App can summarize debt payments and current balances.

## 12.5 Export and Portability
- App can export CSV and XLSX files.
- App can back up and restore the SQLite database.
- App should make data location visible to the user.
- App should support simple migration to another machine.

## 12.6 Extensibility
- App functionality should be exposed through:
  - GUI
  - CLI
  - local API
  - MCP server
- Interfaces should be documented and stable where possible.

---

## 13. Non-Functional Requirements

### Performance
- App launches quickly on consumer laptops
- Core actions should feel instant
- Database reads/writes should be efficient for single-user local usage

### Reliability
- Must work fully offline
- Data loss risk should be minimized with backup options
- Database corruption handling and recovery guidance should exist

### Portability
- Should run cross-platform on macOS, Windows, and Linux
- User data should be easy to move between machines

### Privacy
- No required telemetry
- No required account
- No cloud upload by default
- Any optional telemetry, if ever added, must be opt-in and transparent

### Accessibility
- Keyboard navigation supported
- Legible typography and contrast
- No critical interactions hidden behind hover-only affordances

---

## 14. Technical Direction

## 14.1 Platform
Cross-platform desktop app.

**Recommended stack direction:**
- **Tauri** for desktop shell
- **React + TypeScript** for UI
- **SQLite** for local storage
- optional Rust for native integrations where appropriate

## 14.2 Architecture Principles
- local-first
- offline-first
- modular services
- stable internal domain model
- thin UI over well-defined business logic
- consistent surface area between GUI, CLI, and API

## 14.3 Data Storage
Primary store: SQLite

**Why:**
- fast
- local
- portable
- well-supported
- easy to back up
- friendly for export and scripting

## 14.4 Interfaces
- Desktop GUI
- CLI for add/list/report/export
- local HTTP or IPC API
- MCP server exposing user-approved financial planning data and operations

---

## 15. Draft Data Model

## 15.1 Entities

### UserPreferences
- id
- currency
- locale
- reminder_time
- theme
- default_export_path
- streak_settings

### Entry
- id
- type (income | expense | debt_payment | transfer)
- amount
- category_id
- debt_id (nullable)
- note
- entry_date
- created_at
- updated_at
- source (manual | template | import | api | cli | mcp)
- is_estimated

### Category
- id
- name
- type (income | expense | both)
- color/icon metadata optional

### Debt
- id
- name
- lender
- balance_current
- interest_rate
- minimum_payment
- due_day
- created_at
- updated_at
- is_active

### DebtPayment
- id
- debt_id
- entry_id
- principal_amount
- interest_amount optional
- payment_date

### RecurringTemplate
- id
- name
- type
- amount
- category_id
- debt_id nullable
- cadence
- next_suggested_date
- enabled

### CheckInStatus
- date
- completed
- completed_at
- note optional
- mood/tag optional
- is_partial

### BackupRecord
- id
- created_at
- file_path
- type (manual | automatic)

---

## 16. Metrics of Success

As an open-source project, success should be measured more by habit usefulness and product quality than revenue.

### User Outcome Metrics
- daily check-in adherence rate
- percentage of users who return after missing multiple days
- average number of days logged per month
- reduction in untracked days over time
- number of debt accounts actively tracked

### Product Quality Metrics
- time to log a typical day
- export success rate
- app startup time
- crash-free local sessions
- catch-up completion rate

### Community / Open Source Metrics
- GitHub stars and contributors
- issues resolved
- plugin or integration ecosystem growth
- number of users leveraging CLI/API/MCP surfaces

---

## 17. Risks and Mitigations

### Risk: Manual entry fatigue
**Mitigation:**  
Fast entry flows, templates, tray quick add, keyboard shortcuts, catch-up mode.

### Risk: Users compare it to full budgeting apps and feel features are missing
**Mitigation:**  
Strong positioning and onboarding. Emphasize daily money habit and debt/cashflow awareness.

### Risk: Local-only setup feels intimidating to non-technical users
**Mitigation:**  
Installer-based onboarding, friendly defaults, visible backups, guided export/import.

### Risk: Open source project grows scope too fast
**Mitigation:**  
Strict MVP boundaries and modular architecture.

### Risk: Gamification feels gimmicky
**Mitigation:**  
Keep it subtle, optional, and focused on consistency/recovery rather than reward theater.

---

## 18. MVP Scope Recommendation

### Must Have
- desktop shell
- SQLite persistence
- daily check-in flow
- manual transaction entry
- categories
- debt accounts
- debt payments
- monthly money in/out summary
- catch-up mode
- CSV export
- local backup/restore
- reminder notifications

### Nice to Have
- XLSX export
- recurring templates
- streaks with grace days
- tray quick add
- CLI

### Later
- local API
- MCP server
- natural language entry
- scenario simulator
- widgets / mini mode
- household support

---

## 19. Roadmap Proposal

### Phase 1: Weekend Ship
- Tauri shell
- Today screen
- entry CRUD
- debt CRUD
- monthly summary
- SQLite storage
- CSV export

### Phase 2: Habit Polish
- reminders
- catch-up mode
- recurring templates
- streaks / grace days
- better charts and summaries

### Phase 3: Power User Layer
- CLI
- local API
- robust export formats
- schema docs

### Phase 4: AI-Native Layer
- MCP server
- natural language input
- queryable analytics
- scenario planner

---

## 20. Open Questions

1. Should the first version support only one profile per install?
2. Should debt planning focus on current balance tracking only, or also include richer payoff simulation in v1?
3. Should recurring entries auto-suggest only, or allow auto-insert with review?
4. Should check-ins include an optional qualitative reflection such as "planned" vs "impulsive"?
5. Should the local API be enabled by default or explicitly turned on?
6. What is the right boundary between helpful gamification and distraction?
7. Should imports from existing CSVs be in MVP or later?

---

## 21. Draft Messaging

### Working Product Description
A free, local-first desktop app that helps you build a daily money habit through manual tracking, debt progress visibility, and simple cashflow awareness.

### Messaging Themes
- Own your data
- No subscription
- Manual by design
- Local and portable
- Daily progress, not financial theater
- Built for consistency, not perfection

### Sample Taglines
- **Own your money habit**
- **Track it daily. Keep it local.**
- **A calmer way to stay on top of money in and money out**
- **Your data. Your routine. Your progress.**
- **Get out of the debt loop one honest check-in at a time**

---