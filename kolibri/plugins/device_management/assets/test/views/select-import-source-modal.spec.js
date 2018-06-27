import { mount } from '@vue/test-utils';
import SelectTransferSourceModal from '../../src/views/manage-content-page/select-transfer-source-modal';
import { makeAvailableChannelsPageStore } from '../utils/makeStore';

function makeWrapper(options) {
  const wrapper = mount(SelectTransferSourceModal, {
    ...options,
    stubs: ['selectImportSourceModal', 'selectDriveModal'],
  });
  const els = {
    titleText: () => wrapper.find({ name: 'kModal' }).props().title,
  };
  return { wrapper, els };
}

describe('selectImportSourceModal component', () => {
  let store;

  beforeEach(() => {
    store = makeAvailableChannelsPageStore();
  });

  it('when at select source stage, shows correct channel', () => {
    store.commit('SET_WIZARD_PAGENAME', 'SELECT_IMPORT_SOURCE');
    const { wrapper, els } = makeWrapper({ store });
    wrapper.vm.$nextTick().then(() => {
      expect(els.titleText()).toEqual('Import from');
    });
  });

  it('when importing, shows the correct title', () => {
    store.commit('SET_WIZARD_PAGENAME', 'SELECT_DRIVE');
    store.commit('SET_TRANSFER_TYPE', 'localimport');
    const { wrapper, els } = makeWrapper({ store });
    wrapper.vm.$nextTick().then(() => {
      expect(els.titleText()).toEqual('Select a drive');
    });
  });

  it('when exporting, shows the correct title', () => {
    store.commit('SET_WIZARD_PAGENAME', 'SELECT_DRIVE');
    store.commit('SET_TRANSFER_TYPE', 'localexport');
    const { wrapper, els } = makeWrapper({ store });
    wrapper.vm.$nextTick().then(() => {
      expect(els.titleText()).toEqual('Select an export destination');
    });
  });

  // not tested:
  // whether correct form is showing
});
