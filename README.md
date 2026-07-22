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

- `master` — production branch
- `develop` — integration / stage branch
- `feature/<name>` — new work
- `hotfix/<name>` — emergency fixes

Recommended flow:

1. Create a `feature/*` branch from `develop`
2. Open a PR to `develop`
3. After review, merge to `develop`
4. Open a release PR from `develop` to `master`
5. Merge to `master` only for release

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

The workflow checks:

- type safety
- linting
- formatting
- build
- test suite

This is the main safety gate before merge.

## 5. Automatic versioning and changelog

To automate the release process, the project can use `semantic-release`.

This tool:

- analyzes commit messages
- decides whether a change should bump `patch`, `minor`, or `major`
- updates the version in `package.json`
- generates `CHANGELOG.md`
- creates Git tags and release entries

Examples:

- `feat:` → bumps `minor`
- `fix:` → bumps `patch`
- `BREAKING CHANGE:` → bumps `major`

In practice, `semantic-release` generates the release draft automatically, but the generated result can still be adjusted manually before the final promotion to `master`.

## Tagging and releases

Use annotated tags for release points.

```bash
git tag -a v0.0.1 -m "Release v0.0.1"
git push origin v0.0.1
```

Recommended practice:

- tag only after the release PR has been merged into `master`
- keep tags tied to the release commit
- use the tag name as the version reference for the release

## Notes

This project already includes:

- `commitlint` with conventional commit rules
- `eslint` and `prettier`
- `vitest` tests
- GitHub Actions CI
- GitHub Pages deployment flow for the production branch
