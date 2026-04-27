import { render, screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import SelectDriveModal from '../ManageContentPage/SelectTransferSourceModal/SelectDriveModal';
import { makeAvailableChannelsPageStore } from '../../__tests__/utils/makeStore';

SelectDriveModal.methods.refreshDriveList = jest.fn().mockResolvedValue();

function makeStore() {
  const store = makeAvailableChannelsPageStore();
  store.commit('manageContent/wizard/SET_DRIVE_LIST', [
    {
      id: 'unwritable_drive',
      metadata: { channels: [{ id: 'installed_channel' }] },
      name: 'Unwritable',
      writable: false,
    },
    {
      id: 'writable_importable_drive',
      metadata: { channels: [{ id: 'channel_1', version: 1 }] },
      name: 'Writable and Importable',
      writable: true,
    },
    {
      id: 'incompatible_chanel_drive',
      metadata: { channels: [{ id: 'channel_2', version: 1 }] },
      name: 'Incompatible Channel',
      writable: true,
    },
    {
      id: 'no_content_drive',
      metadata: { channels: [] },
      name: 'Writable and Importable',
      writable: true,
    },
  ]);
  return store;
}

const renderComponent = (options = {}) => {
  const { store, data } = options;
  return render(SelectDriveModal, {
    props: { mode: 'import' },
    data() {
      return { ...data };
    },
    store: store || makeStore(),
  });
};

describe('SelectDriveModal', () => {
  let store;

  beforeEach(() => {
    store = makeStore();
  });

  function setTransferType(transferType) {
    store.commit('manageContent/wizard/SET_TRANSFER_TYPE', transferType);
  }

  it('when drive list is loading, show a message', async () => {
    renderComponent({ store, data: { driveStatus: 'LOADING' } });
    expect(screen.getByText('Finding local drives…')).toBeInTheDocument();
  });

  it('when drive list is loaded, it shows the drive-list component', () => {
    renderComponent({ store });
    expect(screen.getByText('Writable and Importable')).toBeInTheDocument();
    expect(screen.queryByText('Finding local drives…')).not.toBeInTheDocument();
  });

  it('in import mode, drive-list only shows drives with content', () => {
    setTransferType('localimport');
    renderComponent({ store });

    expect(screen.getAllByRole('radio')).toHaveLength(3);
    expect(screen.getByText('Writable and Importable')).toBeInTheDocument();
  });

  it('in import more mode, drive-list only shows drives with a compatible channel', () => {
    setTransferType('localimport');
    const channel = { id: 'channel_1', version: 1, available: true };
    store.commit('manageContent/wizard/SET_TRANSFERRED_CHANNEL', channel);
    store.state.manageContent.channelList = [{ ...channel }];
    renderComponent({ store });
    expect(screen.getByText('Writable and Importable')).toBeInTheDocument();
  });

  it('in import more mode, drive-list hides drives with an incompatible channel', () => {
    setTransferType('localimport');
    const channel = { id: 'channel_2', version: 6, available: true };
    store.commit('manageContent/wizard/SET_TRANSFERRED_CHANNEL', channel);
    store.state.manageContent.channelList = [{ ...channel }];
    renderComponent({ store });
    expect(screen.queryByText('Incompatible Channel')).not.toBeInTheDocument();
  });

  it('in export mode, drive-list only shows drives that are writable', () => {
    setTransferType('localexport');
    renderComponent({ store });

    // 2 writable drives with same name
    expect(screen.getAllByText('Writable and Importable')).toHaveLength(2);
    expect(screen.queryByText('Unwritable')).not.toBeInTheDocument();
  });

  it('in import mode, if there are no drives with content, there is an empty state', () => {
    setTransferType('localimport');
    store.state.manageContent.wizard.driveList.forEach(d => {
      d.metadata.channels = [];
    });
    renderComponent({ store });
    expect(
      screen.getByText(
        'No USB or network drives with Kolibri resources are connected to the server.',
      ),
    ).toBeInTheDocument();
  });

  it('in export mode, if there are no writable drives, there is an empty state', () => {
    setTransferType('localexport');
    store.state.manageContent.wizard.driveList.forEach(d => {
      d.writable = false;
    });
    renderComponent({ store });
    expect(
      screen.getByText('Could not find a writable drive connected to the server'),
    ).toBeInTheDocument();
  });

  it('when a drive is selected, "Continue" button is enabled', async () => {
    renderComponent({ store });
    const radio = screen.getAllByRole('radio')[0];
    await userEvent.click(radio);
    expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled();
  });

  it('when no drive is selected, "Continue" button is disabled', () => {
    renderComponent({ store });
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  });
});
