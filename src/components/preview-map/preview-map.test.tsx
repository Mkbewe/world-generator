import { Theme } from '@radix-ui/themes';
import { act, fireEvent, render, screen } from '@testing-library/react';

import { PreviewMap } from './preview-map';
import type { MapRenderer } from '../../utils/map-renderer';

function renderPreview(): void {
  const onReady = (renderer: MapRenderer | undefined): void => {
    if (!renderer) {
      return;
    }
    renderer.start({ width: 4, height: 4 });
    renderer.add('world-shape', new Uint8Array(16).fill(1));
  };
  render(
    <Theme>
      <PreviewMap onReady={onReady} progressKey={0} />
    </Theme>
  );
}

describe('PreviewMap readout', () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      createImageData: (width: number, height: number) => ({
        data: new Uint8ClampedArray(width * height * 4),
      }),
      putImageData: vi.fn(),
      clearRect: vi.fn(),
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 400,
      height: 400,
      right: 400,
      bottom: 400,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('follows the pointer and pins the readout until the next click', async () => {
    renderPreview();
    const canvas = screen.getByLabelText('Generated map preview');
    await act(async () => {});

    fireEvent.pointerMove(canvas, { clientX: 100, clientY: 100 });
    expect(screen.getByText('X 1, Y 1')).toBeInTheDocument();
    expect(screen.getByText('Inside')).toBeInTheDocument();

    fireEvent.pointerDown(canvas, { button: 0, clientX: 100, clientY: 100 });
    expect(screen.getByRole('group', { name: 'Cursor readout (pinned)' })).toBeInTheDocument();

    fireEvent.pointerMove(canvas, { clientX: 300, clientY: 300 });
    expect(screen.getByText('X 1, Y 1')).toBeInTheDocument();

    fireEvent.pointerLeave(canvas);
    expect(screen.getByText('X 1, Y 1')).toBeInTheDocument();

    fireEvent.pointerDown(canvas, { button: 0, clientX: 300, clientY: 300 });
    expect(screen.getByText('X 3, Y 3')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Cursor readout' })).toBeInTheDocument();
  });

  it('tracks a touch drag on the map without pinning', async () => {
    renderPreview();
    const canvas = screen.getByLabelText('Generated map preview');
    await act(async () => {});

    fireEvent.pointerDown(canvas, { button: 0, pointerType: 'touch', clientX: 100, clientY: 100 });
    fireEvent.pointerMove(canvas, { pointerType: 'touch', clientX: 300, clientY: 300 });
    fireEvent.pointerUp(canvas, { button: 0, pointerType: 'touch', clientX: 300, clientY: 300 });

    expect(screen.getByText('X 3, Y 3')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Cursor readout' })).toBeInTheDocument();
  });

  it('pins on a touch tap and unpins on the next tap', async () => {
    renderPreview();
    const canvas = screen.getByLabelText('Generated map preview');
    await act(async () => {});

    fireEvent.pointerDown(canvas, { button: 0, pointerType: 'touch', clientX: 100, clientY: 100 });
    fireEvent.pointerUp(canvas, { button: 0, pointerType: 'touch', clientX: 100, clientY: 100 });
    expect(screen.getByText('X 1, Y 1')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Cursor readout (pinned)' })).toBeInTheDocument();

    fireEvent.pointerDown(canvas, { button: 0, pointerType: 'touch', clientX: 300, clientY: 300 });
    fireEvent.pointerUp(canvas, { button: 0, pointerType: 'touch', clientX: 300, clientY: 300 });
    expect(screen.getByText('X 3, Y 3')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Cursor readout' })).toBeInTheDocument();
  });

  it('keeps a pinned touch readout frozen while the finger moves', async () => {
    renderPreview();
    const canvas = screen.getByLabelText('Generated map preview');
    await act(async () => {});

    fireEvent.pointerDown(canvas, { button: 0, pointerType: 'touch', clientX: 100, clientY: 100 });
    fireEvent.pointerUp(canvas, { button: 0, pointerType: 'touch', clientX: 100, clientY: 100 });
    fireEvent.pointerDown(canvas, { button: 0, pointerType: 'touch', clientX: 300, clientY: 300 });
    fireEvent.pointerMove(canvas, { pointerType: 'touch', clientX: 350, clientY: 350 });
    fireEvent.pointerUp(canvas, { button: 0, pointerType: 'touch', clientX: 350, clientY: 350 });

    expect(screen.getByText('X 1, Y 1')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Cursor readout (pinned)' })).toBeInTheDocument();
  });

  it('keeps the touch readout after the finger leaves the canvas', async () => {
    renderPreview();
    const canvas = screen.getByLabelText('Generated map preview');
    await act(async () => {});

    fireEvent.pointerDown(canvas, { button: 0, pointerType: 'touch', clientX: 100, clientY: 100 });
    fireEvent.pointerLeave(canvas, { pointerType: 'touch' });

    expect(screen.getByText('X 1, Y 1')).toBeInTheDocument();
  });
});
