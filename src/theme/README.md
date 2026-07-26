# Theme

Custom theming overrides for Radix Themes.

## Structure

- `palette.css` - Custom color overrides for light/dark mode
- `breakpoints.css` - Responsive breakpoint variables
- `index.css` - Main entry point (imports all theme files)

## Breakpoints

Available breakpoint variables:

```css
--breakpoint-mobile: 768px;
--breakpoint-tablet: 1024px;
--breakpoint-desktop: 1400px;
```

### Usage in CSS

```css
/* Mobile-first approach (recommended) */
.myComponent {
  padding: 1rem;
}

@media (min-width: 768px) {
  /* Tablet and up */
  .myComponent {
    padding: 2rem;
  }
}

@media (min-width: 1024px) {
  /* Desktop and up */
  .myComponent {
    padding: 3rem;
  }
}
```

## Color Palette

Custom Radix Themes color overrides are defined in `palette.css`.

### Light Mode
- Softer background colors (warm beige tones)
- Better readability with reduced brightness

### Dark Mode
- Slightly lighter backgrounds for better contrast
