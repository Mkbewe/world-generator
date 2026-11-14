import type { GeologicalRegionConfig } from '@generator/types';
import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { GeologicalRegionCard } from './geological-region-card';
import type { EditorCardSelectionControlsProps } from '../../../../../../components/editor-card-selection-controls';

const LAGOON: GeologicalRegionConfig = {
  type: 'lagoon',
  size: 0.8,
};

const SELECTION: EditorCardSelectionControlsProps = {
  ids: ['region-1', 'region-2', 'region-3'],
  selectedId: 'region-3',
  onSelect: () => {},
};

function renderCard(overrides: { region?: GeologicalRegionConfig; onChange?: () => void } = {}) {
  return render(
    <Theme>
      <GeologicalRegionCard
        index={2}
        region={overrides.region ?? LAGOON}
        selection={SELECTION}
        onChange={overrides.onChange ?? (() => {})}
      />
    </Theme>
  );
}

describe('GeologicalRegionCard', () => {
  it('shows the type and character of the region', () => {
    renderCard();

    expect(screen.getByText('Region 3')).toBeInTheDocument();
    expect(
      screen.getByText('Character: Low reef rings, lagoons and sandy islets')
    ).toBeInTheDocument();
  });

  it('leaves the terrain sliders to the heightmap form', () => {
    renderCard();

    expect(screen.queryAllByRole('slider')).toHaveLength(0);
    expect(screen.queryByText('Land share')).not.toBeInTheDocument();
  });

  it('patches the type without touching other fields', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderCard({ onChange });

    await user.click(screen.getAllByText('Volcanic')[0] ?? screen.getByText('Volcanic'));

    expect(onChange).toHaveBeenCalledWith({ type: 'volcanic' });
  });

  it('shows the selection controls in the card header', () => {
    renderCard();

    expect(screen.getByRole('button', { name: 'Previous' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });
});
