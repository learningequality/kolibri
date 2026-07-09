import { render, screen, waitFor } from '@testing-library/vue';
import VueRouter from 'vue-router';
import useUser, { useUserMock } from 'kolibri/composables/useUser'; // eslint-disable-line import-x/named
import useSnackbar, { useSnackbarMock } from 'kolibri/composables/useSnackbar'; // eslint-disable-line import-x/named
import { createTranslator } from 'kolibri/utils/i18n';
import RearrangeChannelsPage from '../RearrangeChannelsPage';
import makeStore from '../../__tests__/utils/makeStore';
import { PageNames } from '../../constants';

const { instructions$, noChannels$ } = createTranslator(
  RearrangeChannelsPage.name,
  RearrangeChannelsPage.$trs,
);

jest.mock('../../composables/useContentTasks');
jest.mock('kolibri/composables/useUser');
jest.mock('kolibri/composables/useSnackbar');

function createRouter() {
  return new VueRouter({
    routes: [
      { name: PageNames.REARRANGE_CHANNELS, path: '/content/reorder_channels' },
      { name: PageNames.MANAGE_CONTENT_PAGE, path: '/content' },
    ],
  });
}

const MOCK_CHANNELS = [
  { id: '1', name: 'Channel 1' },
  { id: '2', name: 'Channel 2' },
];

RearrangeChannelsPage.methods.postNewOrder = () => Promise.resolve();
RearrangeChannelsPage.methods.fetchChannels = () => Promise.resolve(MOCK_CHANNELS);

describe('RearrangeChannelsPage', () => {
  let createSnackbar;

  const renderComponent = async () => {
    createSnackbar = jest.fn();
    useUser.mockImplementation(() => useUserMock({ canManageContent: true }));
    useSnackbar.mockImplementation(() => useSnackbarMock({ createSnackbar }));

    const store = makeStore();
    const router = createRouter();
    await router.push({ name: PageNames.REARRANGE_CHANNELS });
    return render(RearrangeChannelsPage, { store, router });
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads the data on mount', async () => {
    await renderComponent();
    await waitFor(() => {
      expect(screen.getByText(MOCK_CHANNELS[0].name)).toBeInTheDocument();
      expect(screen.getByText(MOCK_CHANNELS[1].name)).toBeInTheDocument();
    });
  });

  it('shows the instructions text', async () => {
    await renderComponent();
    await waitFor(() => {
      expect(screen.getByText(instructions$())).toBeInTheDocument();
    });
  });

  it('shows a message when there are no channels', async () => {
    RearrangeChannelsPage.methods.fetchChannels = () => Promise.resolve([]);
    await renderComponent();
    await waitFor(() => {
      expect(screen.getByText(noChannels$())).toBeInTheDocument();
    });
  });
});
