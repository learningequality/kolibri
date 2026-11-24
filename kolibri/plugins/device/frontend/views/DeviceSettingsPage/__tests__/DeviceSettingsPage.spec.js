/*
 * @jest-environment-options {"url": "http://kolibri.local:8080/"}
 */
import { render, screen, fireEvent, waitFor, within } from '@testing-library/vue';
import '@testing-library/jest-dom';
import { Store } from 'vuex';
import { createTranslator } from 'kolibri/utils/i18n';
import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
import client from 'kolibri/client';
import urls from 'kolibri/urls';
import clientFactory from 'kolibri/utils/baseClient';
import useUser, { useUserMock } from 'kolibri/composables/useUser'; // eslint-disable-line import-x/named
import useSnackbar from 'kolibri/composables/useSnackbar';
import { httpPortStrings } from 'kolibri-common/strings/httpPortStrings';
import DeviceSettingsPage, { pageTitleStrings } from '../index.vue';
import usePlugins, {
  // eslint-disable-next-line import-x/named
  usePluginsMock,
} from '../../../composables/usePlugins';

import * as api from '../api';
import { getFreeSpaceOnServer } from '../../AvailableChannelsPage/api';

const { saveChangesAction$ } = coreStrings;
const { pageHeader$ } = pageTitleStrings;

const {
  allowGuestAccess$,
  disallowGuestAccess$,
  lockedContent$,
  signInPageChoice$,
  learnerAppPageChoice$,
  unlistedChannels$,
} = createTranslator(DeviceSettingsPage.name, DeviceSettingsPage.$trs);

