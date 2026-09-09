# World Generator

World Generator is a React + Vite application for generating procedural island and terrain-inspired worlds.

## Local development

### Requirements

- Node.js 22
- pnpm 10.13.1

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
pnpm lint:scss
pnpm format
pnpm test
pnpm check:all
```

Stylelint validates all SCSS files using the rules in `.stylelintrc.json`.
Use `pnpm lint:scss:fix` to apply safe automatic fixes.

## Generation preview

The home page uses the map generation pipeline and can run it either on the main
thread or in a Web Worker. The current pipeline contains two implemented stages:

1. `WorldShapeStage` creates the circular `worldMask`.
2. `NoiseStage` creates the deterministic `noiseMap` inside that mask.

The preview exposes these results as base map layers. The `World boundary`
overlay is currently implemented as well. Temperature and moisture are shown in
the layer controls as reserved future overlays and remain disabled until their
generation stages produce data.

The map viewer keeps raw numeric layers separate from rendering. This allows
future stages such as height, temperature, moisture, hydrology and biomes to be
displayed or composited without changing the generator result format again.

Generation stages emit lifecycle events used by the progress indicator below the
map. The current events report stage boundaries (`0%` and `100%`); chunk-level
progress can be added later without changing the preview component API.

For local visual testing, an optional delay can be enabled between stages:

```env
VITE_GENERATION_STAGE_DELAY_MS=500
```

The value is in milliseconds. Restart the Vite server after changing the value.
Leave it unset, or set it to `0`, for normal generation speed.

## Project structure

- `src/utils/map-generator` contains the stage pipeline, stage events and worker
  transport.
- `src/components/world-generation-preview` coordinates generation state and
  sends raw results to the UI.
- `src/components/preview-map` contains the map canvas, base-layer tabs,
  overlay controls and layer renderer.
- `src/components/generation-progress` renders the current stage and progress.
- `docs/world-generation-roadmap.md` describes planned stages and future layer
  contracts beyond the currently implemented shape and noise stages.

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

**Code Quality** (typecheck, ESLint, Stylelint, format, build)
- Type safety check (`pnpm typecheck`)
- TypeScript/React linting (`pnpm lint`)
- SCSS linting with Stylelint (`pnpm lint:scss`)
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

## Feature flags

Feature flags are resolved at runtime from **Vercel Global Config**, so they can
be toggled from the Vercel dashboard without a redeploy.

**How it works:**

- `src/feature-flags/flags.ts` is the typed registry. `FLAG_DEFAULTS` holds each
  flag's default (also the fallback when the remote store is unavailable).
  Flags can be booleans or strings; string flags declare their allowed values in
  `FLAG_OPTIONS`, which becomes the flag's TypeScript union type.
- `api/flags.ts` is a Vercel Function that reads only the registered flags from
  Global Config and returns them as JSON at `GET /api/flags`. If Global Config
  is unavailable, it returns `FLAG_DEFAULTS`.
- `FeatureFlagsProvider` fetches `/api/flags` on load; consume flags with
  `useFlag('breadcrumbs')`. Remote values are validated against the registry —
  unknown keys, wrong types, and string values outside `FLAG_OPTIONS` are ignored
  and fall back to the default.

**Dashboard setup (one time):**

1. In the Vercel project: **Storage → Create Database → Global Config**.
2. Under **Items**, add the flags as JSON, e.g. `{ "breadcrumbs": false }`.
3. Connecting the store to the project sets the `GLOBAL_CONFIG` environment
   variable automatically.

Change a flag by editing its item in **Items** — no redeploy needed.

**Local development:** `pnpm dev` serves `/api/flags` from `flags.local.json`.
Edit that file and refresh the app to test different flag values. To exercise
the real Vercel Function locally, run `vercel env pull` and then `vercel dev`.

## Notes

This project includes:

- `commitlint` with conventional commit rules
- `husky` for git hooks
- `eslint`, `stylelint`, and `prettier`
- `vitest` for testing
- GitHub Actions CI
- Vercel deployment for production
