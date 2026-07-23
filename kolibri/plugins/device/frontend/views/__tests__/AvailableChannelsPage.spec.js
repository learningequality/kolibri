import { render, screen, waitFor } from '@testing-library/vue';
import VueRouter from 'vue-router';
import { createTranslator } from 'kolibri/utils/i18n';
import AvailableChannelsPage from '../AvailableChannelsPage';
import FilteredChannelListContainer from '../ManageContentPage/FilteredChannelListContainer';
import { makeAvailableChannelsPageStore } from '../../__tests__/utils/makeStore';
import { PageNames } from '../../constants';

jest.mock('kolibri/urls');
jest.mock('kolibri/client');
jest.mock('kolibri-common/composables/usePageLoading');

const { channelTokenButtonLabel$, importResourcesHeader$ } = createTranslator(
  AvailableChannelsPage.name,
  AvailableChannelsPage.$trs,
);
const { numChannelsAvailable$ } = createTranslator(
  FilteredChannelListContainer.name,
  FilteredChannelListContainer.$trs,
);

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
});
