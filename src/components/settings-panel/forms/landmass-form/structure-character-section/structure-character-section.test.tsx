import { Theme } from '@radix-ui/themes';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { StructureCharacterSection } from './structure-character-section';
import {
  STRUCTURE_CHARACTER_FORM_DEFAULTS,
  useStructureCharacterFormStore,
} from '../../../../../stores';
import { DEFAULT_STRUCTURE_CHARACTER_CONFIG } from '../../../../../utils/map-generator';

function renderSection() {
  render(
    <Theme>
      <StructureCharacterSection />
    </Theme>
  );
}

describe('StructureCharacterSection', () => {
  beforeEach(() => {
    useStructureCharacterFormStore.setState({ ...STRUCTURE_CHARACTER_FORM_DEFAULTS });
  });

  it('shows the character variety slider', () => {
    renderSection();

    expect(screen.getByLabelText('Character variety')).toBeInTheDocument();
  });

  it('commits slider changes to the form store', async () => {
    const user = userEvent.setup();
    renderSection();

    const slider = within(screen.getByLabelText('Character variety')).getByRole('slider');
    expect(slider).toHaveAttribute(
      'aria-valuenow',
      String(DEFAULT_STRUCTURE_CHARACTER_CONFIG.characterVariation)
    );

    slider.focus();
    await user.keyboard('{ArrowRight}');

    expect(
      useStructureCharacterFormStore.getState().structureCharacter.characterVariation
    ).toBeCloseTo(DEFAULT_STRUCTURE_CHARACTER_CONFIG.characterVariation + 0.05, 10);
  });
});
