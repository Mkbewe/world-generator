import { createRef } from 'react';
import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';

import { MapCanvas, type MapCanvasHandlers } from './map-canvas';

const HANDLERS: MapCanvasHandlers = {
  onPointerMove: () => {},
  onPointerDown: () => {},
  onPointerUp: () => {},
  onPointerCancel: () => {},
};

function renderCanvas(ready: boolean) {
  const props = {
    wrapperRef: createRef<HTMLDivElement>(),
    canvasRef: createRef<HTMLCanvasElement>(),
    overlayRef: createRef<HTMLCanvasElement>(),
    handlers: HANDLERS,
  };

  return {
    ...render(
      <Theme>
        <MapCanvas {...props} ready={ready} />
      </Theme>
    ),
    props,
  };
}

describe('MapCanvas', () => {
  it('shows the placeholder until a map is ready', () => {
    const { rerender, props } = renderCanvas(false);

    expect(screen.getByText('Generate a map to see the preview.')).toBeInTheDocument();
    expect(screen.getByLabelText('Generated map preview')).not.toHaveAttribute('data-ready');

    rerender(
      <Theme>
        <MapCanvas {...props} ready />
      </Theme>
    );

    expect(screen.queryByText('Generate a map to see the preview.')).toBeNull();
    expect(screen.getByLabelText('Generated map preview')).toHaveAttribute('data-ready');
  });

  it('renders the overlay canvas hidden from assistive tech', () => {
    const { container } = renderCanvas(true);

    const canvases = container.querySelectorAll('canvas');
    expect(canvases).toHaveLength(2);
    expect(canvases[1]).toHaveAttribute('aria-hidden', 'true');
  });
});
