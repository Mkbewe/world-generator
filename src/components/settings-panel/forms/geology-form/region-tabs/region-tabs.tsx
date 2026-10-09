import type { GeologicalRegionType } from '../../../../../utils/map-generator';
import { geologyRegionColor } from '../../../../../utils/map-layers';
import styles from './region-tabs.module.scss';

export interface RegionTabsProps {
  types: readonly GeologicalRegionType[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

/** Region tabs with a colour matching the map; they wrap on narrow panels. */
export function RegionTabs({ types, selectedIndex, onSelect }: RegionTabsProps) {
  return (
    <div className={styles.strip} role='tablist' aria-label='Geology regions'>
      {types.map((type, index) => (
        <button
          key={index}
          type='button'
          role='tab'
          aria-selected={index === selectedIndex}
          aria-label={`Region ${index + 1}`}
          className={styles.tab}
          data-active={index === selectedIndex || undefined}
          onClick={() => onSelect(index)}
        >
          <span
            className={styles.swatch}
            style={{ backgroundColor: swatchColor(type, index) }}
            aria-hidden
          />
          {index + 1}
        </button>
      ))}
    </div>
  );
}

function swatchColor(type: GeologicalRegionType, index: number): string {
  const [red, green, blue] = geologyRegionColor(type, index);
  return `rgb(${red} ${green} ${blue})`;
}
