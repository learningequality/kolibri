import { render, screen, fireEvent } from '@testing-library/vue';
import { createTranslator } from 'kolibri/utils/i18n';
import SettingsSideBar from '../SettingsSideBar';
import { THEMES } from '../EpubConstants';

const { decrease$, increase$, setWhiteTheme$, setBeigeTheme$, setGreyTheme$, setBlackTheme$ } =
  createTranslator(SettingsSideBar.name, SettingsSideBar.$trs);

function renderSettingsSideBar(props = {}) {
  return render(SettingsSideBar, {
    props: {
      theme: THEMES.BEIGE,
      ...props,
    },
  });
}

describe('Settings side bar', () => {
  it('renders font size controls and theme options', () => {
    renderSettingsSideBar();

    // Font buttons
    expect(screen.getByText(decrease$())).toBeInTheDocument();
    expect(screen.getByText(increase$())).toBeInTheDocument();

    // Theme buttons (check a few representative ones)
    expect(screen.getByLabelText(setWhiteTheme$())).toBeInTheDocument();
    expect(screen.getByLabelText(setBeigeTheme$())).toBeInTheDocument();
  });

  it('emits event when decrease font size button is clicked', async () => {
    const { emitted } = renderSettingsSideBar();

    await fireEvent.click(screen.getByText(decrease$()));

    expect(emitted().decreaseFontSize).toBeTruthy();
  });

  it('emits event when increase font size button is clicked', async () => {
    const { emitted } = renderSettingsSideBar();

    await fireEvent.click(screen.getByText(increase$()));

    expect(emitted().increaseFontSize).toBeTruthy();
  });

  it('renders expected theme options', () => {
    renderSettingsSideBar();

    const themeLabels = [setWhiteTheme$(), setBeigeTheme$(), setGreyTheme$(), setBlackTheme$()];

    const renderedThemes = themeLabels.filter(label => screen.queryByLabelText(label));

    expect([2, 3, 4, 6]).toContain(renderedThemes.length);
  });

  it('emits event when a theme is selected', async () => {
    const { emitted } = renderSettingsSideBar();

    await fireEvent.click(screen.getByLabelText(setWhiteTheme$()));

    expect(emitted().setTheme).toBeTruthy();
    expect(emitted().setTheme[0][0]).toBe(THEMES.WHITE);
  });
});
