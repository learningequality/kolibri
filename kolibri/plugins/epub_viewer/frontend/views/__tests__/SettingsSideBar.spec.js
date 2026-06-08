import { render, screen, fireEvent } from '@testing-library/vue';
import Lockr from 'lockr';
import { coreString } from 'kolibri/uiText/commonCoreStrings';
import SettingsSideBar from '../SettingsSideBar';
import { THEMES, CUSTOM_THEMES_STORAGE_KEY } from '../EpubConstants';
import { customThemeStrings } from '../customThemeStrings';
import { settingsSideBarStrings } from '../settingsSideBarStrings';
import useCustomThemes from '../../composables/useCustomThemes';

// alwan (used by the nested ColorPicker) needs a canvas, which jsdom does
// not implement; stub it out so the module tree can load.
jest.mock('alwan', () => ({
  __esModule: true,
  default: class Alwan {
    on() {}
    destroy() {}
  },
}));

const {
  decrease$,
  increase$,
  setWhiteTheme$,
  setBeigeTheme$,
  setGreyTheme$,
  setBlackTheme$,
  setYellowTheme$,
  setBlueTheme$,
  addNewTheme$,
} = settingsSideBarStrings;

const { setCustomTheme$, editCustomTheme$, deleteCustomTheme$, addAction$ } = customThemeStrings;

const customTheme = {
  id: 'abc',
  name: 'Night',
  backgroundColor: '#000000',
  textColor: '#ffffff',
  hoverColor: '#222222',
  linkColor: '#90caf9',
};

function renderSettingsSideBar(props = {}) {
  return render(SettingsSideBar, {
    props: {
      theme: THEMES.BEIGE,
      ...props,
    },
  });
}

function seedCustomThemes(themes) {
  useCustomThemes().customThemes.value = themes;
}

describe('Settings side bar', () => {
  beforeEach(() => {
    // The custom-themes map lives at module scope; reset it between tests.
    useCustomThemes().customThemes.value = {};
    Lockr.rm(CUSTOM_THEMES_STORAGE_KEY);
  });

  it('renders font size controls', () => {
    renderSettingsSideBar();

    expect(screen.getByRole('button', { name: decrease$() })).toBeEnabled();
    expect(screen.getByRole('button', { name: increase$() })).toBeEnabled();
  });

  it('emits event when decrease font size button is clicked', async () => {
    const { emitted } = renderSettingsSideBar();

    await fireEvent.click(screen.getByRole('button', { name: decrease$() }));

    expect(emitted().decreaseFontSize).toBeTruthy();
  });

  it('emits event when increase font size button is clicked', async () => {
    const { emitted } = renderSettingsSideBar();

    await fireEvent.click(screen.getByRole('button', { name: increase$() }));

    expect(emitted().increaseFontSize).toBeTruthy();
  });

  it('renders a button for every fixed theme', () => {
    renderSettingsSideBar();

    const themeLabels = [
      setWhiteTheme$(),
      setBeigeTheme$(),
      setGreyTheme$(),
      setBlackTheme$(),
      setYellowTheme$(),
      setBlueTheme$(),
    ];

    const themeButtonNames = screen
      .getAllByRole('button')
      .map(button => button.getAttribute('aria-label'))
      .filter(label => themeLabels.includes(label));

    expect(themeButtonNames).toEqual(themeLabels);
  });

  it('emits setTheme with the selected theme when a theme is clicked', async () => {
    const { emitted } = renderSettingsSideBar();

    await fireEvent.click(screen.getByRole('button', { name: setWhiteTheme$() }));

    expect(emitted().setTheme).toBeTruthy();
    expect(emitted().setTheme[0][0]).toBe(THEMES.WHITE);
  });

  it('renders custom themes from storage and emits setTheme when one is clicked', async () => {
    seedCustomThemes({ abc: customTheme });

    const { emitted } = renderSettingsSideBar();
    await fireEvent.click(
      screen.getByRole('button', { name: setCustomTheme$({ themeName: 'Night' }) }),
    );

    expect(emitted().setTheme[0][0]).toEqual(customTheme);
  });

  it('opens the add-theme modal when "Add new theme" is clicked', async () => {
    renderSettingsSideBar();

    await fireEvent.click(screen.getByRole('button', { name: addNewTheme$() }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('creates a theme and emits setTheme when the add modal is submitted', async () => {
    const { emitted } = renderSettingsSideBar();

    await fireEvent.click(screen.getByRole('button', { name: addNewTheme$() }));
    await fireEvent.click(screen.getByRole('button', { name: addAction$() }));

    // The new theme is applied and now appears in the list under its default name.
    const applied = emitted().setTheme[emitted().setTheme.length - 1][0];
    expect(
      screen.getByRole('button', { name: setCustomTheme$({ themeName: applied.name }) }),
    ).toHaveFocus();
  });

  it('opens the edit modal and emits setTheme for the same theme when saved', async () => {
    seedCustomThemes({ abc: customTheme });
    const { emitted } = renderSettingsSideBar();

    await fireEvent.click(
      screen.getByRole('button', { name: editCustomTheme$({ themeName: 'Night' }) }),
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: coreString('saveAction') }));

    const updated = emitted().setTheme[emitted().setTheme.length - 1][0];
    expect(updated.id).toBe('abc');
    // Focus returns to the edited theme's edit button.
    expect(
      screen.getByRole('button', { name: editCustomTheme$({ themeName: 'Night' }) }),
    ).toHaveFocus();
  });

  it('removes a custom theme when its deletion is confirmed', async () => {
    seedCustomThemes({ abc: customTheme });
    renderSettingsSideBar();

    await fireEvent.click(
      screen.getByRole('button', { name: deleteCustomTheme$({ themeName: 'Night' }) }),
    );
    await fireEvent.click(screen.getByRole('button', { name: coreString('deleteAction') }));

    expect(
      screen.queryByRole('button', { name: setCustomTheme$({ themeName: 'Night' }) }),
    ).not.toBeInTheDocument();
    // Focus returns to the add-theme button after the row is removed.
    expect(screen.getByRole('button', { name: addNewTheme$() })).toHaveFocus();
  });
});
