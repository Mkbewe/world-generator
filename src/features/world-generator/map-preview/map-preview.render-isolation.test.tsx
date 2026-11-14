import { Theme } from '@radix-ui/themes';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MapPreview } from './map-preview';
import { MapSidebar } from './map-sidebar';
import { HeaderActionsProvider } from '../../../components/header';
import {
  PREVIEW_DEFAULTS,
  usePreviewStore,
  useViewSyncStore,
  VIEW_SYNC_DEFAULTS,
} from '../../../stores';
import type { MapRenderer } from '../../../utils/map-renderer';

vi.mock('./map-sidebar', async importOriginal => {
  const actual = await importOriginal<{ MapSidebar: typeof MapSidebar }>();
  return {
    ...actual,
    MapSidebar: vi.fn(actual.MapSidebar),
  };
});

function createOnReady(): (renderer: MapRenderer | undefined) => void {
  return renderer => {
    if (!renderer) {
      return;
    }
    renderer.start({ width: 4, height: 4 }, 'disc');
    renderer.add('world-shape', new Uint8Array(16).fill(1));
  };
}

describe('MapPreview render isolation', () => {
  beforeEach(() => {
    usePreviewStore.setState({ ...PREVIEW_DEFAULTS });
    useViewSyncStore.setState({ ...VIEW_SYNC_DEFAULTS });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      createImageData: (width: number, height: number) => ({
        data: new Uint8ClampedArray(width * height * 4),
      }),
      putImageData: vi.fn(),
      clearRect: vi.fn(),
      drawImage: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      ellipse: vi.fn(),
      rect: vi.fn(),
      clip: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      arc: vi.fn(),
      stroke: vi.fn(),
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

  it('does not rerender the sidebar when only the readout changes', async () => {
    const sidebar = vi.mocked(MapSidebar);

    render(
      <Theme>
        <HeaderActionsProvider>
          <MapPreview onReady={createOnReady()} progressKey={0} />
        </HeaderActionsProvider>
      </Theme>
    );
    const canvas = screen.getByLabelText('Generated map preview');
    await act(async () => {});
    sidebar.mockClear();

    fireEvent.pointerMove(canvas, { clientX: 100, clientY: 100 });

    expect(screen.getByText('X 1 cell')).toBeInTheDocument();
    expect(sidebar).not.toHaveBeenCalled();
  });
});
