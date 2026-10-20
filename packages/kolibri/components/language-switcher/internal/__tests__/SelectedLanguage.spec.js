import { render, screen, fireEvent } from '@testing-library/vue';
import { createTranslator } from 'kolibri/utils/i18n';
import SelectedLanguage from '../SelectedLanguage';

const { changeLanguageButtonLabel$ } = createTranslator(
  SelectedLanguage.name,
  SelectedLanguage.$trs,
);

const selectedLanguage = {
  id: 'en',
  lang_name: 'English',
  english_name: 'English',
};

function renderComponent() {
  return render(SelectedLanguage, { props: { selectedLanguage } });
}

describe('SelectedLanguage', () => {
  it('exposes a focusable control with a non-empty accessible name, not hidden from assistive tech', () => {
    renderComponent();

    const control = screen.getByRole('button', {
      name: changeLanguageButtonLabel$({ language: 'English' }),
    });

    expect(control).toBeInTheDocument();
    expect(control).not.toHaveAttribute('aria-hidden');
    expect(control).not.toHaveAttribute('tabindex', '-1');
  });

  it('emits click when the control is activated', async () => {
    const { emitted } = renderComponent();

    const control = screen.getByRole('button', {
      name: changeLanguageButtonLabel$({ language: 'English' }),
    });
    await fireEvent.click(control);

    expect(emitted().click).toBeTruthy();
  });
});
