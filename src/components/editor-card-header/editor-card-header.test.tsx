import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';

import { EditorCardHeader } from './editor-card-header';

describe('EditorCardHeader', () => {
  it('renders the swatch, content and actions', () => {
    const { container } = render(
      <Theme>
        <EditorCardHeader color={[46, 125, 50]} actions={<button type='button'>Remove</button>}>
          <span>Region 1</span>
        </EditorCardHeader>
      </Theme>
    );

    expect(screen.getByText('Region 1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument();
    expect(container.querySelector('[aria-hidden]')).toHaveStyle({
      backgroundColor: 'rgb(46, 125, 50)',
    });
  });
});
