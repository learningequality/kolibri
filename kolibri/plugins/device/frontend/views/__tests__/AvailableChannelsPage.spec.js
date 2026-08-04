import { render, screen, waitFor, within } from '@testing-library/vue';
import VueRouter from 'vue-router';
import { createTranslator } from 'kolibri/utils/i18n';
import AvailableChannelsPage from '../AvailableChannelsPage';
import FilteredChannelListContainer from '../ManageContentPage/FilteredChannelListContainer';
import WithImportDetails from '../ManageContentPage/ChannelPanel/WithImportDetails';
import { makeAvailableChannelsPageStore } from '../../__tests__/utils/makeStore';
import { PageNames } from '../../constants';

jest.mock('kolibri/urls');
jest.mock('kolibri/client');
jest.mock('kolibri-common/composables/usePageLoading');

const { channelTokenButtonLabel$, importResourcesHeader$ } = createTranslator(
  AvailableChannelsPage.name,
  AvailableChannelsPage.$trs,
);

const { numChannelsAvailable$, allLanguages$ } = createTranslator(
  FilteredChannelListContainer.name,
  FilteredChannelListContainer.$trs,
);
const { onYourDevice$ } = createTranslator(WithImportDetails.name, WithImportDetails.$trs);

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
  return render(AvailableChannelsPage, {
    store: store || makeAvailableChannelsPageStore(),
    router,
  });
}

describe('AvailableChannelsPage', () => {
  it('in REMOTEIMPORT mode, the unlisted channel button is available', async () => {
    const store = makeAvailableChannelsPageStore();
    store.commit('manageContent/wizard/SET_TRANSFER_TYPE', 'remoteimport');
    await renderComponent({ store });

    await waitFor(() => {
      expect(screen.getByText(channelTokenButtonLabel$())).toBeInTheDocument();
    });
  });

  it('in LOCALIMPORT mode, the unlisted channel button is not available', async () => {
    const store = makeAvailableChannelsPageStore();
    store.commit('manageContent/wizard/SET_TRANSFER_TYPE', 'localimport');
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
});
