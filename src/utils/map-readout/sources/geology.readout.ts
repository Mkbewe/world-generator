import { formatArea } from '../../format';
import {
  type GeologyInfo,
  type GeologyRegionInfo,
  isGeologyInfo,
} from '../../map-generator/info-definitions';
import { defineVectorReadout, type ReadoutInfo, type ReadoutItem } from '../contracts';

function parseGeology(info: ReadoutInfo): GeologyInfo | undefined {
  const plan: unknown = info.geologyPlan;
  return isGeologyInfo(plan) ? plan : undefined;
}

/** Readout of the geological region under the pointer. */
export const geologyReadout = defineVectorReadout('geology', parseGeology, (plan, inspection) => {
  const hit = inspection.hit;
  if (!hit || !plan) {
    return undefined;
  }
  const region = plan.regions.find(candidate => candidate.id === hit.id);
  if (!region) {
    return undefined;
  }
  return [
    { id: 'region', labelKey: 'readout.region', value: region.id },
    { id: 'type', labelKey: 'readout.type', value: { key: `readout.${region.type}` } },
    {
      id: 'character',
      labelKey: 'readout.character',
      value: { key: `readout.${region.type}Description` },
    },
    ...areaItems(region, plan.worldAreaSquareMeters),
    {
      id: 'edit-region',
      labelKey: 'readout.editRegion',
      value: '',
      action: { id: 'edit-region', labelKey: 'readout.editRegion' },
    },
  ];
});

/** Rasterized area of the region and its share of the world, when measured. */
function areaItems(region: GeologyRegionInfo, worldArea?: number): readonly ReadoutItem[] {
  if (region.areaSquareMeters === undefined) {
    return [];
  }
  const share =
    worldArea !== undefined && worldArea > 0
      ? ((region.areaSquareMeters / worldArea) * 100).toFixed(1)
      : '';
  return [
    {
      id: 'area',
      labelKey: 'readout.area',
      ...(share
        ? {
            value: {
              key: 'readout.areaShare',
              params: { area: formatArea(region.areaSquareMeters), share },
            },
          }
        : { value: formatArea(region.areaSquareMeters) }),
    },
  ];
}
