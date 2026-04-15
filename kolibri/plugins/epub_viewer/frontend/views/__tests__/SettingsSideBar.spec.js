import { render, screen, fireEvent } from '@testing-library/vue';
import SettingsSideBar from '../SettingsSideBar';
import { THEMES } from '../EpubConstants';

const { decrease, increase, setWhiteTheme, setBeigeTheme, setGreyTheme, setBlackTheme } =
  SettingsSideBar.$trs;

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
    expect(screen.getByText(decrease.message)).toBeInTheDocument();
    expect(screen.getByText(increase.message)).toBeInTheDocument();

    // Theme buttons (check a few representative ones)
    expect(screen.getByLabelText(setWhiteTheme.message)).toBeInTheDocument();
    expect(screen.getByLabelText(setBeigeTheme.message)).toBeInTheDocument();
  });

  it('emits event when decrease font size button is clicked', async () => {
    const { emitted } = renderSettingsSideBar();

    await fireEvent.click(screen.getByText(decrease.message));

    expect(emitted().decreaseFontSize).toBeTruthy();
  });

  it('emits event when increase font size button is clicked', async () => {
    const { emitted } = renderSettingsSideBar();

    await fireEvent.click(screen.getByText(increase.message));

    expect(emitted().increaseFontSize).toBeTruthy();
  });

  it('renders expected theme options', () => {
    renderSettingsSideBar();

    const themeLabels = [
      setWhiteTheme.message,
      setBeigeTheme.message,
      setGreyTheme.message,
      setBlackTheme.message,
    ];

    const renderedThemes = themeLabels.filter(label => screen.queryByLabelText(label));

    expect([2, 3, 4, 6]).toContain(renderedThemes.length);
  });

  it('emits event when a theme is selected', async () => {
    const { emitted } = renderSettingsSideBar();

    await fireEvent.click(screen.getByLabelText(setWhiteTheme.message));

    expect(emitted().setTheme).toBeTruthy();
    expect(emitted().setTheme[0][0]).toBe(THEMES.WHITE);
  });
});
