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

- one public component per file, in its own folder with a colocated test; add a `module.scss` only when the component has its own styles
- non-component logic and types live in a `lib/` folder; hooks live in a `hooks/` folder, which is the preferred place for them (a `lib/` folder is still acceptable, but prefer `hooks/`)
- soft limit ~150 lines per component file (ESLint fails above 200)
- folders stay under ~7 component files
- prefer `children` over text props when a shared wrapper is genuinely needed

## Code style

- nested ternary expressions are forbidden (`no-nested-ternary`); use
  `if`/`else` or a small helper instead,
- non-null assertions (`!`) are forbidden
  (`@typescript-eslint/no-non-null-assertion`); narrow values with explicit
  guards instead of silencing the type checker,
- do not silence a wrong model with `as`. A cast is allowed only at a real
  boundary (worker message, parsed JSON) and must sit next to a type guard,
- do not add a second algorithm that repairs the first. Fix the contract or
  replace the algorithm; a fallback that restores an invariant is a design bug,
- do not branch on a variant name (`kind`, archetype, noise source) when that
  variant should carry the behavior. Extend the variant instead of a new `if`.

## Generator boundaries

The pipeline stays independent of rendering and UI. Rationale and the current
breaks are in `docs/map-generator-architecture-review.md`.

- `src/utils/map-generator` must not import from `map-layers`, `map-renderer`,
  components, or stores. Those layers depend on the generator, never the reverse,
- a stage declares typed inputs and outputs. Do not read an undeclared
  `context.state` key, and do not add a session, worker, or renderer `if` that
  special-cases one domain object (the `landmassLayout` stitch),
- one coordinate frame and one distance function. Do not add a second
  normalization or a `wrap` branch inside a stage; topology belongs to a shared
  spatial port,
- `PIPELINE_STAGES` order is not a data-dependency graph. Do not reorder it to
  fix a dependency, and do not encode a conditional dependency as an always-on
  `configKeys` entry,
- form-only policy (slider percents, preset labels, grid-cost copy) does not
  belong next to a raster loop. Domain limits (`MAX_*`, valid ranges) do.

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

Pushing branches and creating pull requests are always the user's job. Never run
`git push` or `gh pr create` for a branch without an explicit instruction for
that specific branch.

Tests are only updated or fixed once work on a task is finished — not after
every small change while the task is still in progress. Do not run the test
suite or `check:all` after every small edit either; run the full check once, at
the end of the task.
