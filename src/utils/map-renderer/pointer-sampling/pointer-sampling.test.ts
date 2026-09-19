import { pointerAnchor, samplePointer } from './index';
import { fitView } from '../view/view-transform';

function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function mockRect(left: number, top: number, width: number, height: number): void {
  vi.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect').mockReturnValue({
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    x: left,
    y: top,
    toJSON: () => ({}),
  } as DOMRect);
}

describe('pointer sampling', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('scales client coordinates into canvas pixels', () => {
    mockRect(10, 20, 400, 200);
    const canvas = createCanvas(8, 2);

    expect(pointerAnchor(canvas, 210, 120)).toEqual({ x: 4, y: 1 });
  });

  it('ignores empty rectangles', () => {
    mockRect(0, 0, 0, 10);

    expect(pointerAnchor(createCanvas(4, 4), 0, 0)).toBeUndefined();
  });

  it('maps a client point only inside the projected map', () => {
    mockRect(0, 0, 400, 200);
    const canvas = createCanvas(4, 2);
    const size = { width: 2, height: 2 };

    expect(samplePointer(canvas, size, fitView(), 200, 100)).toEqual({
      x: 1,
      y: 1,
      u: 0.5,
      v: 0.5,
    });
    expect(samplePointer(canvas, size, fitView(), 50, 100)).toBeUndefined();
    expect(samplePointer(canvas, size, fitView(), 350, 100)).toBeUndefined();
  });
});
