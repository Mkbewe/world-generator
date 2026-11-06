import type { OverlayFrame, OverlayRenderer } from './overlay-renderer';
import { compilePalette, MOISTURE_STOPS } from '../../../map-layers';
import { projectWithPadding } from '../../preview-targets';

/** Alpha of the moisture tint over the base map. */
const MOISTURE_ALPHA = 125;

interface MoistureSource {
  readonly map: Float32Array;
  readonly world: OverlayFrame['world'];
  readonly canvas: HTMLCanvasElement;
}

/** Paints the independent base moisture as a translucent ramp overlay. */
export class MoistureOverlayRenderer implements OverlayRenderer {
  readonly id = 'moisture' as const;
  private source?: MoistureSource;

  isAvailable(frame: OverlayFrame): boolean {
    const map = frame.data.moistureBaseMap;
    return (
      map instanceof Float32Array && map.length === frame.world.size.width * frame.world.size.height
    );
  }

  render(frame: OverlayFrame): void {
    const source = this.sourceFor(frame);
    if (!source) {
      return;
    }
    const context = frame.canvas.getContext('2d');
    if (!context) {
      throw new Error('Overlay canvas is not available.');
    }
    const projection = projectWithPadding(
      frame.view,
      frame.world.size,
      { width: frame.canvas.width, height: frame.canvas.height },
      frame.viewport.devicePixelRatio
    );

    context.save();
    context.imageSmoothingEnabled = true;
    context.drawImage(
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
    context.restore();
  }

  private sourceFor(frame: OverlayFrame): MoistureSource | undefined {
    const map = frame.data.moistureBaseMap;
    if (!(map instanceof Float32Array)) {
      return undefined;
    }
    const cached = this.source;
    if (cached?.map === map && cached.world === frame.world) {
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
    paintMoisturePixels(image.data, map, frame.world);
    context.putImageData(image, 0, 0);

    const source = { map, world: frame.world, canvas };
    this.source = source;
    return source;
  }
}

/** Writes opaque ramp colours clipped to the world; alpha is applied here. */
export function paintMoisturePixels(
  pixels: Uint8ClampedArray,
  map: Float32Array,
  world: OverlayFrame['world']
): void {
  const writePixel = compilePalette({ kind: 'ramp', stops: MOISTURE_STOPS });
  const { width, height } = world.size;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!world.contains(x, y)) {
        continue;
      }
      const index = y * width + x;
      const offset = index * 4;
      writePixel(pixels, offset, map[index] ?? 0);
      pixels[offset + 3] = MOISTURE_ALPHA;
    }
  }
}
