# Implementation Notes

## Key Technical Decisions

- Used a small workspace layout with `apps/desktop` plus shared packages to preserve a path toward future CLI/API/MCP reuse without overbuilding the MVP.
- Kept the source of truth in a local SQLite file managed from the Tauri Rust layer. The frontend talks to typed Tauri commands instead of touching storage directly.
- Put summary math, catch-up logic, schemas, and CSV shaping helpers in `packages/core` so the important money logic is reusable and testable outside the UI.
- Represented debt payments as entries with `type = debt_payment` and `debtId` rather than introducing a second payment table in v1. This keeps the MVP smaller while still supporting correct balance updates.
- Used a single bootstrap query that loads categories, entries, debts, and check-ins, then derives Today summaries and missed-day prompts in the shared TypeScript layer.

## Deviations From PRD / TECH

- XLSX export is deferred. CSV export is fully implemented.
- Restore/import UI is deferred. Backup creation is implemented.
- Reminder notifications remain placeholder UI in Settings.
- The persistence/repository layer lives inside the desktop app’s Rust module rather than a separate shared runtime package. The domain logic still lives in `packages/core`.
- The initial MVP does not include charts or a dedicated Trends screen.

## Recommended Next Steps

1. Add restore/import and richer backup management.
2. Move entry/debt repository contracts into clearer Rust modules if the command surface grows.
3. Add integration tests around debt-payment edits/deletes and backup/export commands.
4. Add a dedicated catch-up composer that opens the selected missed day directly with prefilled context.
5. Add optional notifications and recurring templates once the core daily loop feels stable.
6. Add a CLI or read-only local API that reuses `packages/core` contracts and the same repository operations.
