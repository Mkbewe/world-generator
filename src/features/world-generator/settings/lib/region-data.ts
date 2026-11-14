import type { FormLink } from './form-link';

export interface RegionData<TRegion> {
  readonly regions: readonly TRegion[];
  readonly selectedIndex: number;
  readonly selectedId: string;
  readonly selectedRegion: TRegion;
}

export interface RegionActions {
  selectRegionById(id: string): void;
}

export type RegionLink<TRegion> = FormLink<RegionData<TRegion>, RegionActions>;
