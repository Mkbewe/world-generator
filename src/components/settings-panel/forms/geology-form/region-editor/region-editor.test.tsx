import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { RegionEditor } from './region-editor';
import type { GeologicalRegionConfig } from '../../../../../utils/map-generator/types';

const LAGOON: GeologicalRegionConfig = {
  type: 'lagoon',
  size: 0.8,
};

describe('RegionEditor', () => {
  it('shows the type and character of the region', () => {
    render(
      <Theme>
        <RegionEditor index={2} region={LAGOON} onChange={() => {}} />
      </Theme>
    );

    expect(screen.getByText('Region 3')).toBeInTheDocument();
    expect(
      screen.getByText('Character: Low reef rings, lagoons and sandy islets')
    ).toBeInTheDocument();
  });

  it('leaves the terrain sliders to the heightmap form', () => {
    render(
      <Theme>
        <RegionEditor index={0} region={LAGOON} onChange={() => {}} />
      </Theme>
    );

    expect(screen.queryAllByRole('slider')).toHaveLength(0);
    expect(screen.queryByText('Land share')).not.toBeInTheDocument();
  });

  it('patches the type without touching other fields', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <Theme>
        <RegionEditor index={0} region={LAGOON} onChange={onChange} />
      </Theme>
    );

    await user.click(screen.getAllByText('Volcanic')[0] ?? screen.getByText('Volcanic'));

    expect(onChange).toHaveBeenCalledWith({ type: 'volcanic' });
  });
});
