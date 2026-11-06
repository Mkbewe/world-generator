import type { OverlayFrame, OverlayRenderer } from './overlay-renderer';
import { type HeatZoneInfo, isHeatZoneInfoList } from '../../../map-generator/info-definitions';
import { heatZoneColor } from '../../../map-layers';
import { projectWithPadding } from '../../preview-targets';

/** Alpha of the zone fill over the base map. */
const ZONE_ALPHA = 140;

interface HeatZoneSource {
  readonly map: Int16Array;
  readonly zones: readonly HeatZoneInfo[];
  readonly canvas: HTMLCanvasElement;
}

/** Paints the BaseClimate zones as a translucent screen-space overlay. */
export class HeatZoneOverlayRenderer implements OverlayRenderer {
  readonly id = 'heat-zones' as const;
  private source?: HeatZoneSource;

  isAvailable(frame: OverlayFrame): boolean {
    const map = frame.data.heatZoneMap;
    return (
      map instanceof Int16Array && map.length === frame.world.size.width * frame.world.size.height
    );
  }

  render(frame: OverlayFrame): void {
    const destination = frame.canvas.getContext('2d');
    if (!destination) {
      throw new Error('Overlay canvas is not available.');
    }
    const source = this.sourceFor(frame);
    if (!source) {
      return;
    }
    const projection = projectWithPadding(
      frame.view,
      frame.world.size,
      { width: frame.canvas.width, height: frame.canvas.height },
      frame.viewport.devicePixelRatio
    );

    destination.save();
    destination.imageSmoothingEnabled = true;
    destination.drawImage(
      source.canvas,
      0,
      0,
      source.canvas.width,
      source.canvas.height,
      projection.left,
      projection.top,
      projection.width,
      projection.height
    );
    destination.restore();
  }

  private sourceFor(frame: OverlayFrame): HeatZoneSource | undefined {
    const map = frame.data.heatZoneMap;
    const zones = frame.info.heatZoneInfo;
    if (!(map instanceof Int16Array) || !isHeatZoneInfoList(zones)) {
      return undefined;
    }
    const cached = this.source;
    if (cached?.map === map && cached.zones === zones) {
      return cached;
    }

    const canvas = document.createElement('canvas');
    canvas.width = frame.world.size.width;
    canvas.height = frame.world.size.height;
    const context = canvas.getContext('2d');
    if (!context) {
      return undefined;
    }
    const image = context.createImageData(canvas.width, canvas.height);
    paintHeatZonePixels(image.data, map, zones);
    context.putImageData(image, 0, 0);

    const source = { map, zones, canvas };
    this.source = source;
    return source;
  }
}

/** Writes the RGBA zone colours; exported for the pixel-level test. */
export function paintHeatZonePixels(
  pixels: Uint8ClampedArray,
  map: Int16Array,
  zones: readonly HeatZoneInfo[]
): void {
  for (let index = 0; index < map.length; index++) {
    const zone = map[index];
    if (zone === undefined || zone < 0) {
      continue;
    }
    const zoneInfo = zones[zone];
    if (!zoneInfo) {
      continue;
    }
    const color = heatZoneColor(zoneInfo.thermal, zoneInfo.id);
    const offset = index * 4;
    pixels[offset] = color[0];
    pixels[offset + 1] = color[1];
    pixels[offset + 2] = color[2];
    pixels[offset + 3] = ZONE_ALPHA;
  }
}
