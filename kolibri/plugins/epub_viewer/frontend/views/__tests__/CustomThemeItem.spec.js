import { render, screen, fireEvent } from '@testing-library/vue';
import CustomThemeItem from '../CustomThemeItem';
import { customThemeStrings } from '../customThemeStrings';

const { setCustomTheme$, deleteCustomTheme$, editCustomTheme$ } = customThemeStrings;

const theme = {
  name: 'myTheme1',
  backgroundColor: '#ffffff',
  textColor: '#212121',
  hoverColor: '#eeeeee',
};

function renderItem(props = {}) {
  return render(CustomThemeItem, {
    props: { theme, isApplied: false, ...props },
  });
}

describe('CustomThemeItem', () => {
  it('renders set, delete, and edit buttons labelled for the theme', () => {
    renderItem();

    expect(
      screen.getByRole('button', { name: setCustomTheme$({ themeName: 'myTheme1' }) }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: deleteCustomTheme$({ themeName: 'myTheme1' }) }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: editCustomTheme$({ themeName: 'myTheme1' }) }),
    ).toBeInTheDocument();
  });

  it('emits setCustomTheme with the theme when the color button is clicked', async () => {
    const { emitted } = renderItem();

    await fireEvent.click(
      screen.getByRole('button', { name: setCustomTheme$({ themeName: 'myTheme1' }) }),
    );

    expect(emitted().setCustomTheme[0][0]).toBe(theme);
  });

  it('keeps the full theme name in the DOM rather than truncating it in JS', () => {
    // The name is truncated visually with CSS ellipsis, so the full string stays
    // in the DOM (and in the button's accessible name) rather than being cut in JS.
    renderItem({ theme: { ...theme, name: 'aReallyLongThemeName' } });

    expect(
      screen.getByRole('button', { name: setCustomTheme$({ themeName: 'aReallyLongThemeName' }) }),
    ).toBeInTheDocument();
  });
});
