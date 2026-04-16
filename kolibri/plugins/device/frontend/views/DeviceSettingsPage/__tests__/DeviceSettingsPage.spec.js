import { render, screen, fireEvent } from '@testing-library/vue';
import '@testing-library/jest-dom';
import { Store } from 'vuex';
import { createTranslator } from 'kolibri/utils/i18n';
import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
import DeviceSettingsPage from '../index.vue';
import usePlugins, {
  // eslint-disable-next-line import-x/named
  usePluginsMock,
} from '../../../composables/usePlugins';

import * as api from '../api';
import { getFreeSpaceOnServer } from '../../AvailableChannelsPage/api';

const { saveChangesAction$ } = coreStrings;

const {
  allowGuestAccess$,
  disallowGuestAccess$,
  lockedContent$,
  signInPageChoice$,
  learnerAppPageChoice$,
  unlistedChannels$,
} = createTranslator(DeviceSettingsPage.name, DeviceSettingsPage.$trs);

jest.mock('../../../composables/usePlugins');
jest.mock('kolibri-plugin-data', () => {
  return {
    __esModule: true,
    default: {
      deprecationWarnings: {},
    },
  };
});

jest.mock('../api.js', () => ({
  getPathPermissions: jest.fn(),
  getPathsPermissions: jest.fn(),
  getDeviceURLs: jest.fn(),
  getDeviceSettings: jest.fn(),
  saveDeviceSettings: jest.fn(),
}));

jest.mock('../../AvailableChannelsPage/api.js', () => ({
  getFreeSpaceOnServer: jest.fn(),
}));

const DeviceSettingsData = {
  languageId: 'en',
  landingPage: 'sign-in',
  allowGuestAccess: false,
  allowLearnerUnassignedResourceAccess: false,
  allowPeerUnlistedChannelImport: true,
  allowOtherBrowsersToConnect: false,
  primaryStorageLocation: null,
  secondaryStorageLocations: [],
  extraSettings: {
    allow_download_on_metered_connection: false,
    allow_learner_download_resources: false,
    enable_automatic_download: false,
    limit_for_autodownload: 0,
    set_limit_for_autodownload: false,
  },
};

const store = new Store({
  state: {},
  getters: {},
  actions: {
    createSnackbar() {},
  },
  modules: {
    deviceInfo: {
      namespaced: true,
      getters: {
        isRemoteContent: () => false,
      },
    },
  },
});

async function makeWrapper() {
  const routes = [];
  render(DeviceSettingsPage, {
    store,
    routes,
  });

  // Need to wait for beforeMount to finish
  await global.flushPromises();
}

function getButtons() {
  const saveButton = screen.getByRole('button', { name: saveChangesAction$() });
  const learnPage = screen.getByRole('radio', { name: learnerAppPageChoice$() });
  const signInPage = screen.getByRole('radio', { name: signInPageChoice$() });
  const allowGuestAccess = screen.getByRole('radio', { name: allowGuestAccess$() });
  const disallowGuestAccess = screen.getByRole('radio', { name: disallowGuestAccess$() });
  const unlistedChannels = screen.getByRole('checkbox', { name: unlistedChannels$() });
  const lockedContent = screen.getByRole('radio', { name: lockedContent$() });

  return {
    learnPage,
    signInPage,
    allowGuestAccess,
    disallowGuestAccess,
    lockedContent,
    saveButton,
    unlistedChannels,
  };
}

