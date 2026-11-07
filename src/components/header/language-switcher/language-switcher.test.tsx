import { Theme } from '@radix-ui/themes';
import { act, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { LanguageSwitcher } from './language-switcher';
import { DEFAULT_LOCALE, i18n, LOCALE_OPTIONS } from '../../../i18n';
import { readStoredLocale } from '../../../i18n/locale-storage';

function renderSwitcher(variant?: 'button' | 'row') {
  return render(
    <Theme>
      <LanguageSwitcher variant={variant} />
    </Theme>
  );
}

describe('LanguageSwitcher', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await act(() => i18n.changeLanguage(DEFAULT_LOCALE));
  });

  it('renders a labelled trigger with the current flag and name', () => {
    renderSwitcher();

    const trigger = screen.getByRole('button', { name: 'Language: English' });
    expect(trigger).toBeInTheDocument();
    expect(trigger.querySelector('img')).toHaveAttribute(
      'src',
      LOCALE_OPTIONS[DEFAULT_LOCALE].flagUrl
    );
  });

  it('expands the drawer row into an inline option list', async () => {
    const user = userEvent.setup();
    renderSwitcher('row');

    const trigger = screen.getByRole('button', { name: 'Language: English' });
    expect(trigger).toHaveTextContent('Language');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await user.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const option = screen.getByRole('radio', { name: 'English' });
    expect(option).toHaveAttribute('aria-checked', 'true');
    expect(option.closest('label')?.querySelector('img')).toHaveAttribute(
      'src',
      LOCALE_OPTIONS[DEFAULT_LOCALE].flagUrl
    );

    await user.click(option);

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(readStoredLocale()).toBe(DEFAULT_LOCALE);
  });

  it('opens a menu with the flag and name of every supported locale', async () => {
    const user = userEvent.setup();
    renderSwitcher();

    await user.click(screen.getByRole('button', { name: 'Language: English' }));

    const item = await screen.findByRole('menuitem', { name: 'English' });
    expect(item.querySelector('img')).toHaveAttribute(
      'src',
      LOCALE_OPTIONS[DEFAULT_LOCALE].flagUrl
    );
  });

  it('switches the active locale and persists the choice', async () => {
    const changeLanguage = vi.spyOn(i18n, 'changeLanguage');
    const user = userEvent.setup();
    renderSwitcher();

    await user.click(screen.getByRole('button', { name: 'Language: English' }));
    await user.click(await screen.findByRole('menuitem', { name: 'English' }));

    expect(changeLanguage).toHaveBeenCalledWith(DEFAULT_LOCALE);
    expect(readStoredLocale()).toBe(DEFAULT_LOCALE);
  });
});
