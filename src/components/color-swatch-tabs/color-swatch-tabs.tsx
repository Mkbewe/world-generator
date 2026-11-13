import type { Color } from '../../utils/map-layers';
import { colorString } from '../lib/color';
import styles from './color-swatch-tabs.module.scss';

export interface ColorSwatchTabOption {
  readonly id: string;
  /** Accessible name of the option, e.g. "Region 1". */
  readonly label: string;
  readonly color: Color;
}

interface ColorSwatchTabsProps {
  items: readonly ColorSwatchTabOption[];
  selectedId?: string;
  onSelect: (id: string) => void;
  ariaLabel: string;
}

/** Colour swatches for choosing one item by stable id; they wrap on narrow panels. */
export function ColorSwatchTabs({ items, selectedId, onSelect, ariaLabel }: ColorSwatchTabsProps) {
  return (
    <div className={styles.strip} role='group' aria-label={ariaLabel}>
      {items.map((item, index) => {
        const selected = item.id === selectedId;
        return (
          <button
            key={item.id}
            type='button'
            aria-pressed={selected}
            aria-label={item.label}
            className={styles.tab}
            data-active={selected || undefined}
            onClick={() => onSelect(item.id)}
          >
            <span
              className={styles.swatch}
              style={{ backgroundColor: colorString(item.color) }}
              aria-hidden
            />
            {index + 1}
          </button>
        );
      })}
    </div>
  );
}
