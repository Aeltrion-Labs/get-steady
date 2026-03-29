# Desktop Semantic Release Design

## Goal

Add automated semantic versioning for the desktop app so releases are cut from `main` using conventional commits, with version bumps and release notes managed by `release-please`.

## Scope

- Desktop app only
- Conventional-commit driven version calculation
- Bot-managed release PRs
- Automatic update of desktop version metadata
- Automatic GitHub Release and tag creation after release PR merge
- Preserve the existing tag-driven Windows packaging workflow

Out of scope:

- Workspace-wide version synchronization
- Web release versioning
- NPM package publishing
- macOS or Linux installer automation changes

## Recommended Approach

Use `release-please` with a single desktop release stream rooted at the repository root but scoped to the desktop product.

The workflow will:

1. Watch pushes to `main`.
2. Parse merged conventional commits since the last desktop release.
3. Open or update a release PR with the next semantic version and generated notes.
4. Bump desktop version metadata in:
   - `apps/desktop/package.json`
   - `apps/desktop/src-tauri/tauri.conf.json`
5. Create the GitHub Release and git tag when the release PR is merged.
6. Let the existing tag-triggered Windows installer workflow run unchanged from that new tag.

## Why This Approach

- It preserves an explicit, reviewable release boundary through a bot-generated PR.
- It fits the current repo structure better than package-centric tooling like Changesets.
- It avoids hand-editing version strings across desktop metadata files.
- It reuses your existing `v*` tag-triggered Windows packaging flow instead of replacing it.

## Versioning Policy

- `feat:` triggers a minor release.
- `fix:` triggers a patch release.
- `feat!:` / `fix!:` / any commit with `BREAKING CHANGE:` triggers a major release.
- `docs:`, `test:`, `chore:`, and similar non-user-facing commit types do not trigger a release unless marked breaking.

## Version Authority

The desktop version is owned by `release-please`.

Files that should be bumped by the release bot:

- `apps/desktop/package.json`
- `apps/desktop/src-tauri/tauri.conf.json`

Files that should remain independent:

- `package.json`
- `apps/web/package.json`
- `packages/core/package.json`

## Workflow Shape

New files:

- `.github/workflows/release-please.yml`
- `release-please-config.json`
- `.release-please-manifest.json`

The release workflow should:

- run on pushes to `main`
- use the official `google-github-actions/release-please-action`
- create one desktop release PR stream
- tag releases as `vX.Y.Z`

## Operational Model

Normal development flow:

1. Merge conventional-commit PRs into `main`.
2. `release-please` updates the desktop release PR.
3. Review and merge the release PR.
4. `release-please` creates the GitHub Release and `vX.Y.Z` tag.
5. The existing Windows release workflow publishes installer assets for that tag.

## Risks And Mitigations

Risk: commit messages are inconsistent and release classification becomes noisy.
Mitigation: document the conventional commit policy in repo docs and PR review expectations.

Risk: desktop version files drift if someone edits them manually.
Mitigation: document `release-please` as the only supported release authority for desktop versions.

Risk: the Windows release workflow and release bot disagree on tag format.
Mitigation: keep `v*` tags in both systems and verify the generated tag naming during rollout.
