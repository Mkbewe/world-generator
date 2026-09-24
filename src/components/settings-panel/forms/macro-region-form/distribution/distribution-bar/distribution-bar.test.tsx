import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { DistributionBar } from './distribution-bar';
import type { MacroRegionSegment } from '../../../../../../utils/map-generator/stages/macro-region/editor/boundary-model';
import type { BoundaryDraft } from '../../hooks/use-boundary-draft';

const segments: readonly MacroRegionSegment[] = [
  { id: 'a', percent: 25 },
  { id: 'b', percent: 25 },
  { id: 'c', percent: 25 },
  { id: 'd', percent: 25 },
];

function createDraft(overrides: Partial<BoundaryDraft> = {}): BoundaryDraft {
  return {
    boundaries: [25, 50, 75],
    shares: [25, 25, 25, 25],
    preview: vi.fn(),
    step: vi.fn(),
    commit: vi.fn(),
    cancel: vi.fn(),
    ...overrides,
  };
}

function renderBar(draft: BoundaryDraft) {
  render(
    <Theme>
      <DistributionBar segments={segments} draft={draft} />
    </Theme>
  );
}

describe('DistributionBar', () => {
  it('renders one segment per share and one handle per boundary', () => {
    renderBar(createDraft({ boundaries: [40, 50, 75], shares: [40, 10, 25, 25] }));

    expect(screen.getByText('40%')).toBeInTheDocument();
    expect(screen.getByText('10%')).toBeInTheDocument();
    expect(screen.getAllByText('25%')).toHaveLength(2);
    expect(screen.getAllByRole('slider')).toHaveLength(3);
  });

  it('reports keyboard steps from a handle', async () => {
    const user = userEvent.setup();
    const draft = createDraft();
    renderBar(draft);

    const [firstHandle] = screen.getAllByRole('slider');
    firstHandle.focus();
    await user.keyboard('{ArrowRight}');

    expect(draft.step).toHaveBeenCalledWith(0, 1);
  });
});
