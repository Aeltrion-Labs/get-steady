# Contributing

Thanks for contributing to Get Steady.

## Ground Rules

- Keep the product narrow and honest.
- Prefer local-first behavior over hosted dependencies.
- Avoid adding features that turn the app into a full budgeting suite.
- Match the existing calm, practical tone in product and documentation copy.

## Local Setup

Prerequisites:

- Node.js 22+
- pnpm 10+
- Rust stable toolchain

Install dependencies:

```bash
pnpm install
```

Run the desktop app:

```bash
pnpm --filter @get-steady/desktop tauri dev
```

## Common Commands

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm test:rust
pnpm check
```

To format the repository:

```bash
pnpm format
```

## Pull Requests

Before opening a pull request:

- run `pnpm check`
- keep changes scoped to one concern
- update docs when commands, behavior, or guarantees change
- add or update tests for behavior changes

## Testing Expectations

- TypeScript and React changes should include or update automated tests when behavior changes.
- Rust database and command-layer changes should keep `cargo test` green.
- CI should stay green without relying on generated local artifacts.

## Scope Discipline

Good contributions:

- bug fixes
- docs clarity
- test coverage improvements
- focused UX improvements inside the current product frame
- launch-readiness and automation improvements

Changes that need extra scrutiny:

- cloud services
- bank integrations
- analytics sprawl
- new persistence models
- broad product repositioning
