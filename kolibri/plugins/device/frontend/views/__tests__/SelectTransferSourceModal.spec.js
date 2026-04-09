import { render, screen } from '@testing-library/vue';
import SelectTransferSourceModal from '../ManageContentPage/SelectTransferSourceModal';
import { makeAvailableChannelsPageStore } from '../../__tests__/utils/makeStore';

const stubs = {
  SelectImportSourceModal: { template: '<div data-testid="select-import-source"></div>' },
  SelectDriveModal: { template: '<div data-testid="select-drive"></div>' },
};

describe('SelectTransferSourceModal', () => {
  let store;

  beforeEach(() => {
    store = makeAvailableChannelsPageStore();
  });

  it('when at select source stage, shows correct modal', () => {
    render(SelectTransferSourceModal, {
      props: { pageName: 'SELECT_IMPORT_SOURCE' },
      store,
      stubs,
    });
    expect(screen.getByTestId('select-import-source')).toBeInTheDocument();
    expect(screen.queryByTestId('select-drive')).not.toBeInTheDocument();
  });

  it('when exporting or local importing, shows the correct modal', () => {
    render(SelectTransferSourceModal, {
      props: { pageName: 'SELECT_DRIVE' },
      store,
      stubs,
    });
    expect(screen.getByTestId('select-drive')).toBeInTheDocument();
    expect(screen.queryByTestId('select-import-source')).not.toBeInTheDocument();
  });
});