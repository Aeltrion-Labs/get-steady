# Desktop Semantic Release Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add `release-please`-driven semantic versioning for the desktop app so conventional commits on `main` produce a release PR, synchronized desktop version bumps, and automated GitHub Releases/tags.

**Architecture:** Add a dedicated `release-please` workflow on `main`, scoped to one desktop release stream. The bot will own desktop version bumps in `apps/desktop/package.json` and `apps/desktop/src-tauri/tauri.conf.json`, while the existing tag-triggered Windows packaging workflow remains responsible for installer artifacts.

**Tech Stack:** GitHub Actions, release-please, conventional commits, Node/PNPM workspace, Tauri 2

---

### Task 1: Document Current Release Inputs

**Files:**
- Read: `apps/desktop/package.json`
- Read: `apps/desktop/src-tauri/tauri.conf.json`
- Read: `.github/workflows/release-desktop-windows.yml`

**Step 1: Confirm current desktop version sources**

Run:

```powershell
Get-Content apps/desktop/package.json
Get-Content apps/desktop/src-tauri/tauri.conf.json
```

Expected: both files currently carry the desktop version and must stay synchronized.

**Step 2: Confirm current tag-based packaging flow**

Run:

```powershell
Get-Content .github/workflows/release-desktop-windows.yml
```

Expected: the workflow triggers on `v*` tags and can remain the packaging layer.

### Task 2: Add Release-Please Configuration

**Files:**
- Create: `release-please-config.json`
- Create: `.release-please-manifest.json`

**Step 1: Write the release-please config**

Configure one desktop release component that:

- uses conventional commits
- targets `main`
- produces tags in `vX.Y.Z` format
- bumps:
  - `apps/desktop/package.json`
  - `apps/desktop/src-tauri/tauri.conf.json`

**Step 2: Seed the manifest**

Set the desktop release stream to the current version `0.1.0`.

**Step 3: Review the config**

Run:

```powershell
Get-Content release-please-config.json
Get-Content .release-please-manifest.json
```

Expected: config clearly scopes release automation to the desktop app only.

### Task 3: Add The Release-Please Workflow

**Files:**
- Create: `.github/workflows/release-please.yml`

**Step 1: Write the workflow**

Use the official `google-github-actions/release-please-action`.

Include:

- trigger on pushes to `main`
- permissions required for pull requests and contents
- config and manifest file references
- release type appropriate for this repo structure

**Step 2: Keep it separate from packaging**

Do not merge packaging logic into this workflow. Its job is release PR/tag orchestration only.

### Task 4: Document Contributor And Release Rules

**Files:**
- Modify: `README.md`

**Step 1: Add a short release/versioning section**

Document:

- desktop releases use conventional commits
- `release-please` opens release PRs
- merging the release PR creates the desktop tag/release
- the Windows installer workflow publishes artifacts from that tag

**Step 2: Keep scope narrow**

Do not imply workspace-wide semantic release automation.

### Task 5: Verify Configuration

**Files:**
- Read/verify only

**Step 1: Validate workflow and config diff**

Run:

```powershell
git diff -- .github/workflows/release-please.yml release-please-config.json .release-please-manifest.json README.md
```

Expected: diff contains only semantic release configuration and minimal documentation.

**Step 2: Run repo checks**

Run:

```powershell
pnpm lint
pnpm test
```

Expected: PASS

**Step 3: Confirm tag compatibility**

Run:

```powershell
rg -n "v\\*" .github/workflows/release-desktop-windows.yml .github/workflows/release-please.yml
```

Expected: the release bot and Windows packaging workflow both align on `v*` tags.

### Task 6: Review Final State

**Files:**
- Read/verify only

**Step 1: Inspect status**

Run:

```powershell
git status --short
```

Expected: only intended semantic-release files are modified.

**Step 2: Commit**

```powershell
git add .github/workflows/release-please.yml release-please-config.json .release-please-manifest.json README.md docs/plans/2026-03-28-desktop-semantic-release-design.md docs/plans/2026-03-28-desktop-semantic-release.md
git commit -m "chore(release): add desktop semantic release automation"
```
