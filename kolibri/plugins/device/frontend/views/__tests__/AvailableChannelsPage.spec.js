// Tests for the AvailableChannelsPage - the page that shows channels
// available for import from a drive or remote source. Migrated to
// Vue Testing Library to focus on user-facing behavior instead of
// digging into component internals.

import { render, screen, fireEvent } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import AvailableChannelsPage from '../AvailableChannelsPage';
import { makeAvailableChannelsPageStore } from '../../__tests__/utils/makeStore';
import VueRouter from 'vue-router';

jest.mock('kolibri/urls');
jest.mock('kolibri/client');

const routes = [
  { name: 'AVAILABLE_CHANNELS', path: '/content/channels' },
  { name: 'MANAGE_CONTENT_PAGE', path: '/content' },
  { name: 'SELECT_CONTENT', path: '/content/channel/:channel_id?' },
];

function renderComponent(options = {}) {
  const store = options.store || makeAvailableChannelsPageStore();
  const router = new VueRouter({ routes });
  return render(AvailableChannelsPage, {
    store,
    router,
    ...options,
  });
}

function setTransferType(store, transferType) {
  store.commit('manageContent/wizard/SET_TRANSFER_TYPE', transferType);
}

describe('availableChannelsPage', () => {
  // Remote import is the only mode that supports unlisted/private channels via token
  it('in REMOTEIMPORT mode, the unlisted channel button is visible', async () => {
    const store = makeAvailableChannelsPageStore();
    setTransferType(store, 'remoteimport');
    renderComponent({ store });
    expect(screen.getByTestId('token-button')).toBeInTheDocument();
  });

  // Clicking the token button should open the modal for entering a channel token
  it('clicking the unlisted channel button opens the channel token modal', async () => {
    const store = makeAvailableChannelsPageStore();
    setTransferType(store, 'remoteimport');
    renderComponent({ store });
    const button = screen.getByTestId('token-button');
    await userEvent.click(button);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  // Local export mode doesn't support unlisted channels at all
  it('in LOCALEXPORT mode, the unlisted channel button is not visible', () => {
    const store = makeAvailableChannelsPageStore();
    setTransferType(store, 'localexport');
    renderComponent({ store });
    expect(screen.queryByTestId('token-button')).not.toBeInTheDocument();
  });

  // Title should always say "Select resources for import" regardless of source
  it('in LOCALIMPORT mode, the page title is correct', () => {
    const store = makeAvailableChannelsPageStore();
    setTransferType(store, 'localimport');
    const selectedDrive = store.state.manageContent.wizard.driveList.find(
      ({ id }) => id === 'f9e29616935fbff37913ed46bf20e2c0'
    );
    store.state.manageContent.wizard.selectedDrive = selectedDrive;
    renderComponent({ store });
    expect(screen.getByTestId('title')).toHaveTextContent('Select resources for import');
  });

  it('in REMOTEIMPORT mode, the page title is correct', () => {
    const store = makeAvailableChannelsPageStore();
    setTransferType(store, 'remoteimport');
    renderComponent({ store });
    expect(screen.getByTestId('title')).toHaveTextContent('Select resources for import');
  });

  // The store has 4 channels set up -> the count in the UI should reflect that
  it('shows the correct number of channels available', () => {
    const store = makeAvailableChannelsPageStore();
    setTransferType(store, 'localimport');
    renderComponent({ store });
    expect(screen.getByTestId('available')).toHaveTextContent('4 channels available');
  });

  // Filters are only useful when there are channels to filter -> hide them otherwise
  it('if there are no channels, filters do not appear', () => {
    const store = makeAvailableChannelsPageStore();
    store.commit('manageContent/wizard/SET_AVAILABLE_CHANNELS', []);
    renderComponent({ store });
    expect(screen.queryByTestId('filters')).not.toBeInTheDocument();
  });

  // Default state with no filters -> all 4 channels should be visible
  it('with no filters applied, all channels are visible', () => {
    const store = makeAvailableChannelsPageStore();
    setTransferType(store, 'localimport');
    renderComponent({ store });
    expect(screen.getByText('Awesome Channel')).toBeInTheDocument();
    expect(screen.getByText('Bird Channel')).toBeInTheDocument();
    expect(screen.getByText('Hunden Channel')).toBeInTheDocument();
    expect(screen.getByText('Kaetze Channel')).toBeInTheDocument();
  });

  // Typing in the search box should narrow down the list to matching channels
  it('with a keyword filter, only matching channels are visible', async () => {
    renderComponent();
    const searchInput = screen.getByRole('textbox');
    await userEvent.type(searchInput, 'bir ch');
    expect(screen.getByText('Bird Channel')).toBeInTheDocument();
    expect(screen.queryByText('Awesome Channel')).not.toBeInTheDocument();
    expect(screen.queryByText('Hunden Channel')).not.toBeInTheDocument();
    expect(screen.queryByText('Kaetze Channel')).not.toBeInTheDocument();
  });
});
