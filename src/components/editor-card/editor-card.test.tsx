import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';

import { EditorCard } from './editor-card';

describe('EditorCard', () => {
  it('renders its content inside the shared card frame', () => {
    render(
      <Theme>
        <EditorCard>
          <span>Region body</span>
        </EditorCard>
      </Theme>
    );

    expect(screen.getByText('Region body')).toBeInTheDocument();
  });
});
