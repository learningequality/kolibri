import { render, screen } from '@testing-library/vue';
import SelectTransferSourceModal from '../ManageContentPage/SelectTransferSourceModal';
import SelectDriveModal from '../ManageContentPage/SelectTransferSourceModal/SelectDriveModal';
import { strings as importSourceStrings } from '../ManageContentPage/SelectTransferSourceModal/SelectImportSourceModal';
import { makeAvailableChannelsPageStore } from '../../__tests__/utils/makeStore';

jest.mock('kolibri/client');
jest.mock('kolibri/urls');

SelectDriveModal.methods.refreshDriveList = jest.fn().mockResolvedValue();

const { network$ } = importSourceStrings;

describe('SelectTransferSourceModal', () => {
  let store;

  beforeEach(() => {
    store = makeAvailableChannelsPageStore();
    store.commit('manageContent/wizard/SET_DRIVE_LIST', []);
  });

  it('when at select source stage, shows correct modal', () => {
    render(SelectTransferSourceModal, {
      props: { pageName: 'SELECT_IMPORT_SOURCE' },
      store,
    });
    expect(screen.getByText(network$())).toBeInTheDocument();
  });

  it('when exporting or local importing, shows the correct modal', () => {
    render(SelectTransferSourceModal, {
      props: { pageName: 'SELECT_DRIVE' },
      store,
    });
    expect(screen.queryByText(network$())).not.toBeInTheDocument();
  });
});
