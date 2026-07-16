import { render, screen, fireEvent } from '@testing-library/vue';
import Lockr from 'lockr';
import { coreString } from 'kolibri/uiText/commonCoreStrings';
import AddEditCustomThemeModal from '../AddEditCustomThemeModal';
import { THEMES, CUSTOM_THEMES_STORAGE_KEY, deriveHoverColor } from '../EpubConstants';
import { customThemeStrings } from '../customThemeStrings';
import useCustomThemes from '../../composables/useCustomThemes';

// alwan (used by the nested ColorPicker) needs a canvas; stub it out, capturing
// the 'change' callback so tests can simulate the user picking a color.
let mockChangeCallback;
jest.mock('alwan', () => ({
  __esModule: true,
  default: class Alwan {
    on(event, callback) {
      if (event === 'change') {
        mockChangeCallback = callback;
      }
    }
    destroy() {}
  },
}));

const { customThemePreview$, selectBackgroundColor$, selectAction$, addAction$ } =
  customThemeStrings;

function renderModal(props = {}) {
  return render(AddEditCustomThemeModal, {
    props: {
      modalMode: 'add',
      theme: THEMES.WHITE,
      themeName: 'myTheme1',
      ...props,
    },
  });
}

// Add mode's submit button reads "Add"; edit mode keeps "Save".
function clickSubmit(name = addAction$()) {
  return fireEvent.click(screen.getByRole('button', { name }));
}

function seedCustomThemes(themes) {
  useCustomThemes().customThemes.value = themes;
}

describe('AddEditCustomThemeModal', () => {
  beforeEach(() => {
    // The custom-themes map lives at module scope; reset it between tests.
    useCustomThemes().customThemes.value = {};
    Lockr.rm(CUSTOM_THEMES_STORAGE_KEY);
  });

  it('updates the preview when a new background color is picked', async () => {
    renderModal();

    // Open the color picker for the background, pick a color, and confirm it.
    await fireEvent.click(screen.getByRole('button', { name: selectBackgroundColor$() }));
    mockChangeCallback({ hex: '#abcdef' });
    await fireEvent.click(screen.getByRole('button', { name: selectAction$() }));

    expect(screen.getByRole('img', { name: customThemePreview$() })).toHaveStyle({
      backgroundColor: '#abcdef',
    });
  });

  it('saves a theme that carries a hoverColor derived from its background', async () => {
    const { emitted } = renderModal();

    await clickSubmit();

    expect(emitted().submit).toBeTruthy();
    const savedTheme = emitted().submit[0][0];
    expect(savedTheme.hoverColor).toBe(deriveHoverColor(THEMES.WHITE.backgroundColor));
  });

  it('does not save when the name duplicates an existing theme', async () => {
    seedCustomThemes({ 'id-1': { id: 'id-1', name: 'myTheme1' } });
    const { emitted } = renderModal({ themeName: 'myTheme1' });

    await clickSubmit();

    // Name is non-empty, so a blocked save isolates the duplicate-name rule.
    expect(emitted().submit).toBeFalsy();
  });

  it('saves an edited theme under its own existing name', async () => {
    // In add mode this name would be rejected as a duplicate; edit mode must exclude
    // the theme's own id from that check so the save goes through.
    seedCustomThemes({ 'id-1': { id: 'id-1', name: 'myTheme1' } });
    const { emitted } = renderModal({
      modalMode: 'edit',
      themeName: 'myTheme1',
      theme: { ...THEMES.WHITE, id: 'id-1', name: 'myTheme1', linkColor: '#0000ee' },
    });

    await clickSubmit(coreString('saveAction'));

    expect(emitted().submit).toBeTruthy();
    expect(emitted().submit[0][0].name).toBe('myTheme1');
  });
});
