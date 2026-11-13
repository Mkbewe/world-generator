# AGENTS.md

## Project

World Generator — React + TypeScript + Vite app. Package manager: pnpm.
See `README.md` and `docs/roadmap.md` for architecture.

## Documentation

- `docs/roadmap.md` describes the pipeline direction and current status;
  `docs/user-guide.md` is the user-facing guide.
- Other files under `docs/` are temporary working notes and will be removed. Do
  not treat them as long-term contracts.

## Import aliases

- `@generator`, `@layers`, `@readout`, and `@renderer` map to their
  corresponding folders in `src/utils/`; their subpaths use the same aliases.
- Use these aliases for deep imports into those domains; keep `./` and `../`
  for neighbouring files. Other imports use relative paths.
- The aliases are declared in `tsconfig.json` and `vite.config.ts`;
  `simple-import-sort` groups them with external packages.

## Commands

- `pnpm run check:all` — typecheck, ESLint, Stylelint, Prettier and tests; run before finishing work
- `pnpm test` — Vitest suite only
- Commits follow Conventional Commits; pre-commit runs typecheck, lint-staged and tests
- Use the numeric task/issue number as the Conventional Commit scope, e.g.
  `refactor(542): unify feature selection handling`; never use an area name such
  as `map` or `ui` as the scope. Read the number from the branch or task context;
  ask for it if unavailable.
- Commit subjects start with a lowercase letter; acronyms and module names keep
  their case, and the subject is at most 72 characters (enforced by commitlint)
- when the user asks for a commit name, answer with one message only: the
  Conventional Commits header and, when the change set is large, a body that
  lists the changes as bullet points

## Components

- one public component per file, in its own folder with a colocated test; add a `module.scss` only when the component has its own styles
- non-component logic and types live in a `lib/` folder; hooks live in a `hooks/` folder, which is the preferred place for them (a `lib/` folder is still acceptable, but prefer `hooks/`)
- soft limit ~150 lines per component file under `src/components` (ESLint fails above 200)
- prefer few files per folder (roughly seven at most); split a folder that keeps growing by responsibility
- shared wrappers take `children`; do not add text props just to pass copy through a wrapper

## UI copy and i18n

- All user-facing copy goes through the typed i18n catalogue: use `t()` with a
  `MessageKey` and add matching entries to `src/i18n/locales/en.ts` and
  `src/i18n/locales/pl.ts`. Do not hardcode user-facing strings in components.

## Tests

- Vitest with Testing Library. Keep tests colocated with the component or module
  they cover.
- Test pure logic from `lib/` without rendering React; component tests assert
  user-visible behavior.

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

The pipeline stays independent of rendering and UI. Rationale: `docs/roadmap.md`.

- `src/utils/map-generator` must not import from `map-layers`, `map-renderer`,
  components, or stores. Those layers depend on the generator, never the reverse,
- a stage declares typed inputs and outputs. Do not read an undeclared
  `context.state` key, and do not add a session, worker, or renderer `if` that
  special-cases one domain object instead of its declared stage contract,
- one coordinate frame and one distance function. Do not add a second
  normalization or a `wrap` branch inside a stage; topology belongs to a shared
  spatial port,
- `PIPELINE_STAGES` order is not a data-dependency graph. Do not reorder it to
  fix a dependency, and do not encode a conditional dependency as an always-on
  `configKeys` entry,
- form-only policy (slider percents, preset labels, grid-cost copy) does not
  belong next to a raster loop. Domain limits (`MAX_*`, valid ranges) do,
- `src/legacy-generator` stays by product decision. Do not propose removing or
  disconnecting it.

## GitHub

- Boards (owner `Mkbewe`): **World Generator Board** (project `1`, product work) and **World Generator Infra** (project `2`, `area:infra` tasks)
- Repository: `Mkbewe/world-generator`
- List board items: `gh project item-list 1 --owner Mkbewe --limit 100 --format json` (use `2` for the infra board)
- Issue details: `gh issue view <number> -R Mkbewe/world-generator`
- Create issue: `gh issue create -R Mkbewe/world-generator`
- `gh` is installed and authenticated (account `Mkbewe`)
- Issue titles, descriptions, and repository documentation default to English; use another language only when the user specifies it
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

While iterating on fixes or polishing code, do not run `check:all` repeatedly —
it takes too long. During the work, Prettier and ESLint on the touched files are
enough.
