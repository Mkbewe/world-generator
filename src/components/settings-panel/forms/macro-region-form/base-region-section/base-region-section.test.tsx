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

  it('shows the base regions with the share editor and tabs', () => {
    renderSection();

    expect(screen.getByText('Base regions (4)')).toBeInTheDocument();
    expect(screen.getByLabelText('Region width distribution')).toBeInTheDocument();
    expect(within(screen.getByLabelText('Region boundaries')).getAllByRole('slider')).toHaveLength(
      3
    );
    expect(screen.getByText('Ring thickness')).toBeInTheDocument();
    expect(screen.getAllByRole('tab')).toHaveLength(4);
    expect(screen.getByRole('tab', { name: 'Region 1' })).toHaveAttribute('aria-selected', 'true');
    expect(within(screen.getByLabelText('Danger')).getByRole('slider')).toBeInTheDocument();
  });

  it('edits the region chosen on the tabs', async () => {
    const user = userEvent.setup();
    renderSection();

    await user.click(screen.getByRole('tab', { name: 'Region 3' }));

    expect(screen.getByRole('tab', { name: 'Region 3' })).toHaveAttribute('aria-selected', 'true');
    const label = screen.getByLabelText('Region label');
    await user.clear(label);
    await user.type(label, 'Wasteland');

    expect(useMacroRegionFormStore.getState().regions[2].label).toBe('Wasteland');
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
    expect(screen.getByText('40%')).toBeInTheDocument();
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
    expect(screen.getAllByRole('tab')).toHaveLength(5);
  });

  it('stops adding regions at the limit', () => {
    while (useMacroRegionFormStore.getState().regions.length < 10) {
      useMacroRegionFormStore.getState().addBaseRegion();
    }
    renderSection();

    expect(screen.getByRole('button', { name: /Add region/ })).toBeDisabled();
  });
});
