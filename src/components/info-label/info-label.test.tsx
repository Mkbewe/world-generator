import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';

import { InfoLabel } from './info-label';

describe('InfoLabel', () => {
  it('renders the label text', () => {
    render(
      <Theme>
        <InfoLabel label='Coverage' description='Share of the grid.' />
      </Theme>
    );

    expect(screen.getByText('Coverage')).toBeInTheDocument();
  });
});
