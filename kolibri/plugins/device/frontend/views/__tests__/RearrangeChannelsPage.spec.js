import { render, screen, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import client from 'kolibri/client';
import urls from 'kolibri/urls';
import { createTranslator } from 'kolibri/utils/i18n';
import useUser, { useUserMock } from 'kolibri/composables/useUser'; // eslint-disable-line
import useSnackbar, { useSnackbarMock } from 'kolibri/composables/useSnackbar'; // eslint-disable-line
import { dragSortStrings } from 'kolibri-common/components/draggable/dragSortStrings';
import DeviceChannelResource from '../../apiResources/deviceChannel';
import RearrangeChannelsPage, { pageTitleStrings } from '../RearrangeChannelsPage';
import makeStore from '../../__tests__/utils/makeStore';
import router from './testRouter';

jest.mock('kolibri/client');
jest.mock('kolibri/urls');
jest.mock('kolibri/composables/useUser');
jest.mock('kolibri/composables/useSnackbar');
jest.mock('../../apiResources/deviceChannel', () => ({
  list: jest.fn(),
}));

const { moveItemUpLabel$, moveItemDownLabel$ } = dragSortStrings;
const { successNotification$, failureNotification$ } = createTranslator(
  RearrangeChannelsPage.name,
  RearrangeChannelsPage.$trs,
);

const CHANNEL_1 = { id: '1', name: 'Channel 1' };
const CHANNEL_2 = { id: '2', name: 'Channel 2' };

describe('RearrangeChannelsPage', () => {
  const createSnackbar = jest.fn();

  beforeEach(() => {
    useUser.mockImplementation(() => useUserMock({ canManageContent: true }));
    useSnackbar.mockImplementation(() => useSnackbarMock({ createSnackbar }));
    DeviceChannelResource.list.mockResolvedValue([CHANNEL_1, CHANNEL_2]);
    urls['kolibri:kolibri.plugins.device:devicechannelorder'] = jest
      .fn()
      .mockReturnValue('/api/mock/devicechannelorder/');
    client.mockResolvedValue({});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  function renderPage() {
    return render(RearrangeChannelsPage, { store: makeStore(), ...router });
  }

  async function renderWithChannels() {
    renderPage();
    await screen.findByText(CHANNEL_1.name);
    await screen.findByText(CHANNEL_2.name);
  }

  // Both channels are always present; only their relative DOM order changes.
  function channel1IsBeforeChannel2() {
    const first = screen.getByText(CHANNEL_1.name);
    const second = screen.getByText(CHANNEL_2.name);
    return Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING);
  }

  it('titles the tab with the page title, also its only h1', async () => {
    document.title = '';
    renderPage();
    await waitFor(() => {
      expect(document.title).toBe(`${pageTitleStrings.editChannelOrderTitle$()} - Kolibri`);
    });
    const headings = screen.queryAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent(pageTitleStrings.editChannelOrderTitle$());
  });

  it('shows the channels once they have loaded', async () => {
    await renderWithChannels();
    expect(channel1IsBeforeChannel2()).toBe(true);
  });

  it('the first item has no "move up" button, and the last item has no "move down" button', async () => {
    await renderWithChannels();
    expect(
      screen.queryByRole('button', { name: moveItemUpLabel$({ item: CHANNEL_1.name }) }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: moveItemDownLabel$({ item: CHANNEL_1.name }) }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: moveItemUpLabel$({ item: CHANNEL_2.name }) }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: moveItemDownLabel$({ item: CHANNEL_2.name }) }),
    ).not.toBeInTheDocument();
  });

  it('moving the first channel down reorders the list, saves the new order, and notifies the user', async () => {
    await renderWithChannels();

    await userEvent.click(
      screen.getByRole('button', { name: moveItemDownLabel$({ item: CHANNEL_1.name }) }),
    );

    expect(channel1IsBeforeChannel2()).toBe(false);
    await waitFor(() => {
      expect(client).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          data: [CHANNEL_2.id, CHANNEL_1.id],
        }),
      );
      expect(createSnackbar).toHaveBeenCalledWith(successNotification$());
    });
  });

  it('moving the second channel up reorders the list the same way', async () => {
    await renderWithChannels();

    await userEvent.click(
      screen.getByRole('button', { name: moveItemUpLabel$({ item: CHANNEL_2.name }) }),
    );

    expect(channel1IsBeforeChannel2()).toBe(false);
    await waitFor(() => {
      expect(client).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          data: [CHANNEL_2.id, CHANNEL_1.id],
        }),
      );
    });
  });

  it('reverts the order and notifies the user when saving the new order fails', async () => {
    client.mockRejectedValue(new Error('network error'));
    await renderWithChannels();

    await userEvent.click(
      screen.getByRole('button', { name: moveItemDownLabel$({ item: CHANNEL_1.name }) }),
    );

    await waitFor(() => {
      expect(createSnackbar).toHaveBeenCalledWith(failureNotification$());
    });
    expect(channel1IsBeforeChannel2()).toBe(true);
  });
});
