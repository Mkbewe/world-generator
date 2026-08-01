# World Generator

World Generator is a React + Vite application for generating procedural island and terrain-inspired worlds.

## Local development

### Requirements

- Node.js 22
- pnpm 9

### Install

```bash
corepack enable
pnpm install
```

### Run locally

```bash
pnpm dev
```

### Production build

```bash
pnpm build
```

### Quality checks

```bash
pnpm typecheck
pnpm lint
pnpm format
pnpm test
pnpm check:all
```

## Branching strategy

The repository uses a simplified GitHub Flow:

- `master` — the single long-lived branch (protected)
- `feature/<name>` — new work
- `hotfix/<name>` — emergency fixes

Recommended flow:

1. Create a `feature/*` (or `hotfix/*`) branch from `master`
2. Open a PR to `master`
3. After review and green CI, **squash and merge** into `master`

Every push to `master` is automatically deployed to the **dev** environment
(see [Deployment](#deployment)). Production is promoted manually.

## Commit naming convention

Use Conventional Commits.

Examples:

```bash
git commit -m "feat: add procedural island generator"
git commit -m "fix: repair noise offset calculation"
git commit -m "docs: update setup instructions"
git commit -m "chore(release): prepare v0.0.1"
```

Common types:

- `feat:` — new feature
- `fix:` — bug fix
- `docs:` — docs only
- `refactor:` — internal cleanup
- `test:` — test changes
- `chore:` — maintenance and release preparation

## CI workflow

CI is responsible for validating pull requests and branch updates.

The workflow runs two parallel jobs:

**Code Quality** (typecheck, lint, format, build)
- Type safety check (`pnpm typecheck`)
- Linting (`pnpm lint`)
- Formatting validation (`pnpm format`)
- Production build verification (`pnpm build`)

**Tests** (unit and component tests)
- Test suite execution (`pnpm test`)

**PR Title Validation**
- Enforces Conventional Commits format for PR titles
- Validates commit type prefixes (feat, fix, docs, etc.)
- Ensures subject starts with lowercase

These checks are the main safety gate before merge.

## Versioning and releases

The project uses `standard-version` for automated versioning and changelog generation.

Available commands:

```bash
pnpm release        # auto-detect version bump from commits
pnpm release:patch  # 0.0.x
pnpm release:minor  # 0.x.0
pnpm release:major  # x.0.0
```

This tool:

- analyzes commit messages (Conventional Commits)
- decides version bump (`patch`, `minor`, or `major`)
- updates `package.json`
- generates `CHANGELOG.md`
- creates a git commit with the changes

Examples:

- `feat:` → bumps `minor`
- `fix:` → bumps `patch`
- `BREAKING CHANGE:` → bumps `major`

Typical flow: on a `feature/*` branch run `pnpm release` to bump the version
and update `CHANGELOG.md`, then open the PR. When the version bump in
`package.json` lands on `master`, the **Create GitHub Release** workflow
automatically:
- creates a git tag (e.g., `v0.0.5`)
- creates a GitHub release with changelog notes

## Deployment

Deployment is decoupled from merging: every push to `master` ships to **dev**,
and production is promoted manually from a dev deployment that has been tested.
No rebuild happens on promotion — the exact artifact tested on dev is the one
that goes live.

**Environments:**

- **Dev** — https://world-generator-dev.vercel.app
- **Production** — the project's production domain on Vercel

**Workflows** (`.github/workflows/`):

- **Deploy to Dev** (`deploy-dev.yml`) — runs automatically on every push to
  `master`. Builds and deploys a Vercel preview, then aliases it to the dev URL.
- **Promote to Production** (`deploy-production.yml`) — manual
  (`workflow_dispatch`). Takes a dev deployment URL and runs `vercel promote`
  to make it the live production deployment (no rebuild). Requires typing
  `deploy` to confirm.
- **Rollback Production** (`rollback.yml`) — manual (`workflow_dispatch`).
  Promotes a previous good deployment URL back to production via `vercel promote`.
  Requires typing `rollback` to confirm.

Deployment auth is provided by the `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and
`VERCEL_PROJECT_ID` repository secrets.

## Notes

This project includes:

- `commitlint` with conventional commit rules
- `husky` for git hooks
- `eslint` and `prettier`
- `vitest` for testing
- GitHub Actions CI
- Vercel deployment for production
