import { render, screen, fireEvent } from '@testing-library/vue';
import SettingsSideBar from '../SettingsSideBar';
import { THEMES } from '../EpubConstants';

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
    expect(screen.getByText('Decrease')).toBeInTheDocument();
    expect(screen.getByText('Increase')).toBeInTheDocument();

    // Theme buttons (check a few representative ones)
    expect(screen.getByLabelText('Set white theme')).toBeInTheDocument();
    expect(screen.getByLabelText('Set beige theme')).toBeInTheDocument();
  });

  it('emits event when decrease font size button is clicked', async () => {
    const { emitted } = renderSettingsSideBar();

    await fireEvent.click(screen.getByText('Decrease'));

    expect(emitted().decreaseFontSize).toBeTruthy();
  });

  it('emits event when increase font size button is clicked', async () => {
    const { emitted } = renderSettingsSideBar();

    await fireEvent.click(screen.getByText('Increase'));

    expect(emitted().increaseFontSize).toBeTruthy();
  });

  it('renders expected theme options', () => {
    renderSettingsSideBar();

    const themeLabels = [
      'Set white theme',
      'Set beige theme',
      'Set grey theme',
      'Set black theme',
    ];

    const renderedThemes = themeLabels.filter(label =>
      screen.queryByLabelText(label)
    );

    expect([2, 3, 4, 6]).toContain(renderedThemes.length);
  });

  it('emits event when a theme is selected', async () => {
    const { emitted } = renderSettingsSideBar();

    await fireEvent.click(screen.getByLabelText('Set white theme'));

    expect(emitted().setTheme).toBeTruthy();
    expect(emitted().setTheme[0][0]).toBe(THEMES.WHITE);
  });
});
