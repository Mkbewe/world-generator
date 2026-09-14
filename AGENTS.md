# AGENTS.md

## Project

World Generator — React + TypeScript + Vite app. Package manager: pnpm.
See `README.md` and `docs/world-generation-roadmap.md` for architecture.

## Commands

- `pnpm run check:all` — typecheck, ESLint, Stylelint, Prettier and tests; run before finishing work
- `pnpm test` — Vitest suite only
- Commits follow Conventional Commits; pre-commit runs typecheck, lint-staged and tests
- Commit subjects are at most 72 characters (enforced by commitlint)

## Components

- one public component per file, in its own folder with a colocated `module.scss` and test
- non-component logic, types and hooks live in a `lib/` folder
- soft limit ~150 lines per component file (ESLint fails above 200)
- folders stay under ~7 component files
- prefer `children` over text props when a shared wrapper is genuinely needed

## GitHub

- Boards (owner `Mkbewe`): **World Generator Board** (project `1`, product work) and **World Generator Infra** (project `2`, `area:infra` tasks)
- Repository: `Mkbewe/world-generator`
- List board items: `gh project item-list 1 --owner Mkbewe --format json`
- Issue details: `gh issue view <number> -R Mkbewe/world-generator`
- Create issue: `gh issue create -R Mkbewe/world-generator`
- `gh` is installed and authenticated (account `Mkbewe`)
- Issue titles and descriptions are written in English; repository docs stay Polish
- Statuses mean: Backlog -> ToDo -> In progress -> Done (merged to master) -> Deployed to Prod (shipped in a release)
- Every issue carries exactly one `area:*` label (`area:generator`, `area:map`, `area:ui`, `area:tooling`, `area:docs`, `area:infra`) and one type label (`enhancement`, `bug`, `refactor`, `chore`, `documentation`, `perf`, `test`, `ci`)

## Working agreement

Every change in the project requires the user's explicit confirmation before it
is made. Do not edit files, commit, push, or modify GitHub issues/board items
without approval.

Tests are only updated or fixed once work on a task is finished — not after
every small change while the task is still in progress.
