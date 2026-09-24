import { Theme } from '@radix-ui/themes';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { BaseRegionSection } from './base-region-section';
import { MACRO_REGION_FORM_DEFAULTS, useMacroRegionFormStore } from '../../../../../stores';
import { regionSegments } from '../../../../../utils/map-generator/stages/macro-region/editor/boundary-model';

function renderSection() {
  render(
    <Theme>
      <BaseRegionSection />
    </Theme>
  );
}

/** Gives the distribution bar a measurable track for pointer drags. */
function mockTrackRect(): void {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    left: 0,
    top: 0,
    width: 100,
    height: 32,
    right: 100,
    bottom: 32,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect);
}

describe('BaseRegionSection', () => {
  beforeEach(() => {
    useMacroRegionFormStore.setState({ ...MACRO_REGION_FORM_DEFAULTS });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows the base regions with the shared distribution editor', () => {
    renderSection();

    expect(screen.getByText('Base regions (4)')).toBeInTheDocument();
    expect(screen.getByLabelText('Region width distribution')).toBeInTheDocument();
    expect(within(screen.getByLabelText('Region boundaries')).getAllByRole('slider')).toHaveLength(
      3
    );
    expect(screen.getAllByText('Width')).toHaveLength(4);
  });

  it('resizes regions with the keyboard on a boundary handle', async () => {
    const user = userEvent.setup();
    renderSection();

    const [firstHandle] = within(screen.getByLabelText('Region boundaries')).getAllByRole('slider');
    firstHandle.focus();
    await user.keyboard('{ArrowRight}');

    const segments = regionSegments('radial', useMacroRegionFormStore.getState().regions);
    expect(segments[0].percent).toBe(26);
    expect(segments[1].percent).toBe(24);
  });

  it('previews a drag locally and commits the boundaries on pointer up', () => {
    mockTrackRect();
    renderSection();

    const [firstHandle] = within(screen.getByLabelText('Region boundaries')).getAllByRole('slider');

    fireEvent.pointerDown(firstHandle, { pointerId: 1, clientX: 30 });
    fireEvent.pointerMove(firstHandle, { pointerId: 1, clientX: 40 });

    expect(firstHandle).toHaveAttribute('aria-valuenow', '40');
    expect(screen.getAllByText('40%')).toHaveLength(2);
    expect(regionSegments('radial', useMacroRegionFormStore.getState().regions)[0].percent).toBe(
      25
    );

    fireEvent.pointerUp(firstHandle, { pointerId: 1, clientX: 40 });

    expect(
      regionSegments('radial', useMacroRegionFormStore.getState().regions).map(
        segment => segment.percent
      )
    ).toEqual([40, 10, 25, 25]);
  });

  it('discards the drag on pointer cancel', () => {
    mockTrackRect();
    renderSection();

    const [firstHandle] = within(screen.getByLabelText('Region boundaries')).getAllByRole('slider');

    fireEvent.pointerDown(firstHandle, { pointerId: 1, clientX: 30 });
    fireEvent.pointerMove(firstHandle, { pointerId: 1, clientX: 40 });
    fireEvent.pointerCancel(firstHandle, { pointerId: 1, clientX: 40 });

    expect(regionSegments('radial', useMacroRegionFormStore.getState().regions)[0].percent).toBe(
      25
    );
  });

  it('adds a base region', async () => {
    const user = userEvent.setup();
    renderSection();

    await user.click(screen.getByRole('button', { name: /Add region/ }));

    expect(screen.getByText('Base regions (5)')).toBeInTheDocument();
  });

  it('stops adding regions at the limit', () => {
    while (useMacroRegionFormStore.getState().regions.length < 10) {
      useMacroRegionFormStore.getState().addBaseRegion();
    }
    renderSection();

    expect(screen.getByRole('button', { name: /Add region/ })).toBeDisabled();
  });
});