describe('DeviceSettingsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    api.getPathPermissions.mockResolvedValue({});
    api.getPathsPermissions.mockResolvedValue({});
    api.getDeviceURLs.mockResolvedValue({});
    api.getDeviceSettings.mockResolvedValue(DeviceSettingsData);
    getFreeSpaceOnServer.mockResolvedValue({ freeSpace: 0 });
    api.saveDeviceSettings.mockResolvedValue({});
  });

  it('loads the data from getDeviceSettings', async () => {
    api.getDeviceSettings.mockResolvedValue(DeviceSettingsData);
    await makeWrapper();
    const {
      signInPage,
      learnPage,
      allowGuestAccess,
      disallowGuestAccess,
      lockedContent,
      unlistedChannels,
    } = getButtons();

    expect(signInPage).toBeChecked();
    expect(learnPage).not.toBeChecked();

    expect(lockedContent).toBeChecked();
    expect(allowGuestAccess).not.toBeChecked();
    expect(disallowGuestAccess).not.toBeChecked();
    expect(unlistedChannels).toBeChecked();
    expect(screen.getByTestId('languageSelect')).toHaveTextContent('English');
  });

  function setMockedData(allowGuestAccess, allowAllAccess, allowPeerUnlistedChannelImport = false) {
    api.getDeviceSettings.mockResolvedValue({
      landingPage: 'sign-in',
      allowGuestAccess: allowGuestAccess,
      allowLearnerUnassignedResourceAccess: allowAllAccess,
      allowPeerUnlistedChannelImport: allowPeerUnlistedChannelImport,
    });
  }

  describe('landing page section', () => {
    // These should be the inverse of the "submitting settings" tests below

    it('hydrates with the correct state when guest access is allowed', async () => {
      setMockedData(true, true);
      await makeWrapper();
      const {
        signInPage,
        learnPage,
        allowGuestAccess,
        disallowGuestAccess,
        lockedContent,
        unlistedChannels,
      } = getButtons();
      expect(signInPage).toBeChecked();
      expect(learnPage).not.toBeChecked();
      expect(allowGuestAccess).toBeChecked();
      expect(disallowGuestAccess).not.toBeChecked();
      expect(lockedContent).not.toBeChecked();
      expect(unlistedChannels).not.toBeChecked();
    });

    it('hydrates with the correct state when guest access is disallowed', async () => {
      setMockedData(false, true);
      await makeWrapper();
      const {
        signInPage,
        learnPage,
        allowGuestAccess,
        disallowGuestAccess,
        lockedContent,
        unlistedChannels,
      } = getButtons();

      expect(signInPage).toBeChecked();
      expect(learnPage).not.toBeChecked();
      expect(allowGuestAccess).not.toBeChecked();
      expect(disallowGuestAccess).toBeChecked();
      expect(lockedContent).not.toBeChecked();
      expect(unlistedChannels).not.toBeChecked();
    });

    it('hydrates with the correct state when content is locked', async () => {
      setMockedData(false, false);
      await makeWrapper();
      const {
        signInPage,
        learnPage,
        allowGuestAccess,
        disallowGuestAccess,
        lockedContent,
        unlistedChannels,
      } = getButtons();

      expect(signInPage).toBeChecked();
      expect(learnPage).not.toBeChecked();
      expect(allowGuestAccess).not.toBeChecked();
      expect(disallowGuestAccess).not.toBeChecked();
      expect(lockedContent).toBeChecked();
      expect(unlistedChannels).not.toBeChecked();
    });

    // The fourth possibility with guest access but no channels tab should be impossible

    it('if Learn page is the landing page, sign-in page options are disabled', async () => {
      api.getDeviceSettings.mockResolvedValue({
        landingPage: 'learn',
        allowGuestAccess: true,
      });

      await makeWrapper();
      const { learnPage, allowGuestAccess, disallowGuestAccess, lockedContent, unlistedChannels } =
        getButtons();
      // Learn page button is enabled and checked
      expect(learnPage).toBeEnabled();
      expect(learnPage).toBeChecked();

      // Every radio button under the Sign-In page option should be disabled
      [allowGuestAccess, disallowGuestAccess, lockedContent].forEach(button => {
        expect(button).toBeDisabled();
        expect(button).not.toBeChecked();
      });

      // allowPeerUnlistedChannelImport defaults to null (falsy)
      expect(unlistedChannels).not.toBeChecked();
    });

    it('if switching from Learn to Sign-In, "Allow users to explore..." is selected', async () => {
      api.getDeviceSettings.mockResolvedValue({
        landingPage: 'learn',
      });
      await makeWrapper();
      const { signInPage, allowGuestAccess } = getButtons();
      await fireEvent.click(signInPage);
      expect(allowGuestAccess).toBeChecked();
      expect(allowGuestAccess).toBeEnabled();
    });
  });

  describe('submitting changes', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      api.saveDeviceSettings.mockClear();
      const newData = { ...DeviceSettingsData };
      newData.allowLearnerUnassignedResourceAccess = true;
      api.getDeviceSettings.mockResolvedValue(newData);
      usePlugins.mockImplementation(() => usePluginsMock());
    });

    it('landing page is Learn page', async () => {
      await makeWrapper();
      const { learnPage, saveButton } = getButtons();
      await fireEvent.click(learnPage);
      await fireEvent.click(saveButton);
      await global.flushPromises();
      expect(api.saveDeviceSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          landingPage: 'learn',
          allowGuestAccess: true,
          allowLearnerUnassignedResourceAccess: true,
        }),
      );
    });

    // NOTE: See screenshot in #7247 for how radio button selection should map to settings
    it('"Allow users to explore resources without signing in" is selected', async () => {
      await makeWrapper();
      const { disallowGuestAccess, allowGuestAccess, saveButton } = getButtons();
      // Click "disallow guest access first" to temporarily change settings from initial state
      await fireEvent.click(disallowGuestAccess);
      await fireEvent.click(allowGuestAccess);
      await fireEvent.click(saveButton);
      await global.flushPromises();
      // Implications: Can see "explore without account" AND can see "channels" tab
      expect(api.saveDeviceSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          landingPage: 'sign-in',
          allowGuestAccess: true,
          allowLearnerUnassignedResourceAccess: true,
        }),
      );
    });

    it('"Learners must sign in to explore resources" is selected', async () => {
      await makeWrapper();
      const { disallowGuestAccess, saveButton } = getButtons();
      await fireEvent.click(disallowGuestAccess);
      await fireEvent.click(saveButton);
      await global.flushPromises();
      // Implications: Cannot see "explore without account" AND can see "channels" tab
      expect(api.saveDeviceSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          landingPage: 'sign-in',
          allowGuestAccess: false,
          allowLearnerUnassignedResourceAccess: true,
        }),
      );
    });

    it('"Signed in learners only see resources assigned to them in classes" is selected', async () => {
      await makeWrapper();
      const { lockedContent, saveButton } = getButtons();
      await fireEvent.click(lockedContent);
      await fireEvent.click(saveButton);

      await global.flushPromises();
      // Implications: Cannot see "explore without account" AND cannot see "channels" tab
      expect(api.saveDeviceSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          landingPage: 'sign-in',
          allowGuestAccess: false,
          allowLearnerUnassignedResourceAccess: false,
        }),
      );
    });
  });
});
