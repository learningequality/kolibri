import { render, screen, fireEvent, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { ref, computed } from 'vue';
import { coreString } from 'kolibri/uiText/commonCoreStrings';
import { picturePasswordStrings } from 'kolibri-common/strings/picturePasswords';
import useUser, { useUserMock } from 'kolibri/composables/useUser'; // eslint-disable-line
import useSnackbar, { useSnackbarMock } from 'kolibri/composables/useSnackbar'; // eslint-disable-line
import { OptionsForSignIn, PicturePasswordIconStyle } from 'kolibri-common/constants/Auth';
import useFacilityEditor from '../../composables/useFacilityEditor';
import facilityConfigPageStrings from '../FacilityConfigPage/strings';
import ConfigPage from '../FacilityConfigPage';

const {
  picturePasswordInfoLabel$,
  picturePasswordInfoBody$,
  childFriendlyIconsInfoLabel$,
  childFriendlyIcons$,
  howLearnersSignIn$,
  picturePasswordUnavailableExplanation$,
  picturePasswordUnavailableTitle$,
} = picturePasswordStrings;

const { learnerNeedPasswordToLogin$, learnerCanEditPassword$ } = facilityConfigPageStrings;

jest.mock('kolibri/composables/useUser');
jest.mock('../../../../device/frontend/views/DeviceSettingsPage/api.js', () => ({
  getDeviceSettings: jest.fn(),
}));
jest.mock('kolibri/composables/useSnackbar');
jest.mock('../../composables/useFacilityEditor');
jest.mock('kolibri-common/composables/useTaskPolling', () => {
  const { ref } = jest.requireActual('vue');
  return {
    __esModule: true,
    default: jest.fn(() => ({ tasks: ref([]) })),
  };
});
jest.mock('../FacilityAppBarPage', () => ({
  name: 'FacilityAppBarPage',
  render(h) {
    return h('div', this.$slots.default);
  },
}));
jest.mock('vue-router/composables', () => ({
  useRoute: jest.fn(() => ({
    params: {},
  })),
}));

function createMockFacilityConfig(overrides = {}) {
  const settings = ref({
    learner_can_edit_username: false,
    learner_can_edit_password: false,
    learner_can_edit_name: false,
    learner_can_sign_up: false,
    learner_can_login_with_no_password: false,
    show_download_button_in_learn: false,
    picture_password_settings: null,
  });

  // Create base mocks that can be overridden
  const baseModifySetting = jest.fn((name, value) => {
    settings.value[name] = value;
  });
  const baseModifySignInOption = jest.fn();
  const baseModifyPicturePasswordSetting = jest.fn();

  // Allow overrides to replace the mocks
  const modifySetting = overrides.modifySetting || baseModifySetting;
  const modifySignInOption = overrides.modifySignInOption || baseModifySignInOption;
  const modifyPicturePasswordSetting =
    overrides.modifyPicturePasswordSetting || baseModifyPicturePasswordSetting;

  // Mock getters/setters for computed properties that call the modify functions
  const signInOptionValue = ref(overrides.signInOption || OptionsForSignIn.USERNAME_PASSWORD);
  const signInOption = computed({
    get: () => signInOptionValue.value,
    set: value => {
      signInOptionValue.value = value;
      modifySignInOption(value);
    },
  });

  const picturePasswordStyleValue = ref(
    overrides.picturePasswordStyle || PicturePasswordIconStyle.COLORFUL,
  );
  const picturePasswordStyle = computed({
    get: () => picturePasswordStyleValue.value,
    set: value => {
      picturePasswordStyleValue.value = value;
      modifyPicturePasswordSetting('icon_style', value);
    },
  });

  const picturePasswordShowIconTextValue = ref(overrides.picturePasswordShowIconText || false);
  const picturePasswordShowIconText = computed({
    get: () => picturePasswordShowIconTextValue.value,
    set: value => {
      picturePasswordShowIconTextValue.value = value;
      modifyPicturePasswordSetting('show_icon_text', value);
    },
  });

  return {
    // facility must be passed as a ref by callers; defaults to ref(null)
    facility: ref(null),
    facilityName: ref('Test Facility'),
    facilityId: ref('test-facility-id'),
    settings,
    settingsCopy: ref({}),
    facilityDataLoading: ref(false),
    settingsHaveChanged: ref(false),
    isPinSet: ref(null),
    isAttendanceFeatureEnabled: ref(true),
    isPictureLoginFeatureEnabled: ref(true),
    picturePasswordSettings: ref({
      icon_style: PicturePasswordIconStyle.COLORFUL,
      show_icon_text: false,
    }),
    fetchFacility: jest.fn(),
    modifySetting,
    modifySignInOption,
    modifyPicturePasswordSetting,
    copySettings: jest.fn(),
    undoSettingsChange: jest.fn(),
    saveFacilityName: jest.fn(),
    saveFacilityConfig: jest.fn(),
    setPin: jest.fn(),
    unsetPin: jest.fn(),
    ...overrides,
    // these already have overrides applied
    signInOption,
    picturePasswordStyle,
    picturePasswordShowIconText,
    pictureLoginTaskId: ref(null),
    saveFacilityLoginSettings: jest.fn().mockResolvedValue({}),
  };
}

function renderPage({ props = {}, isAppContext = false, mockFacilityConfig = {} } = {}) {
  useUser.mockImplementation(() => useUserMock({ isAppContext }));
  useFacilityEditor.mockImplementation(() => createMockFacilityConfig(mockFacilityConfig));

  const utils = render(ConfigPage, { props });
  return { ...utils };
}

describe('facility config page view', () => {
  const createSnackbar = jest.fn();
  beforeEach(() => {
    useSnackbar.mockImplementation(() => useSnackbarMock({ createSnackbar }));
    useUser.mockImplementation(() => useUserMock({ isAppContext: false }));
    useFacilityEditor.mockImplementation(() => createMockFacilityConfig());
    createSnackbar.mockReset();
  });

  it('shows all facility setting checkboxes to the admin', () => {
    renderPage();
    // Users section
    expect(screen.getByTestId('learner_can_edit_username')).toBeInTheDocument();
    expect(screen.getByTestId('learner_can_edit_name')).toBeInTheDocument();
    expect(screen.getByTestId('learner_can_sign_up')).toBeInTheDocument();

    // Resources section
    expect(screen.getByTestId('show_download_button_in_learn')).toBeInTheDocument();

    // How learners sign in section - radio buttons
    expect(screen.getByTestId(OptionsForSignIn.USERNAME_PASSWORD)).toBeInTheDocument();
    expect(screen.getByTestId(OptionsForSignIn.USERNAME_ONLY)).toBeInTheDocument();
    expect(screen.getByTestId(OptionsForSignIn.PICTURE_PASSWORD)).toBeInTheDocument();
  });

  it('updates a facility setting when the admin toggles a checkbox', async () => {
    const settings = ref({});
    renderPage({ mockFacilityConfig: { settings } });
    await userEvent.click(screen.getByTestId('learner_can_edit_username'));
    expect(settings.value.learner_can_edit_username).toBe(true);
  });

  it('updates learner_can_edit_name when toggling the checkbox', async () => {
    const settings = ref({});
    renderPage({ mockFacilityConfig: { settings } });
    await userEvent.click(screen.getByTestId('learner_can_edit_name'));
    expect(settings.value.learner_can_edit_name).toBe(true);
  });

  it('updates learner_can_sign_up when toggling the checkbox', async () => {
    const settings = ref({});
    renderPage({ mockFacilityConfig: { settings } });
    await userEvent.click(screen.getByTestId('learner_can_sign_up'));
    expect(settings.value.learner_can_sign_up).toBe(true);
  });

  it('updates enable_mark_attendance when toggling the checkbox', async () => {
    const settings = ref({});
    renderPage({ mockFacilityConfig: { settings } });
    await userEvent.click(screen.getByTestId('enable_mark_attendance'));
    expect(settings.value.enable_mark_attendance).toBe(true);
  });

  it('updates show_download_button_in_learn when toggling the checkbox', async () => {
    const settings = ref({});
    renderPage({ mockFacilityConfig: { settings } });
    await userEvent.click(screen.getByTestId('show_download_button_in_learn'));
    expect(settings.value.show_download_button_in_learn).toBe(true);
  });

  it('updates learner_can_edit_password when toggling the checkbox', async () => {
    const mockFacilityConfig = createMockFacilityConfig();
    renderPage({ mockFacilityConfig });
    const checkbox = screen.getByTestId('learner_can_edit_password');
    await userEvent.click(checkbox);
    expect(mockFacilityConfig.settings.value.learner_can_edit_password).toBe(true);
  });

  it('updates show_icon_text when toggling the checkbox', async () => {
    const mockModifyPicturePasswordSetting = jest.fn();
    renderPage({
      mockFacilityConfig: {
        modifyPicturePasswordSetting: mockModifyPicturePasswordSetting,
        signInOption: OptionsForSignIn.PICTURE_PASSWORD,
      },
    });
    await userEvent.click(screen.getByTestId('show_icon_text'));
    expect(mockModifyPicturePasswordSetting).toHaveBeenCalledWith('show_icon_text', true);
  });

  it('calls modifySignInOption when selecting username_password radio button', async () => {
    const mockModifySignInOption = jest.fn();
    renderPage({ mockFacilityConfig: { modifySignInOption: mockModifySignInOption } });
    await userEvent.click(screen.getByTestId(OptionsForSignIn.USERNAME_PASSWORD));
    expect(mockModifySignInOption).toHaveBeenCalledWith(OptionsForSignIn.USERNAME_PASSWORD);
    expect(screen.getByTestId('learner_can_edit_password')).toBeInTheDocument();
  });

  it('calls modifySignInOption when selecting username_only radio button', async () => {
    const mockModifySignInOption = jest.fn();
    renderPage({
      mockFacilityConfig: createMockFacilityConfig({ modifySignInOption: mockModifySignInOption }),
    });
    await userEvent.click(screen.getByTestId(OptionsForSignIn.USERNAME_ONLY));
    expect(mockModifySignInOption).toHaveBeenCalledWith(OptionsForSignIn.USERNAME_ONLY);
    expect(screen.queryByTestId('learner_can_edit_password')).not.toBeInTheDocument();
  });

  it('calls modifySignInOption when selecting picture_password radio button', async () => {
    const mockModifySignInOption = jest.fn();
    renderPage({ mockFacilityConfig: { modifySignInOption: mockModifySignInOption } });
    await userEvent.click(screen.getByTestId(OptionsForSignIn.PICTURE_PASSWORD));
    expect(mockModifySignInOption).toHaveBeenCalledWith(OptionsForSignIn.PICTURE_PASSWORD);
    expect(screen.getByTestId('child_friendly_icons')).toBeInTheDocument();
    expect(screen.getByTestId('standard_icons')).toBeInTheDocument();
    expect(screen.getByTestId('show_icon_text')).toBeInTheDocument();
  });

  it('calls modifyPicturePasswordSetting when selecting child_friendly_icons radio button', async () => {
    const mockFacilityConfig = createMockFacilityConfig({
      signInOption: OptionsForSignIn.PICTURE_PASSWORD,
      picturePasswordStyle: PicturePasswordIconStyle.STANDARD,
      picturePasswordShowIconText: false,
    });
    renderPage({ mockFacilityConfig });

    await userEvent.click(screen.getByTestId('child_friendly_icons'));
    expect(mockFacilityConfig.modifyPicturePasswordSetting).toHaveBeenCalledWith(
      'icon_style',
      PicturePasswordIconStyle.COLORFUL,
    );
  });

  it('calls modifyPicturePasswordSetting when selecting standard radio button', async () => {
    const mockFacilityConfig = createMockFacilityConfig({
      signInOption: OptionsForSignIn.PICTURE_PASSWORD,
      picturePasswordStyle: PicturePasswordIconStyle.COLORFUL,
      picturePasswordShowIconText: false,
    });
    renderPage({ mockFacilityConfig });

    await userEvent.click(screen.getByTestId('standard_icons'));
    expect(mockFacilityConfig.modifyPicturePasswordSetting).toHaveBeenCalledWith(
      'icon_style',
      PicturePasswordIconStyle.STANDARD,
    );
  });

  it('calls modifyPicturePasswordSetting when checking show_icon_text', async () => {
    const mockFacilityConfig = createMockFacilityConfig({
      signInOption: OptionsForSignIn.PICTURE_PASSWORD,
      picturePasswordStyle: PicturePasswordIconStyle.COLORFUL,
      picturePasswordShowIconText: false,
    });
    renderPage({ mockFacilityConfig });

    await userEvent.click(screen.getByTestId('show_icon_text'));
    expect(mockFacilityConfig.modifyPicturePasswordSetting).toHaveBeenCalledWith(
      'show_icon_text',
      true,
    );
  });

  it('saves changes when the admin clicks Save changes', async () => {
    const saveFacilityConfigMock = jest.fn();
    renderPage({ mockFacilityConfig: { saveFacilityConfig: saveFacilityConfigMock } });
    // BottomAppBar uses fixed positioning; userEvent fails pointer-events check in JSDOM
    await fireEvent.click(screen.getByRole('button', { name: coreString('saveChangesAction') }));
    expect(saveFacilityConfigMock).toHaveBeenCalled();
  });

  describe('in the browser mode', () => {
    it('shows Save changes in the bottom app bar', () => {
      renderPage({ isAppContext: false });
      const bottomBar = screen.getByTestId('bottom-bar');
      const pageContainer = screen.getByTestId('page-container');
      expect(
        within(bottomBar).getByRole('button', { name: coreString('saveChangesAction') }),
      ).toBeInTheDocument();
      expect(
        within(pageContainer).queryByRole('button', { name: coreString('saveChangesAction') }),
      ).not.toBeInTheDocument();
    });
  });

  describe('in the Android app mode', () => {
    it('shows Save changes in the page content instead of the bottom app bar', () => {
      renderPage({ isAppContext: true });
      const bottomBar = screen.getByTestId('bottom-bar');
      const pageContainer = screen.getByTestId('page-container');
      expect(
        within(bottomBar).queryByRole('button', { name: coreString('saveChangesAction') }),
      ).not.toBeInTheDocument();
      expect(
        within(pageContainer).getByRole('button', { name: coreString('saveChangesAction') }),
      ).toBeInTheDocument();
    });
  });

  describe('picture password info modal', () => {
    it('opens when clicking the info icon next to the picture password option', async () => {
      renderPage();
      await userEvent.click(screen.getByRole('button', { name: picturePasswordInfoLabel$() }));
      expect(screen.getByText(picturePasswordInfoBody$())).toBeInTheDocument();
    });
  });

  describe('child-friendly icons info modal', () => {
    it('opens when clicking the info icon next to the child-friendly icons option', async () => {
      renderPage({ mockFacilityConfig: { signInOption: OptionsForSignIn.PICTURE_PASSWORD } });
      await userEvent.click(screen.getByRole('button', { name: childFriendlyIconsInfoLabel$() }));
      expect(screen.getByRole('heading', { name: childFriendlyIcons$() })).toBeInTheDocument();
    });
  });

  describe('when picture passwords are exhausted', () => {
    function renderExhausted(extra = {}) {
      return renderPage({
        mockFacilityConfig: {
          facility: ref({
            picture_passwords_exhausted: true,
            num_learners: 1301,
          }),
          ...extra,
        },
      });
    }

    it('disables the picture password radio button', () => {
      renderExhausted();
      expect(
        screen.getByTestId(OptionsForSignIn.PICTURE_PASSWORD).querySelector('input'),
      ).toBeDisabled();
    });

    it('shows the picture password unavailable explanation text', () => {
      renderExhausted();
      expect(screen.getByText(picturePasswordUnavailableExplanation$())).toBeInTheDocument();
    });

    it('opens the unavailable modal when clicking the info icon in the explanation', async () => {
      renderExhausted();
      await userEvent.click(
        screen.getByRole('button', { name: picturePasswordUnavailableExplanation$() }),
      );
      expect(screen.getByText(picturePasswordUnavailableTitle$())).toBeInTheDocument();
    });

    it('disables radio buttons in icon style section', () => {
      renderExhausted({ signInOption: OptionsForSignIn.PICTURE_PASSWORD });
      expect(screen.getByTestId('child_friendly_icons').querySelector('input')).toBeDisabled();
      expect(screen.getByTestId('standard_icons').querySelector('input')).toBeDisabled();
    });
  });

  describe('when the picture login feature is disabled', () => {
    function renderDisabled(extra = {}) {
      return renderPage({
        mockFacilityConfig: {
          isPictureLoginFeatureEnabled: ref(false),
          ...extra,
        },
      });
    }

    function getUsersSection() {
      return screen.getByRole('heading', { name: coreString('usersLabel') }).closest('section');
    }

    it('hides the "how learners sign in" section', () => {
      renderDisabled();
      expect(screen.queryByRole('heading', { name: howLearnersSignIn$() })).not.toBeInTheDocument();
    });

    it('shows the legacy require-password checkbox inside the Users section, reflecting the inverted setting', () => {
      const settings = ref({ learner_can_login_with_no_password: false });
      renderDisabled({ settings });
      const checkbox = within(getUsersSection()).getByRole('checkbox', {
        name: learnerNeedPasswordToLogin$(),
      });
      expect(checkbox).toBeChecked();
    });

    it('switches signInOption to USERNAME_ONLY when the require-password checkbox is unchecked', async () => {
      const mockFacilityConfig = createMockFacilityConfig({
        isPictureLoginFeatureEnabled: ref(false),
      });
      renderPage({ mockFacilityConfig });
      await userEvent.click(screen.getByRole('checkbox', { name: learnerNeedPasswordToLogin$() }));
      expect(mockFacilityConfig.signInOption.value).toBe(OptionsForSignIn.USERNAME_ONLY);
    });

    it('shows the edit-password checkbox inside the Users section regardless of signInOption', () => {
      // With signInOption=USERNAME_ONLY this checkbox would normally be hidden by
      // the signin-section template; once the section is gone it must remain visible.
      renderDisabled({ signInOption: OptionsForSignIn.USERNAME_ONLY });
      expect(
        within(getUsersSection()).getByRole('checkbox', { name: learnerCanEditPassword$() }),
      ).toBeInTheDocument();
    });

    it('disables the edit-password checkbox when password is not required', () => {
      renderDisabled({ signInOption: OptionsForSignIn.USERNAME_ONLY });
      expect(screen.getByRole('checkbox', { name: learnerCanEditPassword$() })).toBeDisabled();
    });

    describe('when picture-password is already selected in settings', () => {
      it('shows the require-password checkbox unchecked', () => {
        renderDisabled({ signInOption: OptionsForSignIn.PICTURE_PASSWORD });
        expect(
          screen.getByRole('checkbox', { name: learnerNeedPasswordToLogin$() }),
        ).not.toBeChecked();
      });

      it('switches signInOption to USERNAME_PASSWORD when the require-password checkbox is checked', async () => {
        const mockFacilityConfig = createMockFacilityConfig({
          isPictureLoginFeatureEnabled: ref(false),
          signInOption: OptionsForSignIn.PICTURE_PASSWORD,
        });
        renderPage({ mockFacilityConfig });
        await userEvent.click(
          screen.getByRole('checkbox', { name: learnerNeedPasswordToLogin$() }),
        );
        expect(mockFacilityConfig.signInOption.value).toBe(OptionsForSignIn.USERNAME_PASSWORD);
      });
    });
  });
});
