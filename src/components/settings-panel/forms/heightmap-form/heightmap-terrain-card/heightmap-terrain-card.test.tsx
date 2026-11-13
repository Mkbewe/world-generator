import type { RegionTerrainConfig } from '@generator/types';
import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { HeightmapTerrainCard } from './heightmap-terrain-card';
import type { EditorCardSelectionControlsProps } from '../../../../editor-card-selection-controls';

const TERRAIN: RegionTerrainConfig = {
  landShare: 0.3,
  concentration: 0.6,
  clustering: 0.4,
  age: 0.5,
  mountainousness: 0.5,
  ringShare: 0.4,
};

const SELECTION: EditorCardSelectionControlsProps = {
  ids: ['region-1', 'region-2', 'region-3'],
  selectedId: 'region-3',
  onSelect: () => {},
};

function renderCard(overrides: { type?: 'lagoon' | 'ordinary'; onChange?: () => void } = {}) {
  return render(
    <Theme>
      <HeightmapTerrainCard
        index={2}
        type={overrides.type ?? 'lagoon'}
        terrain={TERRAIN}
        selection={SELECTION}
        onChange={overrides.onChange ?? (() => {})}
      />
    </Theme>
  );
}

describe('HeightmapTerrainCard', () => {
  it('shows the region number and the character of its type', () => {
    renderCard();

    expect(screen.getByText('Region 3 — Lagoon')).toBeInTheDocument();
    expect(screen.getByText('Low reef rings, lagoons and sandy islets')).toBeInTheDocument();
  });

  it('shows only the terrain sliders its region type supports', () => {
    renderCard();

    expect(screen.getAllByRole('slider')).toHaveLength(5);
    expect(screen.getByText('Land share')).toBeInTheDocument();
    expect(screen.getByText('Island division')).toBeInTheDocument();
    expect(screen.getByText('Island clustering')).toBeInTheDocument();
    expect(screen.getByText('Geological age')).toBeInTheDocument();
    expect(screen.getByText('Lagoon rings')).toBeInTheDocument();
    expect(screen.queryByText('Mountainousness')).not.toBeInTheDocument();
  });

  it('shows mountainousness for ordinary regions', () => {
    renderCard({ type: 'ordinary' });

    expect(screen.getByText('Mountainousness')).toBeInTheDocument();
    expect(screen.getAllByRole('slider')).toHaveLength(5);
  });

  it('patches a single terrain value from the slider', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderCard({ onChange });

    const landShare = screen.getAllByRole('slider')[0];
    if (!landShare) {
      throw new Error('The land share slider is missing.');
    }
    landShare.focus();
    await user.keyboard('{ArrowRight}');

    expect(onChange).toHaveBeenCalledWith({ landShare: expect.closeTo(0.35, 6) });
  });

  it('shows the selection controls in the card header', () => {
    renderCard();

    expect(screen.getByRole('button', { name: 'Previous' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });
});
