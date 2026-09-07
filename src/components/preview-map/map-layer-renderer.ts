import type { MapBaseLayerId, MapOverlayId, PreviewMapLayers } from './map-layers';

const SHAPE_COLOR = [16, 42, 67] as const;
const BOUNDARY_COLOR = [100, 255, 218] as const;

export function renderMapLayers(
  canvas: HTMLCanvasElement,
  layers: PreviewMapLayers,
  baseLayer: MapBaseLayerId,
  overlays: readonly MapOverlayId[]
): void {
  const context = canvas.getContext('2d');
  if (!context) {
    return;
  }

  const imageData = context.createImageData(canvas.width, canvas.height);
  const worldMask = layers.worldMask;
  const noiseMap = layers.noiseMap;
  for (let index = 0; index < imageData.data.length; index += 4) {
    const cellIndex = index / 4;
    const isInsideWorld = worldMask?.[cellIndex] === 1;
    const color = getBaseColor(baseLayer, cellIndex, isInsideWorld, noiseMap);

    if (color) {
      setPixel(imageData.data, index, color, 255);
    }

    if (
      overlays.includes('world-boundary') &&
      worldMask &&
      isBoundary(worldMask, cellIndex, canvas.width, canvas.height)
    ) {
      setPixel(imageData.data, index, BOUNDARY_COLOR, 230);
    }
  }

  context.putImageData(imageData, 0, 0);
}

function getBaseColor(
  baseLayer: MapBaseLayerId,
  index: number,
  isInsideWorld: boolean,
  noiseMap: Float32Array | undefined
): readonly [number, number, number] | undefined {
  if (!isInsideWorld) {
    return undefined;
  }

  if (baseLayer === 'world-shape') {
    return SHAPE_COLOR;
  }

  if (!noiseMap) {
    return undefined;
  }

  const value = Math.round(noiseMap[index] * 255);
  return [value, value, value];
}

function isBoundary(worldMask: Uint8Array, index: number, width: number, height: number): boolean {
  const x = index % width;
  const y = Math.floor(index / width);

  return (
    worldMask[index] === 1 &&
    (x === 0 ||
      x === width - 1 ||
      y === 0 ||
      y === height - 1 ||
      worldMask[index - 1] === 0 ||
      worldMask[index + 1] === 0 ||
      worldMask[index - width] === 0 ||
      worldMask[index + width] === 0)
  );
}

function setPixel(
  data: Uint8ClampedArray,
  index: number,
  color: readonly [number, number, number],
  alpha: number
): void {
  data[index] = color[0];
  data[index + 1] = color[1];
  data[index + 2] = color[2];
  data[index + 3] = alpha;
}
