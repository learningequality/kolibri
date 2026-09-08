import { render, screen, waitFor, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import VueRouter from 'vue-router';
import { createTranslator } from 'kolibri/utils/i18n';
import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
import RemoteChannelResource from 'kolibri-common/apiResources/RemoteChannelResource';
import AvailableChannelsPage from '../AvailableChannelsPage';
import ChannelTokenModal from '../AvailableChannelsPage/ChannelTokenModal';
import FilteredChannelListContainer from '../ManageContentPage/FilteredChannelListContainer';
import WithImportDetails from '../ManageContentPage/ChannelPanel/WithImportDetails';
import { makeAvailableChannelsPageStore } from '../../__tests__/utils/makeStore';
import { PageNames } from '../../constants';

jest.mock('kolibri/urls');
jest.mock('kolibri/client');
jest.mock('kolibri-common/composables/usePageLoading');
jest.mock('kolibri-common/apiResources/RemoteChannelResource');

const { channelTokenButtonLabel$, importResourcesHeader$ } = createTranslator(
  AvailableChannelsPage.name,
  AvailableChannelsPage.$trs,
);

const { numChannelsAvailable$, allLanguages$, titleFilterPlaceholder$ } = createTranslator(
  FilteredChannelListContainer.name,
  FilteredChannelListContainer.$trs,
);

const { onYourDevice$, selectResourcesAction$ } = createTranslator(
  WithImportDetails.name,
  WithImportDetails.$trs,
);
const { channelTokenLabel$ } = createTranslator(ChannelTokenModal.name, ChannelTokenModal.$trs);
const { continueAction$ } = coreStrings;

function createRouter() {
  return new VueRouter({
    routes: [
      { name: 'AVAILABLE_CHANNELS', path: '/content/channels' },
      { name: PageNames.MANAGE_CONTENT_PAGE, path: '/content' },
      { name: 'SELECT_CONTENT', path: '/content/channel/:channel_id?' },
      {
        name: PageNames.NEW_CHANNEL_VERSION_PAGE,
        path: '/content/manage_channel/:channel_id/upgrade',
      },
    ],
  });
}

async function renderComponent({ store } = {}) {
  const router = createRouter();
  await router.push({ name: 'AVAILABLE_CHANNELS' });
  const result = render(AvailableChannelsPage, {
    store: store || makeAvailableChannelsPageStore(),
    router,
  });
  // Return the router alongside the usual render result so tests can inspect
  // navigation (route name/params) after actions like submitting a token.
  return { ...result, router };
}

describe('AvailableChannelsPage', () => {
  it('in REMOTEIMPORT mode, the unlisted channel button is available', async () => {
    const store = makeAvailableChannelsPageStore({ transferType: 'remoteimport' });
    await renderComponent({ store });

    await waitFor(() => {
      expect(screen.getByText(channelTokenButtonLabel$())).toBeInTheDocument();
    });
  });

  it('in LOCALIMPORT mode, the unlisted channel button is not available', async () => {
    const store = makeAvailableChannelsPageStore({ transferType: 'localimport' });
    await renderComponent({ store });

    await waitFor(() => {
      expect(screen.queryByText(channelTokenButtonLabel$())).not.toBeInTheDocument();
    });
  });

  it('shows the correct title', async () => {
    const store = makeAvailableChannelsPageStore();
    await renderComponent({ store });

    await waitFor(() => {
      expect(screen.getByTestId('title')).toHaveTextContent(importResourcesHeader$());
    });
  });

  it('shows the correct number of channels available message', async () => {
    const store = makeAvailableChannelsPageStore();
    await renderComponent({ store });

    await waitFor(() => {
      expect(screen.getByTestId('available')).toHaveTextContent(
        numChannelsAvailable$({ count: 4 }),
      );
    });
  });

  it('if there are no channels, then filters do not appear', async () => {
    const store = makeAvailableChannelsPageStore();
    store.commit('manageContent/wizard/SET_AVAILABLE_CHANNELS', []);
    await renderComponent({ store });

    await waitFor(() => {
      expect(screen.getByTestId('available')).toBeInTheDocument();
    });
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('shows the "on device" indicator only for channels that are installed', async () => {
    const store = makeAvailableChannelsPageStore();
    await renderComponent({ store });

    await waitFor(() => {
      expect(screen.getByTestId('available')).toBeInTheDocument();
    });

    // Scoped check: find each channel's own box, then look only inside it
    function isOnDevice(channelName) {
      const channelBox = screen.getByText(channelName).closest('.channel-list-item');
      return within(channelBox).queryByText(onYourDevice$()) !== null;
    }

    // Awesome and Kaetze are installed (available: true in fixture data)
    expect(isOnDevice('Awesome Channel')).toBe(true);
    expect(isOnDevice('Kaetze Channel')).toBe(true);
    // Bird (available: false) and Hunden (not in installed channelList) should not show it
    expect(isOnDevice('Bird Channel')).toBe(false);
    expect(isOnDevice('Hunden Channel')).toBe(false);
  });
  it('shows the correct language filter options', async () => {
    const store = makeAvailableChannelsPageStore();
    await renderComponent({ store });

    await waitFor(() => {
      expect(screen.getByTestId('available')).toBeInTheDocument();
    });

    // The dropdown's currently-selected value is also rendered separately from the
    // options list, so we scope our search to just the options list to avoid duplicates.
    const optionsList = document.querySelector('.ui-select-options');
    // These language names come from fixture data (lang_name), not app translations,
    // so we store them in variables rather than passing literals directly to getByText.
    const englishLanguageName = 'English';
    const germanLanguageName = 'German';
    expect(within(optionsList).getByText(allLanguages$())).toBeInTheDocument();
    expect(within(optionsList).getByText(englishLanguageName)).toBeInTheDocument();
    expect(within(optionsList).getByText(germanLanguageName)).toBeInTheDocument();
  });

  it('filters the channel list when a language filter option is selected', async () => {
    const store = makeAvailableChannelsPageStore();
    await renderComponent({ store });

    await waitFor(() => {
      expect(screen.getByTestId('available')).toBeInTheDocument();
    });

    // KSelect is a custom dropdown, not a native <select>: clicking its label
    // toggles the options list open, same as a real user would.
    const user = userEvent.setup();
    const dropdownLabel = document.querySelector('.ui-select-label');
    await user.click(dropdownLabel);

    const optionsList = document.querySelector('.ui-select-options');
    const germanLanguageName = 'German';
    await user.click(within(optionsList).getByText(germanLanguageName));

    // Only Hunden and Kaetze channels have lang_code 'de' in the fixture data.
    await waitFor(() => {
      expect(screen.getByTestId('available')).toHaveTextContent(
        numChannelsAvailable$({ count: 2 }),
      );
    });

    const awesomeChannelName = 'Awesome Channel';
    const birdChannelName = 'Bird Channel';
    const hundenChannelName = 'Hunden Channel';
    const kaetzeChannelName = 'Kaetze Channel';
    // The component uses v-show (not v-if) to filter, so hidden channels stay in
    // the DOM with display: none rather than being removed — we must check
    // visibility, not just presence.
    expect(screen.getByText(awesomeChannelName)).not.toBeVisible();
    expect(screen.getByText(birdChannelName)).not.toBeVisible();
    expect(screen.getByText(hundenChannelName)).toBeVisible();
    expect(screen.getByText(kaetzeChannelName)).toBeVisible();
  });

  it('filters the channel list by keyword when the title filter is used', async () => {
    const store = makeAvailableChannelsPageStore();
    await renderComponent({ store });

    await waitFor(() => {
      expect(screen.getByTestId('available')).toBeInTheDocument();
    });

    const user = userEvent.setup();
    const searchInput = screen.getByPlaceholderText(titleFilterPlaceholder$());
    await user.type(searchInput, 'Bird');

    await waitFor(() => {
      expect(screen.getByTestId('available')).toHaveTextContent(
        numChannelsAvailable$({ count: 1 }),
      );
    });

    const awesomeChannelName = 'Awesome Channel';
    const birdChannelName = 'Bird Channel';
    const hundenChannelName = 'Hunden Channel';
    const kaetzeChannelName = 'Kaetze Channel';
    expect(screen.getByText(birdChannelName)).toBeVisible();
    expect(screen.getByText(awesomeChannelName)).not.toBeVisible();
    expect(screen.getByText(hundenChannelName)).not.toBeVisible();
    expect(screen.getByText(kaetzeChannelName)).not.toBeVisible();
  });

  it('filters the channel list using the language and title filters together', async () => {
    const store = makeAvailableChannelsPageStore();
    await renderComponent({ store });

    await waitFor(() => {
      expect(screen.getByTestId('available')).toBeInTheDocument();
    });

    const user = userEvent.setup();
    // Select German in the language filter first.
    const dropdownLabel = document.querySelector('.ui-select-label');
    await user.click(dropdownLabel);
    const optionsList = document.querySelector('.ui-select-options');
    const germanLanguageName = 'German';
    await user.click(within(optionsList).getByText(germanLanguageName));

    await waitFor(() => {
      expect(screen.getByTestId('available')).toHaveTextContent(
        numChannelsAvailable$({ count: 2 }),
      );
    });

    // Then narrow further by keyword. Both Hunden and Kaetze are German, but
    // only Kaetze should remain once we filter by name too.
    const searchInput = screen.getByPlaceholderText(titleFilterPlaceholder$());
    await user.type(searchInput, 'Kaetze');

    await waitFor(() => {
      expect(screen.getByTestId('available')).toHaveTextContent(
        numChannelsAvailable$({ count: 1 }),
      );
    });

    const awesomeChannelName = 'Awesome Channel';
    const birdChannelName = 'Bird Channel';
    const hundenChannelName = 'Hunden Channel';
    const kaetzeChannelName = 'Kaetze Channel';
    expect(screen.getByText(kaetzeChannelName)).toBeVisible();
    expect(screen.getByText(awesomeChannelName)).not.toBeVisible();
    expect(screen.getByText(birdChannelName)).not.toBeVisible();
    expect(screen.getByText(hundenChannelName)).not.toBeVisible();
  });

  it('links each channel to its select resources page', async () => {
    const store = makeAvailableChannelsPageStore();
    await renderComponent({ store });

    await waitFor(() => {
      expect(screen.getByTestId('available')).toBeInTheDocument();
    });

    const awesomeChannelName = 'Awesome Channel';
    const channelBox = screen.getByText(awesomeChannelName).closest('.channel-list-item');
    const selectLink = within(channelBox).getByRole('link', { name: selectResourcesAction$() });

    // The link's :to prop resolves to the SELECT_CONTENT route with this channel's id.
    expect(selectLink).toHaveAttribute(
      'href',
      expect.stringContaining('/content/channel/awesome_channel'),
    );
  });

  describe('submitting an unlisted channel token', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('navigates to the select content page for a new (not-yet-installed) channel', async () => {
      const store = makeAvailableChannelsPageStore({ transferType: 'remoteimport' });
      const { router } = await renderComponent({ store });

      const user = userEvent.setup();
      const newChannel = { id: 'new_channel', version: 1 };
      RemoteChannelResource.list.mockResolvedValue([newChannel]);

      // Open the token modal via the "unlisted channel" button.
      const tokenButton = screen.getByText(channelTokenButtonLabel$());
      await user.click(tokenButton);

      const textbox = await screen.findByRole('textbox', { name: channelTokenLabel$() });
      await user.type(textbox, 'some-token');

      const submitButton = screen.getByRole('button', { name: continueAction$() });
      await user.click(submitButton);

      await waitFor(() => {
        expect(router.currentRoute.name).toEqual('SELECT_CONTENT');
        expect(router.currentRoute.params.channel_id).toEqual('new_channel');
      });
    });

    it('adds the token to the url query when it points to multiple channels', async () => {
      const store = makeAvailableChannelsPageStore();
      store.commit('manageContent/wizard/SET_TRANSFER_TYPE', 'remoteimport');
      const { router } = await renderComponent({ store });

      const user = userEvent.setup();
      const collectionChannels = [
        { id: 'collection_channel_1', version: 1 },
        { id: 'collection_channel_2', version: 1 },
      ];
      RemoteChannelResource.list.mockResolvedValue(collectionChannels);

      const tokenButton = screen.getByText(channelTokenButtonLabel$());
      await user.click(tokenButton);

      const textbox = await screen.findByRole('textbox', { name: channelTokenLabel$() });
      await user.type(textbox, 'collection-token');

      const submitButton = screen.getByRole('button', { name: continueAction$() });
      await user.click(submitButton);

      // No page redirect happens for a collection token — instead the token is
      // added to the current page's own url query so the channel list can use it.
      await waitFor(() => {
        expect(router.currentRoute.name).toEqual('AVAILABLE_CHANNELS');
        expect(router.currentRoute.query.token).toEqual('collection-token');
      });
    });

    it('navigates to the new channel version page when an installed channel has a newer version', async () => {
      const store = makeAvailableChannelsPageStore({ transferType: 'remoteimport' });
      const { router } = await renderComponent({ store });

      // Awesome Channel is already installed at version 10 in the fixture data;
      // a token pointing to a newer version of the same channel should redirect
      // to the version-upgrade page rather than straight to select content.
      const user = userEvent.setup();
      const updatedChannel = { id: 'awesome_channel', version: 11 };
      RemoteChannelResource.list.mockResolvedValue([updatedChannel]);

      const tokenButton = screen.getByText(channelTokenButtonLabel$());
      await user.click(tokenButton);

      const textbox = await screen.findByRole('textbox', { name: channelTokenLabel$() });
      await user.type(textbox, 'update-token');

      const submitButton = screen.getByRole('button', { name: continueAction$() });
      await user.click(submitButton);

      await waitFor(() => {
        expect(router.currentRoute.name).toEqual('NEW_CHANNEL_VERSION_PAGE');
        expect(router.currentRoute.params.channel_id).toEqual('awesome_channel');
      });
    });
  });
});
