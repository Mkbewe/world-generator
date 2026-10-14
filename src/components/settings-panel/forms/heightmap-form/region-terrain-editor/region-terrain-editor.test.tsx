import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { RegionTerrainEditor } from './region-terrain-editor';
import type { RegionTerrainConfig } from '../../../../../utils/map-generator/types';

const TERRAIN: RegionTerrainConfig = {
  landShare: 0.3,
  concentration: 0.6,
  age: 0.5,
  mountainousness: 0.5,
};

describe('RegionTerrainEditor', () => {
  it('shows the region number and the character of its type', () => {
    render(
      <Theme>
        <RegionTerrainEditor index={2} type='lagoon' terrain={TERRAIN} onChange={() => {}} />
      </Theme>
    );

    expect(screen.getByText('Region 3 — Lagoon')).toBeInTheDocument();
    expect(screen.getByText('Low reef rings, lagoons and sandy islets')).toBeInTheDocument();
  });

  it('shows only the terrain sliders its region type supports', () => {
    render(
      <Theme>
        <RegionTerrainEditor index={0} type='lagoon' terrain={TERRAIN} onChange={() => {}} />
      </Theme>
    );

    expect(screen.getAllByRole('slider')).toHaveLength(3);
    expect(screen.getByText('Land share')).toBeInTheDocument();
    expect(screen.getByText('Land concentration')).toBeInTheDocument();
    expect(screen.getByText('Geological age')).toBeInTheDocument();
    expect(screen.queryByText('Mountainousness')).not.toBeInTheDocument();
  });

  it('shows mountainousness for ordinary regions', () => {
    render(
      <Theme>
        <RegionTerrainEditor index={0} type='ordinary' terrain={TERRAIN} onChange={() => {}} />
      </Theme>
    );

    expect(screen.getByText('Mountainousness')).toBeInTheDocument();
    expect(screen.getAllByRole('slider')).toHaveLength(4);
  });

  it('patches a single terrain value from the slider', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <Theme>
        <RegionTerrainEditor index={0} type='lagoon' terrain={TERRAIN} onChange={onChange} />
      </Theme>
    );

    const landShare = screen.getAllByRole('slider')[0];
    if (!landShare) {
      throw new Error('The land share slider is missing.');
    }
    landShare.focus();
    await user.keyboard('{ArrowRight}');

    expect(onChange).toHaveBeenCalledWith({ landShare: expect.closeTo(0.35, 6) });
  });
});
