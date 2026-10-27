import { render, screen, within, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { crossComponentTranslator } from 'kolibri/utils/i18n';
import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
import { selectKSelectOption } from 'testUtils'; // eslint-disable-line
import AvailableChannelsPage, { pageTitleStrings } from '../AvailableChannelsPage';
import ChannelTokenModal from '../AvailableChannelsPage/ChannelTokenModal';
import FilteredChannelListContainer from '../ManageContentPage/FilteredChannelListContainer';
import WithImportDetails from '../ManageContentPage/ChannelPanel/WithImportDetails';
import { getRemoteChannelBundleByToken } from '../../modules/wizard/utils';
import pluginStore from '../../store';
import { makeAvailableChannelsPageStore } from '../../__tests__/utils/makeStore';
import router from './testRouter';

jest.mock('kolibri/urls');
jest.mock('kolibri/client');
jest.mock('kolibri-common/composables/usePageLoading');
jest.mock('../../modules/wizard/utils', () => ({
  getRemoteChannelBundleByToken: jest.fn(),
}));

const { channelTokenButtonLabel$, noChannelsAvailable$, importResourcesHeader$ } =
  crossComponentTranslator(AvailableChannelsPage);
const { numChannelsAvailable$, titleFilterPlaceholder$, allLanguages$ } = crossComponentTranslator(
  FilteredChannelListContainer,
);
const { onYourDevice$, selectResourcesAction$ } = crossComponentTranslator(WithImportDetails);
const { channelTokenLabel$ } = crossComponentTranslator(ChannelTokenModal);
const { languageLabel$, continueAction$ } = coreStrings;

const AWESOME_CHANNEL = 'Awesome Channel';
const KAETZE_CHANNEL = 'Kaetze Channel';
const BIRD_CHANNEL = 'Bird Channel';
const HUNDEN_CHANNEL = 'Hunden Channel';
const ALL_CHANNEL_NAMES = [AWESOME_CHANNEL, KAETZE_CHANNEL, BIRD_CHANNEL, HUNDEN_CHANNEL];

describe('AvailableChannelsPage', () => {
  let store;

  beforeEach(() => {
    store = makeAvailableChannelsPageStore();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  function setTransferType(transferType) {
    store.commit('manageContent/wizard/SET_TRANSFER_TYPE', transferType);
  }

  function renderPage(options = {}) {
    return render(AvailableChannelsPage, { store: options.store || store, ...router });
  }

  // hidden: true, since a filtered-out channel is still in the DOM (v-show).
  function channelHeading(name) {
    return screen.getByRole('heading', { name, level: 2, hidden: true });
  }

  function channelRow(name) {
    return within(channelHeading(name).closest('.channel-list-item'));
  }

  function expectVisibleChannels(expectedVisibleNames) {
    for (const name of ALL_CHANNEL_NAMES) {
      if (expectedVisibleNames.includes(name)) {
        expect(channelHeading(name)).toBeVisible();
      } else {
        expect(channelHeading(name)).not.toBeVisible();
      }
    }
  }

  async function submitToken(token) {
    await userEvent.click(screen.getByRole('button', { name: channelTokenButtonLabel$() }));
    const textbox = screen.getByRole('textbox', { name: channelTokenLabel$() });
    await userEvent.type(textbox, token);
    await userEvent.click(screen.getByRole('button', { name: continueAction$() }));
  }

  describe('page title', () => {
    async function expectTitleAndOneH1(title) {
      pluginStore.replaceState(store.state);
      render(AvailableChannelsPage, { store: pluginStore, ...router });
      await waitFor(() => {
        expect(document.title).toBe(`${title} - Kolibri`);
      });
      expect(screen.queryAllByRole('heading', { level: 1 })).toHaveLength(1);
    }

    beforeEach(() => {
      document.title = '';
    });

    it('names the drive in LOCALIMPORT mode', async () => {
      const selectedDrive = store.state.manageContent.wizard.driveList[1];
      store.state.manageContent.wizard.selectedDrive = selectedDrive;
      await expectTitleAndOneH1(
        pageTitleStrings.documentTitleForLocalImport$({ driveName: selectedDrive.name }),
      );
    });

    it('names Kolibri Studio in REMOTEIMPORT mode', async () => {
      setTransferType('remoteimport');
      await expectTitleAndOneH1(pageTitleStrings.documentTitleForRemoteImport$());
    });

    it('names the peer device in PEERIMPORT mode', async () => {
      setTransferType('peerimport');
      store.state.manageContent.wizard.selectedPeer = {
        id: 'peer',
        device_name: 'Peer device',
        base_url: 'http://peer/',
      };
      await expectTitleAndOneH1(
        pageTitleStrings.documentTitleForLocalImport$({ driveName: 'Peer device' }),
      );
    });
  });

  describe('unlisted-channel token button', () => {
    it('is available in REMOTEIMPORT mode, and opens the token modal', async () => {
      setTransferType('remoteimport');
      renderPage();

      await userEvent.click(screen.getByRole('button', { name: channelTokenButtonLabel$() }));

      expect(screen.getByRole('textbox', { name: channelTokenLabel$() })).toBeInTheDocument();
    });

    it('is not available in LOCALIMPORT mode', () => {
      setTransferType('localimport');
      renderPage();

      expect(
        screen.queryByRole('button', { name: channelTokenButtonLabel$() }),
      ).not.toBeInTheDocument();
    });
  });

  it('shows "Select resources for import" as the page heading', () => {
    setTransferType('localimport');
    const selectedDrive = store.state.manageContent.wizard.driveList.find(
      ({ id }) => id === 'f9e29616935fbff37913ed46bf20e2c0',
    );
    store.state.manageContent.wizard.selectedDrive = selectedDrive;
    renderPage();

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(importResourcesHeader$());
  });

  it('shows the number of channels available', () => {
    setTransferType('localimport');
    renderPage();

    expect(screen.getByTestId('available')).toHaveTextContent(numChannelsAvailable$({ count: 4 }));
  });

  it('shows the "no channels" message and hides the filters when there are no channels', () => {
    store.commit('manageContent/wizard/SET_AVAILABLE_CHANNELS', []);
    renderPage();

    expect(screen.getByTestId('no-channels')).toHaveTextContent(noChannelsAvailable$());
    expect(screen.queryByText(languageLabel$())).not.toBeInTheDocument();
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
  });

  it('marks the channels that are already on this device', () => {
    renderPage();

    expect(channelRow(AWESOME_CHANNEL).getByText(onYourDevice$())).toBeInTheDocument();
    expect(channelRow(KAETZE_CHANNEL).getByText(onYourDevice$())).toBeInTheDocument();
    expect(channelRow(BIRD_CHANNEL).queryByText(onYourDevice$())).not.toBeInTheDocument();
    expect(channelRow(HUNDEN_CHANNEL).queryByText(onYourDevice$())).not.toBeInTheDocument();
  });

  it('with no filters applied, every channel is visible', () => {
    setTransferType('localimport');
    renderPage();

    expectVisibleChannels(ALL_CHANNEL_NAMES);
  });

  it('offers a language filter option for each language present among the channels', async () => {
    renderPage();

    // selectKSelectOption also picks an option and closes the list, so listing
    // every option needs just its first half: open the control.
    await userEvent.click(
      screen
        .getByText(languageLabel$(), { selector: '.ui-select-label-text' })
        .closest('.ui-select-label'),
    );
    const optionLabels = (await screen.findAllByRole('listitem')).map(el => el.textContent.trim());

    expect(optionLabels).toEqual([allLanguages$(), 'English', 'German']);
  });

  it('filters the channel list by language', async () => {
    renderPage();

    await selectKSelectOption(languageLabel$(), 'English');

    expectVisibleChannels([AWESOME_CHANNEL]);
  });

  it('filters the channel list by a title keyword', async () => {
    renderPage();

    await userEvent.type(
      screen.getByRole('searchbox', { name: titleFilterPlaceholder$() }),
      'bir ch',
    );

    await waitFor(() => expectVisibleChannels([BIRD_CHANNEL]));
  });

  it('filters the channel list by both language and title keyword', async () => {
    renderPage();

    await userEvent.type(
      screen.getByRole('searchbox', { name: titleFilterPlaceholder$() }),
      'hund',
    );
    await selectKSelectOption(languageLabel$(), 'German');

    await waitFor(() => expectVisibleChannels([HUNDEN_CHANNEL]));
  });

  it('the "select resources" action links to that channel\'s content-selection page', () => {
    renderPage();

    const link = channelRow(AWESOME_CHANNEL).getByRole('link', {
      name: selectResourcesAction$(),
    });

    expect(link).toHaveAttribute('href', '#/content/channel/awesome_channel');
  });

  describe('submitting a channel token', () => {
    beforeEach(async () => {
      await router.router.push({ name: 'AVAILABLE_CHANNELS' }).catch(() => {});
      setTransferType('remoteimport');
    });

    it('redirects to the new-version page when the token resolves to a different version than installed', async () => {
      getRemoteChannelBundleByToken.mockResolvedValue([{ id: 'awesome_channel', version: 11 }]);
      renderPage();

      await submitToken('my-token');

      await waitFor(() => {
        expect(router.router.currentRoute.name).toBe('NEW_CHANNEL_VERSION_PAGE');
        expect(router.router.currentRoute.params.channel_id).toBe('awesome_channel');
        expect(router.router.currentRoute.query.token).toBe('my-token');
      });
    });

    it('redirects to the new-version page for an installed draft even when versions match', async () => {
      const draftStore = makeAvailableChannelsPageStore({
        channelList: [
          {
            id: 'draft_channel',
            name: 'Draft',
            version: 0,
            available: true,
            on_device_resources: 5,
            on_device_file_size: 100,
          },
        ],
      });
      draftStore.commit('manageContent/wizard/SET_TRANSFER_TYPE', 'remoteimport');
      getRemoteChannelBundleByToken.mockResolvedValue([{ id: 'draft_channel', version: 0 }]);
      renderPage({ store: draftStore });

      await submitToken('my-token');

      await waitFor(() => {
        expect(router.router.currentRoute.name).toBe('NEW_CHANNEL_VERSION_PAGE');
        expect(router.router.currentRoute.params.channel_id).toBe('draft_channel');
      });
    });

    it('goes to the content-selection page with the token when the token-resolved version matches the installed one', async () => {
      getRemoteChannelBundleByToken.mockResolvedValue([{ id: 'awesome_channel', version: 10 }]);
      renderPage();

      await submitToken('my-token');

      await waitFor(() => {
        expect(router.router.currentRoute.name).toBe('SELECT_CONTENT');
        expect(router.router.currentRoute.query.token).toBe('my-token');
      });
    });

    it('goes to the content-selection page with the token when the channel is not installed', async () => {
      getRemoteChannelBundleByToken.mockResolvedValue([
        { id: 'new_uninstalled_channel', version: 1 },
      ]);
      renderPage();

      await submitToken('my-token');

      await waitFor(() => {
        expect(router.router.currentRoute.name).toBe('SELECT_CONTENT');
        expect(router.router.currentRoute.query.token).toBe('my-token');
      });
    });

    it('stays on this page with the token in the query when the token resolves to a collection of channels', async () => {
      getRemoteChannelBundleByToken.mockResolvedValue([{ id: 'ch-1' }, { id: 'ch-2' }]);
      renderPage();

      await submitToken('collection-token');

      await waitFor(() => {
        expect(router.router.currentRoute.name).toBe('AVAILABLE_CHANNELS');
        expect(router.router.currentRoute.query.token).toBe('collection-token');
      });
    });
  });
});
