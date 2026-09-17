import { Theme } from '@radix-ui/themes';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { MapPreview } from './map-preview';
import type { MapRenderer } from '../../utils/map-renderer';
import { HeaderActionsProvider, useHeaderActions } from '../header';

function createOnReady(): (renderer: MapRenderer | undefined) => void {
  return renderer => {
    if (!renderer) {
      return;
    }
    renderer.start({ width: 4, height: 4 });
    renderer.add('world-shape', new Uint8Array(16).fill(1));
  };
}

function renderPreview() {
  return render(
    <Theme>
      <MapPreview onReady={createOnReady()} progressKey={0} />
    </Theme>
  );
}

function FullscreenBridge() {
  const { setIsFullscreen } = useHeaderActions();

  return (
    <button type='button' onClick={() => setIsFullscreen(true)}>
      Enter fullscreen
    </button>
  );
}

function expectPosition(x: number, y: number): void {
  expect(screen.getByText(`X ${x} cell`)).toBeInTheDocument();
  expect(screen.getByText(`Y ${y} cell`)).toBeInTheDocument();
}

describe('MapPreview readout', () => {
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
    expectPosition(1, 1);
    expect(screen.getByText('Inside')).toBeInTheDocument();

    fireEvent.pointerDown(canvas, { button: 0, clientX: 100, clientY: 100 });
    expect(screen.getByRole('group', { name: 'Cursor readout (pinned)' })).toBeInTheDocument();

    fireEvent.pointerMove(canvas, { clientX: 300, clientY: 300 });
    expectPosition(1, 1);

    fireEvent.pointerLeave(canvas);
    expectPosition(1, 1);

    fireEvent.pointerDown(canvas, { button: 0, clientX: 300, clientY: 300 });
    expectPosition(3, 3);
    expect(screen.getByRole('group', { name: 'Cursor readout' })).toBeInTheDocument();
  });

  it('tracks a touch drag on the map without pinning', async () => {
    renderPreview();
    const canvas = screen.getByLabelText('Generated map preview');
    await act(async () => {});

    fireEvent.pointerDown(canvas, { button: 0, pointerType: 'touch', clientX: 100, clientY: 100 });
    fireEvent.pointerMove(canvas, { pointerType: 'touch', clientX: 300, clientY: 300 });
    fireEvent.pointerUp(canvas, { button: 0, pointerType: 'touch', clientX: 300, clientY: 300 });

    expectPosition(3, 3);
    expect(screen.getByRole('group', { name: 'Cursor readout' })).toBeInTheDocument();
  });

  it('pins on a touch tap and unpins on the next tap', async () => {
    renderPreview();
    const canvas = screen.getByLabelText('Generated map preview');
    await act(async () => {});

    fireEvent.pointerDown(canvas, { button: 0, pointerType: 'touch', clientX: 100, clientY: 100 });
    fireEvent.pointerUp(canvas, { button: 0, pointerType: 'touch', clientX: 100, clientY: 100 });
    expectPosition(1, 1);
    expect(screen.getByRole('group', { name: 'Cursor readout (pinned)' })).toBeInTheDocument();

    fireEvent.pointerDown(canvas, { button: 0, pointerType: 'touch', clientX: 300, clientY: 300 });
    fireEvent.pointerUp(canvas, { button: 0, pointerType: 'touch', clientX: 300, clientY: 300 });
    expectPosition(3, 3);
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

    expectPosition(1, 1);
    expect(screen.getByRole('group', { name: 'Cursor readout (pinned)' })).toBeInTheDocument();
  });

  it('keeps the touch readout after the finger leaves the canvas', async () => {
    renderPreview();
    const canvas = screen.getByLabelText('Generated map preview');
    await act(async () => {});

    fireEvent.pointerDown(canvas, { button: 0, pointerType: 'touch', clientX: 100, clientY: 100 });
    fireEvent.pointerLeave(canvas, { pointerType: 'touch' });

    expectPosition(1, 1);
  });

  it('freezes the readout over the panels and clears it outside the preview', async () => {
    renderPreview();
    const canvas = screen.getByLabelText('Generated map preview');
    await act(async () => {});

    fireEvent.pointerMove(canvas, { clientX: 100, clientY: 100 });
    expectPosition(1, 1);

    fireEvent.pointerOut(canvas, {
      relatedTarget: screen.getByRole('group', { name: 'Cursor readout' }),
    });
    expectPosition(1, 1);

    const card = canvas.closest('.rt-Card');
    expect(card).not.toBeNull();
    fireEvent.pointerOut(card as HTMLElement, { relatedTarget: document.body });

    expect(screen.queryByText('X 1 cell')).toBeNull();
    expect(screen.queryByText('Inside')).toBeNull();
  });

  it('moves focus into the overlay when fullscreen opens', async () => {
    const user = userEvent.setup();
    render(
      <Theme>
        <HeaderActionsProvider>
          <FullscreenBridge />
          <MapPreview onReady={createOnReady()} progressKey={0} />
        </HeaderActionsProvider>
      </Theme>
    );
    await act(async () => {});

    await user.click(screen.getByRole('button', { name: 'Enter fullscreen' }));

    const overlay = screen.getByLabelText('Generated map preview').closest('.rt-Card');
    expect(overlay).toHaveFocus();
  });
});
