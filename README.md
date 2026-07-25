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

The repository uses a simple, scalable Git flow:

- `master` — production branch (deployed to Vercel)
- `develop` — integration / stage branch
- `feature/<name>` — new work
- `release/<version>` — release preparation
- `hotfix/<name>` — emergency fixes

Recommended flow:

1. Create a `feature/*` branch from `develop`
2. Open a PR to `develop` (merge or squash)
3. After review, merge to `develop`
4. For release:
   - Create `release/v0.0.x` branch from `develop`
   - Run `pnpm release` (bumps version, updates CHANGELOG)
   - Open PR from `release/v0.0.x` to `master`
   - **Use "Rebase and merge"** to keep linear history
5. After merge to `master`:
   - Sync `develop` with `master` (rebase locally or PR from `master` to `develop`)

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

After merging to `master`, GitHub Actions automatically:
- creates a git tag (e.g., `v0.0.4`)
- creates a GitHub release with changelog notes

## Deployment

The `master` branch is automatically deployed to Vercel on every push.

Live URL: https://world-generator-five.vercel.app

**Automatic deployments:**
- **Production**: every push to `master` → live URL
- **Preview**: every PR → unique preview URL for testing

No manual deployment workflow needed - Vercel handles:
- Build (`pnpm build`)
- Deploy to CDN
- SSL certificates
- Environment configuration

## Notes

This project includes:

- `commitlint` with conventional commit rules
- `husky` for git hooks
- `eslint` and `prettier`
- `vitest` for testing
- GitHub Actions CI
- Vercel deployment for production
