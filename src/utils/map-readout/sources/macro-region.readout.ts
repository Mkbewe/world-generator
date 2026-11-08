import { formatArea } from '../../format';
import { isMacroRegionInfoList, type MacroRegionInfo } from '../../map-generator/info-definitions';
import { defineRasterReadout, type ReadoutInfo, type ReadoutItem } from '../contracts';
import { EMPTY, percent } from '../format/readout-format';

interface MacroRegionPayload {
  readonly regions?: readonly MacroRegionInfo[];
  readonly areas?: readonly (number | undefined)[];
}

function parseMacroRegions(info: ReadoutInfo): MacroRegionPayload {
  const rawAreas: unknown = info.macroRegionAreas;
  return {
    regions: isMacroRegionInfoList(info.macroRegionInfo) ? info.macroRegionInfo : undefined,
    areas: Array.isArray(rawAreas)
      ? rawAreas.map((entry): number | undefined =>
          typeof entry === 'number' && Number.isFinite(entry) ? entry : undefined
        )
      : undefined,
  };
}

/** Label, range, width, danger and area of the macro region under the pointer. */
export const macroRegionReadout = defineRasterReadout(
  'macro-region',
  parseMacroRegions,
  (payload, inspection) => {
    const index = inspection.value;
    if (index === undefined) {
      return undefined;
    }
    const region = payload.regions?.[index];
    if (!region) {
      return [
        {
          id: 'value',
          labelKey: 'readout.value',
          value: { key: 'readout.regionIndex', params: { index } },
        },
      ];
    }
    const items: ReadoutItem[] = [
      {
        id: 'region',
        labelKey: 'readout.region',
        ...(region.label.trim()
          ? { value: region.label }
          : { value: { key: 'readout.regionIndex', params: { index } } }),
      },
      {
        id: 'range',
        labelKey: 'readout.range',
        value: {
          key: region.kind === 'ring' ? 'readout.rangeRing' : 'readout.rangeBand',
          params: {
            from: percent(region.range[0] * (region.kind === 'ring' ? 200 : 100)),
            to: percent(region.range[1] * (region.kind === 'ring' ? 200 : 100)),
          },
        },
      },
      {
        id: 'width',
        labelKey: region.kind === 'ring' ? 'readout.ringThickness' : 'readout.bandWidth',
        value: widthText(region, payload.regions),
      },
      { id: 'danger', labelKey: 'readout.danger', value: region.danger.toFixed(2) },
    ];
    const area = areaItem(payload.areas, index);
    if (area) {
      items.push(area);
    }
    return items;
  }
);

/** Base regions share the layout; an overlay band reports its coverage of the axis. */
function widthText(
  region: MacroRegionInfo,
  regions: readonly MacroRegionInfo[] | undefined
): string {
  const extent = region.range[1] - region.range[0];
  if (region.role === 'overlay') {
    return `${percent(extent * 100)}%`;
  }
  const baseExtent = baseRegionsExtent(regions);
  return baseExtent > 0 ? `${percent((extent / baseExtent) * 100)}%` : EMPTY;
}

/** Ground area of the region and its share of the world, when measured. */
function areaItem(
  areas: readonly (number | undefined)[] | undefined,
  index: number
): ReadoutItem | undefined {
  const area = areas?.[index];
  if (area === undefined) {
    return undefined;
  }
  let total = 0;
  for (const entry of areas ?? []) {
    total += entry ?? 0;
  }
  const share = total > 0 ? ((area / total) * 100).toFixed(1) : '';
  return {
    id: 'area',
    labelKey: 'readout.area',
    ...(share
      ? { value: { key: 'readout.areaShare', params: { area: formatArea(area), share } } }
      : { value: formatArea(area) }),
  };
}

/** Sum of the base region extents, used as the denominator of their width share. */
function baseRegionsExtent(regions: readonly MacroRegionInfo[] | undefined): number {
  let total = 0;
  for (const region of regions ?? []) {
    if (region.role === 'base') {
      total += region.range[1] - region.range[0];
    }
  }
  return total;
}
