# Get Steady MVP Foundation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a runnable Tauri desktop MVP with SQLite persistence, today/ledger/debts/settings screens, CSV export, and database backup.

**Architecture:** Use a small monorepo with a Tauri desktop app plus shared TypeScript packages. Keep domain logic in `packages/core`, keep desktop-specific persistence and commands in `apps/desktop`, and wire the React UI to a thin service layer over Tauri commands.

**Tech Stack:** Tauri 2, React, TypeScript, Vite, Tailwind CSS, shadcn-style components, SQLite, Zod, Vitest

---

### Task 1: Workspace Foundation

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `apps/desktop/*`
- Create: `packages/core/*`
- Create: `packages/ui/*`

**Step 1: Write the failing test**

Create a minimal `packages/core` test that imports the shared package entry point and expects a basic utility export to exist.

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @get-steady/core test`
Expected: fail because the workspace and package are not created yet.

**Step 3: Write minimal implementation**

Create the workspace, app package, shared package, Vite config, Tailwind config, and initial build/test scripts.

**Step 4: Run test to verify it passes**

Run: `pnpm --filter @get-steady/core test`
Expected: pass with the basic shared export available.

### Task 2: Core Schemas and Domain Rules

**Files:**
- Create: `packages/core/src/schema.ts`
- Create: `packages/core/src/summary.ts`
- Create: `packages/core/src/checkins.ts`
- Test: `packages/core/src/*.test.ts`

**Step 1: Write the failing tests**

Add tests for:
- monthly summary totals
- missed-day detection
- check-in completion state

**Step 2: Run tests to verify they fail**

Run: `pnpm --filter @get-steady/core test`

**Step 3: Write minimal implementation**

Add Zod schemas and pure functions for summary/catch-up logic.

**Step 4: Run tests to verify they pass**

Run: `pnpm --filter @get-steady/core test`

### Task 3: SQLite Bootstrap and Repositories

**Files:**
- Create: `apps/desktop/src-tauri/src/db/*`
- Create: `apps/desktop/src-tauri/src/repositories/*`
- Create: `apps/desktop/src-tauri/src/commands/*`

**Step 1: Write the failing test**

Add a Rust integration-style test for migration/bootstrap or, if simpler, a TypeScript-side smoke test against command contracts.

**Step 2: Run test to verify it fails**

Run: `cargo test`

**Step 3: Write minimal implementation**

Create DB bootstrap, migrations, seeded categories, and repository functions for categories, entries, debts, check-ins, export rows, and backup.

**Step 4: Run test to verify it passes**

Run: `cargo test`

### Task 4: Tauri Command Surface

**Files:**
- Modify: `apps/desktop/src-tauri/src/lib.rs`
- Create: `apps/desktop/src/lib/api.ts`
- Create: `apps/desktop/src/lib/query-client.ts`

**Step 1: Write the failing test**

Add a frontend-level unit test that expects command wrappers to return typed data for summaries or entries.

**Step 2: Run test to verify it fails**

Run: `pnpm --filter desktop test`

**Step 3: Write minimal implementation**

Add command handlers and frontend invoke wrappers for:
- bootstrap payload
- entries CRUD
- debts CRUD
- record debt payment
- check-ins
- summaries
- export
- backup

**Step 4: Run test to verify it passes**

Run: `pnpm --filter desktop test`

### Task 5: Today and Catch-Up UI

**Files:**
- Create: `apps/desktop/src/features/today/*`
- Modify: `apps/desktop/src/App.tsx`
- Test: `apps/desktop/src/features/today/*.test.tsx`

**Step 1: Write the failing test**

Add a component test for showing today totals and a missed-day catch-up prompt from supplied data.

**Step 2: Run test to verify it fails**

Run: `pnpm --filter desktop test`

**Step 3: Write minimal implementation**

Build the today screen, quick-add forms, mark-check-in action, and catch-up list/modal.

**Step 4: Run test to verify it passes**

Run: `pnpm --filter desktop test`

### Task 6: Ledger and Debts UI

**Files:**
- Create: `apps/desktop/src/features/ledger/*`
- Create: `apps/desktop/src/features/debts/*`
- Test: `apps/desktop/src/features/ledger/*.test.tsx`
- Test: `apps/desktop/src/features/debts/*.test.tsx`

**Step 1: Write the failing tests**

Add tests for:
- ledger filters
- entry form editing
- debt summary rendering
- debt payment action

**Step 2: Run tests to verify they fail**

Run: `pnpm --filter desktop test`

**Step 3: Write minimal implementation**

Build ledger list/forms and debts list/forms/payment flow.

**Step 4: Run test to verify they pass**

Run: `pnpm --filter desktop test`

### Task 7: Settings, Export, Backup, and Docs

**Files:**
- Create: `apps/desktop/src/features/settings/*`
- Modify: `README.md`
- Create: `IMPLEMENTATION_NOTES.md`

**Step 1: Write the failing test**

Add a small test for CSV formatting or settings action state.

**Step 2: Run test to verify it fails**

Run: `pnpm --filter desktop test`

**Step 3: Write minimal implementation**

Build settings screen, export actions, backup action, and write project docs.

**Step 4: Run test to verify it passes**

Run: `pnpm --filter desktop test`

### Task 8: End-to-End Verification

**Files:**
- Modify: as needed based on failures

**Step 1: Run full verification**

Run:
- `pnpm test`
- `pnpm --filter desktop build`
- `cargo test`

**Step 2: Fix failures**

Make the smallest changes necessary to reach green verification.

**Step 3: Run app smoke check**

Run: `pnpm --filter desktop tauri build` or `pnpm --filter desktop tauri dev` depending on environment feasibility.

**Step 4: Document final status**

Update `README.md` and `IMPLEMENTATION_NOTES.md` with any scoped deferrals or environment limitations discovered during verification.
