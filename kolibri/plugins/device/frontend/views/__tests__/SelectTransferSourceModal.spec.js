import { render, screen } from '@testing-library/vue';
import { createTranslator } from 'kolibri/utils/i18n';
import SelectTransferSourceModal from '../ManageContentPage/SelectTransferSourceModal';
import SelectDriveModal from '../ManageContentPage/SelectTransferSourceModal/SelectDriveModal';
import SelectImportSourceModal from '../ManageContentPage/SelectTransferSourceModal/SelectImportSourceModal';
import { makeAvailableChannelsPageStore } from '../../__tests__/utils/makeStore';

jest.mock('kolibri/client');
jest.mock('kolibri/urls');

SelectDriveModal.methods.refreshDriveList = jest.fn().mockResolvedValue();

const { network$ } = createTranslator(SelectImportSourceModal.name, SelectImportSourceModal.$trs);
const { selectDrive$ } = createTranslator(SelectDriveModal.name, SelectDriveModal.$trs);

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
    expect(screen.getByText(selectDrive$())).toBeInTheDocument();
  });
});
