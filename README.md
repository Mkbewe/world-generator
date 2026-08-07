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
and update `CHANGELOG.md` (no git tag is created locally), then open the PR and
merge it to `master`. Merging only ships the build to **dev** — no tag or
release yet.

The git tag and GitHub release are created later, when the tested build is
**promoted to production**. The **Promote to Production** workflow calls the
**Create GitHub Release** workflow (`create-release.yml`, a reusable
`workflow_call`) as its final step, which:
- creates a git tag for the current `package.json` version (e.g., `v0.1.0`)
- creates a GitHub release with changelog notes

This means a GitHub release always corresponds to something that is live in
production. Rollbacks do **not** create releases. The tag step is idempotent —
promoting the same version again will not create a duplicate tag or release.

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
  `master`. Deploys a Vercel preview with the Vercel CLI (`vercel deploy`),
  aliases it to the dev URL, and posts a commit comment with the dev URL and the
  unique deployment URL.
- **Promote to Production** (`deploy-production.yml`) — manual
  (`workflow_dispatch`). Promotes a tested dev deployment to production via
  `vercel promote` (no rebuild). Leave the deployment URL **empty** to promote
  the current dev deployment, or pass a specific dev deployment URL to promote
  that one. Requires typing `deploy` to confirm. After a successful promotion it
  creates the git tag and GitHub release for the current version (see
  [Versioning and releases](#versioning-and-releases)).
- **Rollback Production** (`rollback.yml`) — manual (`workflow_dispatch`).
  Promotes a previous good deployment URL back to production via `vercel promote`.
  Requires typing `rollback` to confirm.

Promote and rollback share their resolve-and-promote logic through a composite
action (`.github/actions/vercel-promote`): it resolves the target deployment
(explicit URL, or the current dev deployment when none is given), promotes it,
and exposes both a friendly URL and the deployment id. Both workflows post a
commit comment linking to the promoted deployment.

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
