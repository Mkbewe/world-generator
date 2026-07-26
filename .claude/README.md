# Claude Configuration

## Session Start Protocol

Before starting each work session:
1. Read the project README file (`README.md` in project root)
2. Read the theming README file (`src/theme/README.md`)

## Working Principles

- **Do NOT be proactive in modifying things that were not explicitly requested**
- Only make changes that are directly asked for
- Do not add extra features, refactoring, or "improvements" beyond the specific request

## Design System Rules

- Always use Radix UI Themes instead of hardcoded CSS values
- Font sizes: use `size` prop on components (1-9), not `font-size` in CSS
- Spacing: use `gap`, `px`, `py`, `p` props, not hardcoded margins/paddings
- Colors: use CSS variables like `var(--gray-2)`, not hex values
- Only use custom CSS for things impossible with Radix UI (like gradients)

## Branding

- Turquoise gradient: `linear-gradient(135deg, #64ffda 0%, #00bfa5 100%)`
- Applied to main "World Generator" heading
