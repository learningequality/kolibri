import { render, screen, fireEvent } from '@testing-library/vue';
import SelectedLanguage, { selectedLanguageStrings } from '../SelectedLanguage';

const { changeLanguageButtonLabel$ } = selectedLanguageStrings;

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

    expect(control).not.toHaveAttribute('aria-hidden');
    expect(control).not.toHaveAttribute('tabindex', '-1');
  });

  it('emits click when the control is activated', async () => {
    const { emitted } = renderComponent();

    const control = screen.getByRole('button', {
      name: changeLanguageButtonLabel$({ language: 'English' }),
    });
    await fireEvent.click(control);

    expect(emitted().click).toHaveLength(1);
  });
});
