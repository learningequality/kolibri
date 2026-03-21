// Tests for the RearrangeChannelsPage - where admins can drag/reorder
// channels on the device. Migrated to Vue Testing Library so we test
// what the user sees rather than peeking at internal component state.

import { render, screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import useUser, { useUserMock } from 'kolibri/composables/useUser'; // eslint-disable-line
import useSnackbar, { useSnackbarMock } from 'kolibri/composables/useSnackbar'; // eslint-disable-line
import makeStore from '../../__tests__/utils/makeStore';
import RearrangeChannelsPage from '../RearrangeChannelsPage';

jest.mock('../../composables/useContentTasks');
jest.mock('kolibri/composables/useUser');
jest.mock('kolibri/composables/useSnackbar');

// Stub out the API calls so tests don't hit the network
RearrangeChannelsPage.methods.postNewOrder = () => Promise.resolve();
RearrangeChannelsPage.methods.fetchChannels = () => {
  return Promise.resolve([
    { id: '1', name: 'Channel 1' },
    { id: '2', name: 'Channel 2' },
  ]);
};

const createSnackbar = jest.fn();

beforeAll(() => {
  useSnackbar.mockImplementation(() => useSnackbarMock({ createSnackbar }));
});

async function renderComponent() {
  const store = makeStore();
  useUser.mockImplementation(() => useUserMock({ canManageContent: true }));
  const result = render(RearrangeChannelsPage, { store });
  // Wait for fetchChannels to resolve and channels to render
  await global.flushPromises();
  return result;
}

describe('RearrangeChannelsPage', () => {
  // Basic smoke test - page should load and show the channel list
  it('shows both channels after loading', async () => {
    await renderComponent();
    expect(screen.getByText('Channel 1')).toBeInTheDocument();
    expect(screen.getByText('Channel 2')).toBeInTheDocument();
  });

  // After a successful reorder, user should get a confirmation message
  it('shows a success message after a successful reorder', async () => {
    const { component } = await renderComponent();
    component.postNewOrder = jest.fn().mockResolvedValue();
    const moveUpButtons = screen.getAllByRole('button', { name: /move up/i });
    await userEvent.click(moveUpButtons[1]);
    await global.flushPromises();
    expect(createSnackbar).toHaveBeenCalledWith('Channel order saved');
  });

  // If the save fails, we tell the user AND revert to the old order
  // so they're not left with a confusing half-saved state
  it('shows an error message and resets order after a failed reorder', async () => {
    const { component } = await renderComponent();
    component.postNewOrder = jest.fn().mockRejectedValue();
    const moveUpButtons = screen.getAllByRole('button', { name: /move up/i });
    await userEvent.click(moveUpButtons[1]);
    await global.flushPromises();
    expect(createSnackbar).toHaveBeenCalledWith(
      'There was a problem reordering the channels'
    );
    // Original order should be restored after the error
    const channelNames = screen.getAllByRole('listitem').map(el => el.textContent);
    expect(channelNames[0]).toContain('Channel 1');
    expect(channelNames[1]).toContain('Channel 2');
  });
});
