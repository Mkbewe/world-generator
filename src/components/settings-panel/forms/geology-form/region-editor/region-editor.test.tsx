import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { RegionEditor } from './region-editor';
import type { GeologicalRegionConfig } from '../../../../../utils/map-generator/types';

const REGION: GeologicalRegionConfig = { type: 'atoll', size: 0.8 };

describe('RegionEditor', () => {
  it('shows the type and character of the region', () => {
    render(
      <Theme>
        <RegionEditor index={2} region={REGION} onChange={() => {}} />
      </Theme>
    );

    expect(screen.getByText('Region 3')).toBeInTheDocument();
    expect(screen.getByText('Character: Low reef platforms and lagoons')).toBeInTheDocument();
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
  });

  it('patches the type without touching other fields', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <Theme>
        <RegionEditor index={0} region={REGION} onChange={onChange} />
      </Theme>
    );

    await user.click(screen.getAllByText('Volcanic')[0] ?? screen.getByText('Volcanic'));

    expect(onChange).toHaveBeenCalledWith({ type: 'volcanic' });
  });
});
