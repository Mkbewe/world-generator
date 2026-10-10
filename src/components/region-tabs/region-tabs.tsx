import type { Color } from '../../utils/map-layers';
import { colorString } from '../lib/color';
import styles from './region-tabs.module.scss';

export interface RegionTabItem {
  readonly id: string;
  /** Accessible name of the tab, e.g. "Region 1". */
  readonly label: string;
  readonly color: Color;
}

interface RegionTabsProps {
  items: readonly RegionTabItem[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  ariaLabel: string;
}

/** Region tabs with the map colour of every region; they wrap on narrow panels. */
export function RegionTabs({ items, selectedIndex, onSelect, ariaLabel }: RegionTabsProps) {
  return (
    <div className={styles.strip} role='tablist' aria-label={ariaLabel}>
      {items.map((item, index) => (
        <button
          key={item.id}
          type='button'
          role='tab'
          aria-selected={index === selectedIndex}
          aria-label={item.label}
          className={styles.tab}
          data-active={index === selectedIndex || undefined}
          onClick={() => onSelect(index)}
        >
          <span
            className={styles.swatch}
            style={{ backgroundColor: colorString(item.color) }}
            aria-hidden
          />
          {index + 1}
        </button>
      ))}
    </div>
  );
}
