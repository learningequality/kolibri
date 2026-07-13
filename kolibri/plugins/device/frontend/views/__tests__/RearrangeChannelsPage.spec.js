import { render, screen, waitFor, fireEvent } from '@testing-library/vue';
import VueRouter from 'vue-router';
import useUser, { useUserMock } from 'kolibri/composables/useUser'; // eslint-disable-line import-x/named
import useSnackbar, { useSnackbarMock } from 'kolibri/composables/useSnackbar'; // eslint-disable-line import-x/named
import { createTranslator } from 'kolibri/utils/i18n';
import RearrangeChannelsPage from '../RearrangeChannelsPage';
import makeStore from '../../__tests__/utils/makeStore';
import { PageNames } from '../../constants';

const { instructions$, noChannels$, successNotification$ } = createTranslator(
  RearrangeChannelsPage.name,
  RearrangeChannelsPage.$trs,
);

jest.mock('../../composables/useContentTasks');
jest.mock('kolibri-common/composables/usePageLoading');
jest.mock('kolibri-common/components/sortable/DragContainer', () => ({
  default: {
    name: 'DragContainer',
    props: ['items'],
    template: `
      <div>
        <button data-testid="trigger-sort" @click="$emit('sort', { newArray: [items[1], items[0]] })">
          Trigger Sort
        </button>
        <slot />
      </div>
    `,
  },
 }
));
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
    RearrangeChannelsPage.methods.fetchChannels = () => Promise.resolve(MOCK_CHANNELS);
    RearrangeChannelsPage.methods.postNewOrder = () => Promise.resolve();
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

    it('handles a successful @sort event properly', async () => {
      await renderComponent();
      await waitFor(() => screen.getByText(MOCK_CHANNELS[0].name));

      await fireEvent.click(screen.getByTestId('trigger-sort'));

      await waitFor(() => {
        expect(createSnackbar).toHaveBeenCalledWith(successNotification$());
      });
      const titles = screen
        .getAllByText(new RegExp(`^(${MOCK_CHANNELS[0].name}|${MOCK_CHANNELS[1].name})$`))
        .map(el => el.textContent);
      expect(titles).toEqual([MOCK_CHANNELS[1].name, MOCK_CHANNELS[0].name]);
    });
  });
