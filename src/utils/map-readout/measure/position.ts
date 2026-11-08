import { cellOriginMeters, type WorldDimensions } from '../../world-dimensions';
import type { PointerSample, ReadoutLine } from '../contracts';
import { formatMeters } from '../format/readout-format';

/** Pixel coordinates with the cell origin in meters when dimensions are known. */
export function positionLines(
  position: PointerSample,
  dimensions: WorldDimensions | undefined
): readonly ReadoutLine[] {
  const lines: ReadoutLine[] = [
    { labelKey: 'readout.position', x: `X ${position.x} cell`, y: `Y ${position.y} cell` },
  ];
  if (dimensions) {
    const meters = cellOriginMeters(dimensions, position.x, position.y);
    lines.push({
      x: `X ${formatMeters(meters.xMeters)} m`,
      y: `Y ${formatMeters(meters.yMeters)} m`,
    });
  }
  return lines;
}
