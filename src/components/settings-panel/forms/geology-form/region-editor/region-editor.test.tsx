import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { RegionEditor } from './region-editor';
import type { GeologicalRegionConfig } from '../../../../../utils/map-generator/types';

const ATOLL: GeologicalRegionConfig = {
  type: 'atoll',
  size: 0.8,
  concentration: 0.6,
  mountainousness: 0.5,
  landShare: 0.3,
};

const ORDINARY: GeologicalRegionConfig = {
  type: 'ordinary',
  size: 1,
  concentration: 0.5,
  mountainousness: 0.6,
  landShare: 0.45,
};

describe('RegionEditor', () => {
  it('shows the type and character of the region', () => {
    render(
      <Theme>
        <RegionEditor index={2} region={ATOLL} onChange={() => {}} />
      </Theme>
    );

    expect(screen.getByText('Region 3')).toBeInTheDocument();
    expect(screen.getByText('Character: Low reef platforms and lagoons')).toBeInTheDocument();
  });

  it('shows only the terrain sliders its region type supports', () => {
    render(
      <Theme>
        <RegionEditor index={0} region={ATOLL} onChange={() => {}} />
      </Theme>
    );

    expect(screen.getAllByRole('slider')).toHaveLength(2);
    expect(screen.getByText('Land concentration')).toBeInTheDocument();
    expect(screen.getByText('Land share')).toBeInTheDocument();
    expect(screen.queryByText('Mountainousness')).not.toBeInTheDocument();
  });

  it('shows mountainousness for ordinary regions', () => {
    render(
      <Theme>
        <RegionEditor index={0} region={ORDINARY} onChange={() => {}} />
      </Theme>
    );

    expect(screen.getByText('Mountainousness')).toBeInTheDocument();
    expect(screen.getAllByRole('slider')).toHaveLength(3);
  });

  it('patches the type without touching other fields', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <Theme>
        <RegionEditor index={0} region={ATOLL} onChange={onChange} />
      </Theme>
    );

    await user.click(screen.getAllByText('Volcanic')[0] ?? screen.getByText('Volcanic'));

    expect(onChange).toHaveBeenCalledWith({ type: 'volcanic' });
  });

  it('patches a single terrain value from the slider', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <Theme>
        <RegionEditor index={0} region={ATOLL} onChange={onChange} />
      </Theme>
    );

    const concentration = screen.getAllByRole('slider')[0];
    if (!concentration) {
      throw new Error('The concentration slider is missing.');
    }
    concentration.focus();
    await user.keyboard('{ArrowRight}');

    expect(onChange).toHaveBeenCalledWith({ concentration: expect.closeTo(0.65, 6) });
  });
});
