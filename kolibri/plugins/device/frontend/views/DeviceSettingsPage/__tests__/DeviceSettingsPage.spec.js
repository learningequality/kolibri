import { render, screen, fireEvent } from '@testing-library/vue';
import '@testing-library/jest-dom';
import { Store } from 'vuex';
import DeviceSettingsPage from '../index.vue';
import usePlugins, {
  // eslint-disable-next-line import-x/named
  usePluginsMock,
} from '../../../composables/usePlugins';

import * as api from '../api';
import { getFreeSpaceOnServer } from '../../AvailableChannelsPage/api';

jest.mock('../../../composables/usePlugins');
jest.mock('kolibri/urls');

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
  getters: {
    isPageLoading: () => false,
  },
  actions: {
    createSnackbar() { },
    notLoading() { },
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
    stubs: ['AppBarPage'],
  });

  // Need to wait for beforeMount to finish
  await global.flushPromises();
}

function getButtons() {
  const saveButton = screen.getByRole('button', { name: /save changes/i });
  const learnPage = screen.getByRole('radio', { name: /Learn page/i });
  const signInPage = screen.getByRole('radio', { name: /Sign-in page/i });
  const allowGuestAccess = screen.getByRole('radio', {
    name: /Allow users to explore resources without signing in/i,
  });
  const disallowGuestAccess = screen.getByRole('radio', {
    name: /Learners must sign in to explore resources/i,
  });
  const unlistedChannels = screen.queryByRole('checkbox', {
    name: /Allow other devices on this network to view and import my unlisted channels/i,
  });

  const lockedContent = screen.getByRole('radio', {
    name: /Signed in learners should only see resources assigned to them in classes/i,
  });

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
    const { signInPage, unlistedChannels } = getButtons();
    // VTL best practice: we don't test internal component data, we test the DOM state!
    expect(signInPage).toBeChecked();
    if (unlistedChannels) {
      expect(unlistedChannels).toBeChecked();
    }

    expect(screen.getAllByText(/english/i)[0]).toBeInTheDocument();
  });

  function setMockedData(allowGuestAccess, allowAllAccess) {
    api.getDeviceSettings.mockResolvedValue({
      landingPage: 'sign-in',
      allowGuestAccess: allowGuestAccess,
      allowLearnerUnassignedResourceAccess: allowAllAccess,
    });
  }

  describe('landing page section', () => {
    // These should be the inverse of the "submitting settings" tests below
    it('hydrates with the correct state when guest access is allowed', async () => {
      setMockedData(true, true);
      await makeWrapper();
      // The "Allow users to explore..." radio button should be checked
      const { allowGuestAccess } = getButtons();
      expect(allowGuestAccess).toBeChecked();
    });

    it('hydrates with the correct state when guest access is disallowed', async () => {
      setMockedData(false, true);
      await makeWrapper();
      // The "Learners must sign in..." radio button should checked
      const { disallowGuestAccess } = getButtons();
      expect(disallowGuestAccess).toBeChecked();
    });

    it('hydrates with the correct state when content is locked', async () => {
      setMockedData(false, false);
      await makeWrapper();
      // The "Signed in learners only see resources assigned to them" button should be checked
      const { lockedContent } = getButtons();
      expect(lockedContent).toBeChecked();
    });

    // The fourth possibility with guest access but no channels tab should be impossible

    it('if Learn page is the landing page, sign-in page options are disabled', async () => {
      api.getDeviceSettings.mockResolvedValue({
        landingPage: 'learn',
        // The guest access button should not be checked
        allowGuestAccess: true,
      });

      await makeWrapper();
      const { learnPage, allowGuestAccess, disallowGuestAccess, lockedContent } = getButtons();
      // Learn page button is enabled and checked
      expect(learnPage).toBeEnabled();
      expect(learnPage).toBeChecked();

      // Every radio button under the Sign-In page option should be disabled
      [allowGuestAccess, disallowGuestAccess, lockedContent].forEach(button => {
        expect(button).toBeDisabled();
        expect(button).not.toBeChecked();
      });
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