jest.mock('../../../composables/usePlugins');
jest.mock('kolibri/client');
jest.mock('kolibri/urls');
jest.mock('kolibri/composables/useUser');
jest.mock('kolibri/utils/redirectBrowser');
jest.mock('kolibri/heartbeat', () => ({
  startPolling: jest.fn(() => Promise.resolve()),
  stopPolling: jest.fn(),
}));
jest.mock('kolibri/utils/baseClient', () => {
  const probe = jest.fn(() => new Promise(() => {}));
  probe.interceptors = { response: { use: jest.fn() } };
  return { __esModule: true, default: () => probe };
});
jest.mock('kolibri-plugin-data', () => {
  return {
    __esModule: true,
    default: {
      canRestart: true,
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
    usePlugins.mockImplementation(() => usePluginsMock());
    useUser.mockImplementation(() => useUserMock());
    urls.__echoUrls();
    client.mockImplementation(() =>
      Promise.resolve({ data: { port: 8080, readonly_reason: null } }),
    );
  });

  it('titles the tab with its visible header, the only h1', async () => {
    document.title = '';
    await makeWrapper();
    expect(document.title).toBe(`${pageHeader$()} - Kolibri`);
    const headings = screen.queryAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent(pageHeader$());
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

  describe('port section', () => {
    const { portHeading$ } = httpPortStrings;

    it('is shown to a superuser', async () => {
      useUser.mockImplementation(() => useUserMock({ isAdmin: true, isSuperuser: true }));
      await makeWrapper();
      expect(screen.getByRole('heading', { name: portHeading$() })).toBeInTheDocument();
    });

    it('is not shown to a facility admin who is not a superuser', async () => {
      useUser.mockImplementation(() => useUserMock({ isAdmin: true, isFacilityAdmin: true }));
      await makeWrapper();
      expect(screen.queryByRole('heading', { name: portHeading$() })).not.toBeInTheDocument();
    });

    it('saves unsaved settings before restarting on the new port', async () => {
      const { changePortAction$, portLabel$ } = httpPortStrings;
      const calls = [];
      api.saveDeviceSettings.mockImplementation(settings => {
        calls.push(['save', settings.landingPage]);
        return Promise.resolve(true);
      });
      client.mockImplementation(({ method, data }) => {
        if (method === 'POST') {
          calls.push(['port', data.port]);
          return Promise.resolve({ data: {} });
        }
        return Promise.resolve({ data: { port: 8080, readonly_reason: null } });
      });
      useUser.mockImplementation(() => useUserMock({ isAdmin: true, isSuperuser: true }));
      await makeWrapper();

      await fireEvent.click(getButtons().learnPage);
      const field = await screen.findByRole('spinbutton', { name: portLabel$() });
      await fireEvent.update(field, '8081');
      await fireEvent.click(screen.getByRole('button', { name: changePortAction$() }));
      const dialog = await screen.findByRole('dialog');
      expect(dialog).toHaveTextContent(httpPortStrings.pendingSettingsSavedToo$());
      await fireEvent.click(within(dialog).getByRole('button', { name: changePortAction$() }));

      await waitFor(() =>
        expect(calls).toEqual([
          ['save', 'learn'],
          ['port', 8081],
        ]),
      );
    });

    it('restarts to apply a saved plugin change when the port claim fails', async () => {
      const { changePortAction$, portLabel$, portInUseByProcess$ } = httpPortStrings;
      const plugin = { id: 'learn', name: 'Learn', enabled: false };
      const plugins = { value: [plugin] };
      const togglePlugin = jest.fn((id, enabled) => {
        plugins.value = [{ ...plugin, enabled }];
        return Promise.resolve();
      });
      usePlugins.mockImplementation(() =>
        usePluginsMock({ plugins, togglePlugin, fetchPlugins: Promise.resolve() }),
      );
      client.mockImplementation(({ method, url }) => {
        if (method === 'POST' && url === urls['kolibri:core:devicerestart']()) {
          return Promise.resolve({ data: true });
        }
        if (method === 'POST') {
          return Promise.reject({
            response: {
              status: 400,
              data: [{ id: 'PORT_IN_USE_BY_PROCESS', metadata: { message: 'nginx' } }],
            },
          });
        }
        return Promise.resolve({ data: { port: 8080, readonly_reason: null } });
      });
      clientFactory().mockResolvedValueOnce({ data: false });
      useUser.mockImplementation(() => useUserMock({ isAdmin: true, isSuperuser: true }));
      await makeWrapper();

      await fireEvent.click(screen.getByRole('checkbox', { name: plugin.name }));
      await fireEvent.update(await screen.findByRole('spinbutton', { name: portLabel$() }), '80');
      await fireEvent.click(screen.getByRole('button', { name: changePortAction$() }));
      await fireEvent.click(
        within(await screen.findByRole('dialog')).getByRole('button', {
          name: changePortAction$(),
        }),
      );

      expect(await screen.findByRole('alert')).toHaveTextContent(
        portInUseByProcess$({ port: 80, process: 'nginx' }),
      );
      expect(togglePlugin).toHaveBeenCalledWith('learn', true);
      await waitFor(() =>
        expect(client).toHaveBeenCalledWith(
          expect.objectContaining({
            method: 'POST',
            url: urls['kolibri:core:devicerestart'](),
          }),
        ),
      );
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    });

    it('keeps the failure shown after the save snackbar is dismissed', async () => {
      const { changePortAction$, portLabel$, portInUseByProcess$ } = httpPortStrings;
      api.saveDeviceSettings.mockResolvedValue(true);
      client.mockImplementation(({ method }) => {
        if (method === 'POST') {
          return Promise.reject({
            response: {
              status: 400,
              data: [{ id: 'PORT_IN_USE_BY_PROCESS', metadata: { message: 'nginx' } }],
            },
          });
        }
        return Promise.resolve({ data: { port: 8080, readonly_reason: null } });
      });
      useUser.mockImplementation(() => useUserMock({ isAdmin: true, isSuperuser: true }));
      await makeWrapper();

      await fireEvent.click(getButtons().learnPage);
      await fireEvent.update(await screen.findByRole('spinbutton', { name: portLabel$() }), '80');
      await fireEvent.click(screen.getByRole('button', { name: changePortAction$() }));
      await fireEvent.click(
        within(await screen.findByRole('dialog')).getByRole('button', {
          name: changePortAction$(),
        }),
      );
      await screen.findByRole('alert');
      useSnackbar().clearSnackbar();
      await global.flushPromises();

      expect(screen.getByRole('alert')).toHaveTextContent(
        portInUseByProcess$({ port: 80, process: 'nginx' }),
      );
    });
  });

  it('reloads the page once the save snackbar is dismissed', async () => {
    api.saveDeviceSettings.mockResolvedValue(true);
    await makeWrapper();
    await fireEvent.click(getButtons().learnPage);
    await fireEvent.click(getButtons().saveButton);
    await global.flushPromises();
    // jsdom reports `location.reload()` as a "Not implemented: navigation" console error.
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {}); // eslint-disable-line no-console
    useSnackbar().clearSnackbar();
    await global.flushPromises();
    const navigationErrors = consoleError.mock.calls.filter(([error]) =>
      String(error?.message).startsWith('Not implemented: navigation'),
    );
    consoleError.mockRestore();
    expect(navigationErrors).toHaveLength(1);
  });

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
