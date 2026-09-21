import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';

import { MacroRegionForm } from './macro-region-form';
import { MACRO_REGION_FORM_DEFAULTS, useMacroRegionFormStore } from '../../../../stores';

function renderForm() {
  render(
    <Theme>
      <MacroRegionForm />
    </Theme>
  );
}

describe('MacroRegionForm', () => {
  beforeEach(() => {
    useMacroRegionFormStore.setState({ ...MACRO_REGION_FORM_DEFAULTS });
  });

  it('stacks presets, base layout, borders, base regions and overlay regions', () => {
    renderForm();

    const sections = [
      screen.getByText('Presets'),
      screen.getByText('Base layout'),
      screen.getByText('Borders'),
      screen.getByText('Base regions (4)'),
      screen.getByText('Overlay regions (0)'),
    ];

    for (let index = 1; index < sections.length; index++) {
      expect(
        sections[index - 1].compareDocumentPosition(sections[index]) &
          Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();
    }
  });
});
