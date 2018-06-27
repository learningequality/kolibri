import { shallowMount } from '@vue/test-utils';
import SelectTransferSourceModal from '../../src/views/manage-content-page/select-transfer-source-modal';
import { makeAvailableChannelsPageStore } from '../utils/makeStore';

function makeWrapper(options) {
  const wrapper = shallowMount(SelectTransferSourceModal, {
    ...options,
    stubs: {
      selectImportSourceModal: '<div data-test="select-import-source"></div>',
      selectDriveModal: '<div data-test="select-drive"></div>',
    },
  });
  const els = {
    titleText: () => wrapper.find({ name: 'kModal' }).props().title,
    selectImportSource: () => wrapper.find('[data-test="select-import-source"]'),
    selectDrive: () => wrapper.find('[data-test="select-drive"]'),
  };
  return { wrapper, els };
}

describe('selectImportSourceModal component', () => {
  let store;

  beforeEach(() => {
    store = makeAvailableChannelsPageStore();
  });

  it('when at select source stage, shows correct modal', () => {
    store.commit('SET_WIZARD_PAGENAME', 'SELECT_IMPORT_SOURCE');
    const { els } = makeWrapper({ store });
    expect(els.selectImportSource().exists()).toEqual(true);
    expect(els.selectDrive().exists()).toEqual(false);
  });

  it('when importing, shows the correct modal', () => {
    store.commit('SET_WIZARD_PAGENAME', 'SELECT_DRIVE');
    store.commit('SET_TRANSFER_TYPE', 'localimport');
    const { els } = makeWrapper({ store });
    expect(els.selectDrive().exists()).toEqual(true);
    expect(els.selectImportSource().exists()).toEqual(false);
  });

  it('when exporting, shows the correct modal', () => {
    store.commit('SET_WIZARD_PAGENAME', 'SELECT_DRIVE');
    store.commit('SET_TRANSFER_TYPE', 'localexport');
    const { els } = makeWrapper({ store });
    expect(els.selectDrive().exists()).toEqual(true);
    expect(els.selectImportSource().exists()).toEqual(false);
  });

  // not tested:
  // whether correct form is showing
});
