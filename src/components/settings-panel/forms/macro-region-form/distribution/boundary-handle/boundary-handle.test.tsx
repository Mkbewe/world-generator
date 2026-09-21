import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { BoundaryHandle } from './boundary-handle';

const trackRect = {
  left: 0,
  top: 0,
  width: 100,
  height: 32,
  right: 100,
  bottom: 32,
  x: 0,
  y: 0,
  toJSON: () => ({}),
} as DOMRect;

function renderHandle() {
  const handlers = {
    onMove: vi.fn(),
    onStep: vi.fn(),
    onCommit: vi.fn(),
    onCancel: vi.fn(),
  };
  render(<BoundaryHandle boundary={25} index={0} {...handlers} />);
  return handlers;
}

describe('BoundaryHandle', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows its position and the shared limits', () => {
    renderHandle();

    const handle = screen.getByRole('slider');
    expect(handle).toHaveAttribute('aria-valuenow', '25');
    expect(handle).toHaveAttribute('aria-valuemin', '8');
    expect(handle).toHaveAttribute('aria-valuemax', '92');
  });

  it('reports pointer moves against the rect cached on pointer down', () => {
    const rect = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockReturnValue(trackRect);
    const handlers = renderHandle();
    const handle = screen.getByRole('slider');

    fireEvent.pointerDown(handle, { pointerId: 1, clientX: 30 });
    expect(handlers.onMove).toHaveBeenLastCalledWith(0, 30);

    rect.mockReturnValue({ ...trackRect, width: 200 } as DOMRect);
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 50 });

    expect(handlers.onMove).toHaveBeenLastCalledWith(0, 50);
  });

  it('ignores moves from a different pointer', () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(trackRect);
    const handlers = renderHandle();
    const handle = screen.getByRole('slider');

    fireEvent.pointerDown(handle, { pointerId: 1, clientX: 30 });
    fireEvent.pointerMove(handle, { pointerId: 2, clientX: 60 });

    expect(handlers.onMove).toHaveBeenCalledTimes(1);
  });

  it('commits on pointer up and cancels on pointer cancel', () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(trackRect);
    const handlers = renderHandle();
    const handle = screen.getByRole('slider');

    fireEvent.pointerDown(handle, { pointerId: 1, clientX: 30 });
    fireEvent.pointerUp(handle, { pointerId: 1, clientX: 30 });
    expect(handlers.onCommit).toHaveBeenCalledTimes(1);

    fireEvent.pointerDown(handle, { pointerId: 2, clientX: 30 });
    fireEvent.pointerCancel(handle, { pointerId: 2, clientX: 30 });
    expect(handlers.onCancel).toHaveBeenCalledTimes(1);
  });

  it('reports keyboard steps', async () => {
    const user = userEvent.setup();
    const handlers = renderHandle();
    const handle = screen.getByRole('slider');

    handle.focus();
    await user.keyboard('{ArrowLeft}');

    expect(handlers.onStep).toHaveBeenCalledWith(0, -1);
  });
});
