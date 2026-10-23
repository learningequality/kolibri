import { render, screen, fireEvent } from '@testing-library/vue';
import SelectedLanguage, { selectedLanguageStrings } from '../SelectedLanguage';

const { currentLanguageLabel$ } = selectedLanguageStrings;

const selectedLanguage = {
  id: 'en',
  lang_name: 'English',
  english_name: 'English',
};

function renderComponent() {
  return render(SelectedLanguage, { props: { selectedLanguage } });
}

describe('SelectedLanguage', () => {
  it('keeps the decorative globe icon out of the tab order and hidden from assistive tech', () => {
    renderComponent();

    const control = screen.getByRole('button', { hidden: true });

    expect(control).toHaveAttribute('aria-hidden', 'true');
    expect(control).toHaveAttribute('tabindex', '-1');
  });

  it('announces the current language to screen readers', () => {
    renderComponent();

    expect(screen.getByTestId('current-language-label')).toHaveTextContent(
      currentLanguageLabel$({ language: selectedLanguage.lang_name }),
    );
  });

  it('emits click when the globe icon is activated', async () => {
    const { emitted } = renderComponent();

    const control = screen.getByRole('button', { hidden: true });
    await fireEvent.click(control);

    expect(emitted().click).toHaveLength(1);
  });
});
