import { render, screen, waitFor, fireEvent } from '@testing-library/vue';
import VueRouter from 'vue-router';
import useUser, { useUserMock } from 'kolibri/composables/useUser'; // eslint-disable-line import-x/named
import useSnackbar, { useSnackbarMock } from 'kolibri/composables/useSnackbar'; // eslint-disable-line import-x/named
import { createTranslator } from 'kolibri/utils/i18n';
import { dragSortStrings } from 'kolibri-common/components/draggable/dragSortStrings';
import client from 'kolibri/client';
import urls from 'kolibri/urls';
import RearrangeChannelsPage from '../RearrangeChannelsPage';
import DeviceChannelResource from '../../apiResources/deviceChannel';
import makeStore from '../../__tests__/utils/makeStore';
import { PageNames } from '../../constants';

const { moveItemUpLabel$, moveItemDownLabel$ } = dragSortStrings;

const { instructions$, noChannels$, successNotification$, failureNotification$ } = createTranslator(
  RearrangeChannelsPage.name,
  RearrangeChannelsPage.$trs,
);

jest.mock('../../composables/useContentTasks');
jest.mock('kolibri-common/composables/usePageLoading');

jest.mock('kolibri/composables/useUser');
jest.mock('kolibri/composables/useSnackbar');
jest.mock('kolibri/client');
jest.mock('kolibri/urls');
jest.mock('../../apiResources/deviceChannel');

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
    DeviceChannelResource.list.mockResolvedValue(MOCK_CHANNELS);
    urls.__setUrl('/fake/url/');
    client.mockResolvedValue({});
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
    DeviceChannelResource.list.mockResolvedValue([]);
    await renderComponent();
    await waitFor(() => {
      expect(screen.getByText(noChannels$())).toBeInTheDocument();
    });
  });

  it('handles a successful @sort event properly', async () => {
    await renderComponent();
    await waitFor(() => screen.getByText(MOCK_CHANNELS[0].name));
    // Move the first channel down using its accessible reorder button,
    // instead of simulating a sortablejs drag-and-drop event.
    const moveDownBtn = screen.getByRole('button', {
      name: moveItemDownLabel$({ item: MOCK_CHANNELS[0].name }),
    });
    await fireEvent.click(moveDownBtn);
    await waitFor(() => {
      expect(createSnackbar).toHaveBeenCalledWith(successNotification$());
    });
    const channelNames = MOCK_CHANNELS.map(channel => channel.name);
    const matchesChannelName = text => channelNames.includes(text.trim());
    const titles = screen.getAllByText(matchesChannelName).map(el => el.textContent.trim());
    expect(titles).toEqual([MOCK_CHANNELS[1].name, MOCK_CHANNELS[0].name]);
  });

  it('handles a moveUp event properly', async () => {
    await renderComponent();
    await waitFor(() => screen.getByText(MOCK_CHANNELS[0].name));

    const upButtons = screen.getAllByRole('button', {
      name: moveItemUpLabel$({ item: MOCK_CHANNELS[1].name }),
    });
    await fireEvent.click(upButtons[0]);

    await waitFor(() => {
      expect(createSnackbar).toHaveBeenCalledWith(successNotification$());
    });
    const channelNames = MOCK_CHANNELS.map(channel => channel.name);
    const matchesChannelName = text => channelNames.includes(text.trim());
    const titles = screen.getAllByText(matchesChannelName).map(el => el.textContent.trim());
    expect(titles).toEqual([MOCK_CHANNELS[1].name, MOCK_CHANNELS[0].name]);
  });

  it('handles a failed @sort event properly', async () => {
    client.mockRejectedValue({});
    await renderComponent();
    await waitFor(() => screen.getByText(MOCK_CHANNELS[0].name));

    const moveDownBtn = screen.getByRole('button', {
      name: moveItemDownLabel$({ item: MOCK_CHANNELS[0].name }),
    });
    await fireEvent.click(moveDownBtn);

    await waitFor(() => {
      expect(createSnackbar).toHaveBeenCalledWith(failureNotification$());
    });
    await waitFor(() => {
      const channelNames = MOCK_CHANNELS.map(channel => channel.name);
      const matchesChannelName = text => channelNames.includes(text.trim());
      const titles = screen.getAllByText(matchesChannelName).map(el => el.textContent.trim());
      expect(titles).toEqual([MOCK_CHANNELS[0].name, MOCK_CHANNELS[1].name]);
    });
  });

  it('handles a moveDown event properly', async () => {
    await renderComponent();
    await waitFor(() => screen.getByText(MOCK_CHANNELS[0].name));

    const downButtons = screen.getAllByRole('button', {
      name: moveItemDownLabel$({ item: MOCK_CHANNELS[0].name }),
    });
    await fireEvent.click(downButtons[0]);

    await waitFor(() => {
      expect(createSnackbar).toHaveBeenCalledWith(successNotification$());
    });
    const channelNames = MOCK_CHANNELS.map(channel => channel.name);
    const matchesChannelName = text => channelNames.includes(text.trim());
    const titles = screen.getAllByText(matchesChannelName).map(el => el.textContent.trim());
    expect(titles).toEqual([MOCK_CHANNELS[1].name, MOCK_CHANNELS[0].name]);
  });
});
