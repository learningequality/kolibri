/* eslint-env mocha */
import Vue from 'vue-test'; // eslint-disable-line
import { expect } from 'chai';
import { mount } from '@vue/test-utils';
import SelectTransferSourceModal from '../../src/views/manage-content-page/select-transfer-source-modal';
import { makeAvailableChannelsPageStore } from '../utils/makeStore';

function makeWrapper(options) {
  const wrapper = mount(SelectTransferSourceModal, {
    ...options,
    stubs: ['selectImportSourceModal', 'selectDriveModal'],
  });
  const els = {
    titleText: () => wrapper.find({ name: 'coreModal' }).props().title,
  };
  return { wrapper, els };
}

describe('selectImportSourceModal component', () => {
  let store;

  beforeEach(() => {
    store = makeAvailableChannelsPageStore();
  });

  it('when at select source stage, shows correct channel', () => {
    store.dispatch('SET_WIZARD_PAGENAME', 'SELECT_IMPORT_SOURCE');
    const { els } = makeWrapper({ store });
    expect(els.titleText()).to.equal('Import from');
  });

  it('when importing, shows the correct title', () => {
    store.dispatch('SET_WIZARD_PAGENAME', 'SELECT_DRIVE');
    store.dispatch('SET_TRANSFER_TYPE', 'localimport');
    const { els } = makeWrapper({ store });
    expect(els.titleText()).to.equal('Select a drive');
  });

  it('when exporting, shows the correct title', () => {
    store.dispatch('SET_WIZARD_PAGENAME', 'SELECT_DRIVE');
    store.dispatch('SET_TRANSFER_TYPE', 'localexport');
    const { els } = makeWrapper({ store });
    expect(els.titleText()).to.equal('Select an export destination');
  });

  // not tested:
  // whether correct form is showing
});
