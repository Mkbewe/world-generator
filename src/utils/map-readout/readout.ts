import { EMPTY, oceanCurrentText } from './format/readout-format';
import { measurementMeters } from './measure/pointer-distance';
import { positionLines } from './measure/position';
import { worldDimensions } from './measure/world-dimensions';
import type {
  InspectorReadout,
  Measurement,
  ReadoutContext,
  ReadoutInfo,
  ReadoutInspection,
  ReadoutItem,
  ReadoutOptions,
  ReadoutOverlayInspection,
} from './contracts';
import type { ReadoutRegistry } from './registry';
import { formatDistance } from '../format';
import { createWorldSpace } from '../map-generator/space';
import { findOverlayDescriptor } from '../map-layers';

export type {
  InspectorReadout,
  Measurement,
  PointerSample,
  ReadoutItem,
  ReadoutOptions,
} from './contracts';

/** Builds the readout renderer once; the registry is the only dispatch point. */
export function createReadoutRenderer(registry: ReadoutRegistry) {
  return function readoutItems(
    readout: InspectorReadout | undefined,
    info: ReadoutInfo = {},
    measurement?: Measurement,
    options: ReadoutOptions = {}
  ): readonly ReadoutItem[] {
    const context = createContext(info, options);
    const measured = measurement ? measuredItem(measurement, context) : undefined;
    const items: ReadoutItem[] = [
      {
        id: 'position',
        labelKey: 'readout.position',
        value: EMPTY,
        lines: readout ? positionLines(readout.position, context.dimensions) : undefined,
        separated: measured === undefined,
      },
      ...(measured ? [measured] : []),
      ...inspectionItems(readout?.inspection, context, registry),
      ...overlayItems(readout?.overlays ?? []),
    ];
    return options.actions === false ? items.filter(item => item.action === undefined) : items;
  };
}

function createContext(info: ReadoutInfo, options: ReadoutOptions): ReadoutContext {
  const dimensions = worldDimensions(info);
  return {
    info,
    dimensions,
    space: dimensions ? createWorldSpace(dimensions) : undefined,
    options,
  };
}

/** Total distance of an active measurement, in the fitting unit. */
function measuredItem(measurement: Measurement, context: ReadoutContext): ReadoutItem | undefined {
  if (!context.space) {
    return undefined;
  }
  const total = measurementMeters(context.space, measurement);
  if (total <= 0) {
    return undefined;
  }
  return {
    id: 'distance',
    labelKey: 'readout.distance',
    value: formatDistance(total),
    separated: true,
  };
}

function inspectionItems(
  inspection: ReadoutInspection | undefined,
  context: ReadoutContext,
  registry: ReadoutRegistry
): readonly ReadoutItem[] {
  if (!inspection) {
    return [defaultItem(undefined)];
  }
  const items = registry.get(inspection.layerId)?.read(inspection, context);
  return items ?? [defaultItem(inspection)];
}

/** Single fallback for layers without a descriptor or with an unreadable sample. */
function defaultItem(inspection: ReadoutInspection | undefined): ReadoutItem {
  if (inspection?.kind === 'vector') {
    return { id: 'name', labelKey: 'readout.name', value: inspection.hit?.id ?? EMPTY };
  }
  return { id: 'value', labelKey: 'readout.value', value: EMPTY };
}

function overlayItems(overlays: readonly ReadoutOverlayInspection[]): readonly ReadoutItem[] {
  if (overlays.length === 0) {
    return [];
  }
  return [
    { id: 'overlays', labelKey: 'readout.overlays', value: '', heading: true, detached: true },
    ...overlays.flatMap(overlay => {
      const descriptor = findOverlayDescriptor(overlay.overlayId);
      if (!descriptor) {
        return [];
      }
      return [
        {
          id: `overlay-${overlay.overlayId}`,
          labelKey: descriptor.labelKey,
          value: overlay.oceanCurrent
            ? oceanCurrentText(overlay.oceanCurrent.angle, overlay.oceanCurrent.strength)
            : overlay.value,
        },
      ];
    }),
  ];
}
