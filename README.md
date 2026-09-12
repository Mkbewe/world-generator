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

The home page runs the map generation pipeline in a Web Worker. The current
pipeline contains two implemented stages:

1. `WorldShapeStage` creates a disc or rectangular `worldMask`.
2. `NoiseStage` creates the deterministic `noiseMap` inside that mask.

The preview exposes these results as base map layers and the `World boundary`
overlay. The map viewer keeps raw numeric layers separate from rendering, so
future stages such as height, temperature, moisture, hydrology and biomes can be
added without changing the rendering layer.

Generation always runs in a Web Worker, which announces its stages up front and
then streams lifecycle events with each stage's output data and progress; these
drive the indicator below the map. The final result carries generation statistics
only — generated layers are persisted from the stage events so the last map can
be restored after navigation.

For local visual testing, an optional delay can be enabled between stages:

```env
VITE_GENERATION_STAGE_DELAY_MS=500
```

The value is in milliseconds. Restart the Vite server after changing the value.
Leave it unset, or set it to `0`, for normal generation speed.

### Statistics

The progress indicator below the map shows the current stage and percentage
during generation. Finished runs keep their map configuration, per-stage
generation statistics and render statistics (layer timings, tiles, first-tile
time and presentation/overlay time); the `/statistics` page presents them
together. All of it lives in memory for the session, so a full page refresh
clears it.

## Project structure

- `src/utils/map-generator` contains the stage pipeline, stages, stage events and
  worker transport.
- `src/components/world-generator` is the generator view: settings, generation
  orchestration and the map preview.
- `src/components/preview-map` contains the map canvas and the layer/overlay
  controls.
- `src/utils/map-renderer` renders layers and overlays (scene, view, layer cache,
  metrics and persistence).
- `src/stores` holds global UI state: form values per settings tab, generation
  progress and statistics, map config, preview selection and render statistics.
- `src/components/generation-progress` renders the current stage and progress.
- `docs/world-generation-roadmap.md` describes planned stages and future layer
  contracts beyond the currently implemented shape and noise stages.

## Branching strategy

The repository uses a simplified GitHub Flow:

- `master` — the single long-lived branch (protected)
- `<type>/<issue>-<name>` — working branches, e.g. `feat/163-stage-indicator`
- `release/vX.Y.Z` — release branches created by the release script

Recommended flow:

1. Create a branch from `master` (`feat/*`, `fix/*`, `refactor/*`, `chore/*`, ...)
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

CI runs on pull requests and pushes to `master` (`ci.yml`) with two jobs:

**Code Quality** — typecheck, ESLint, Stylelint, format and production build.

**Tests** — the full Vitest suite.

A separate workflow (`pr-title-check.yml`) validates that PR titles follow
Conventional Commits (type prefix, lowercase subject). These checks are the main
safety gate before merge.

## Versioning and releases

Versioning and changelog generation use `standard-version` with Conventional
Commits:

```bash
pnpm release        # detects the bump and creates release/vX.Y.Z
pnpm release:patch  # force patch
pnpm release:minor  # force minor
pnpm release:major  # force major
```

`pnpm release` looks at the commits since the last tag: `feat:` bumps `minor`,
while fixes, refactors, chores and docs bump `patch`. A breaking change
(`feat!:` or a `BREAKING CHANGE:` footer) bumps `major` — or `minor` while the
project is still on `0.x`. The script creates a `release/vX.Y.Z` branch, updates
`package.json` and `CHANGELOG.md`, and commits the result; no git tag is created
locally. Add `--dry-run` to preview the detected bump without changing anything.

Flow: run the release on a clean `master`, push the `release/*` branch and merge
it through a PR. Merging ships the build to **dev**. The git tag and GitHub
release are created later, when the tested build is **promoted to production**.
The **Promote to Production** workflow calls **Create GitHub Release**
(`create-release.yml`) as its final step, which tags the current
`package.json` version and publishes the matching section of `CHANGELOG.md`.

A GitHub release therefore always corresponds to something live in production,
rollbacks do not create releases, and promoting the same version twice is a
no-op.

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
