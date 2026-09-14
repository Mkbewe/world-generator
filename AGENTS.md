# AGENTS.md

## Project

World Generator — React + TypeScript + Vite app. Package manager: pnpm.
See `README.md` and `docs/world-generation-roadmap.md` for architecture.

## Commands

- `pnpm run check:all` — typecheck, ESLint, Stylelint, Prettier and tests; run before finishing work
- `pnpm test` — Vitest suite only
- Commits follow Conventional Commits; pre-commit runs typecheck, lint-staged and tests

## GitHub

- Board: **World Generator Board**, owner `Mkbewe`, project number `1`
- Repository: `Mkbewe/world-generator`
- List board items: `gh project item-list 1 --owner Mkbewe --format json`
- Issue details: `gh issue view <number> -R Mkbewe/world-generator`
- Create issue: `gh issue create -R Mkbewe/world-generator`
- `gh` is installed and authenticated (account `Mkbewe`)

## Working agreement

Every change in the project requires the user's explicit confirmation before it
is made. Do not edit files, commit, push, or modify GitHub issues/board items
without approval.

Tests are only updated or fixed once work on a task is finished — not after
every small change while the task is still in progress.
