/* eslint-env mocha */
import { expect } from 'chai';
import Vue from 'vue-test'; // eslint-disable-line
import { mount } from '@vue/test-utils';
import sinon from 'sinon';
import coreModal from 'kolibri.coreVue.components.coreModal';
import UiAlert from 'keen-ui/src/UiAlert';
import SelectDriveModal from '../../src/views/manage-content-page/select-transfer-source-modal/select-drive-modal';
import { wizardState } from '../../src/state/getters';
import { makeAvailableChannelsPageStore } from '../utils/makeStore';

SelectDriveModal.vuex.actions.refreshDriveList = () => Promise.resolve();

function makeWrapper(options = {}) {
  const { props = {}, store } = options;
  return mount(SelectDriveModal, {
    propsData: {
      mode: 'import',
      ...props,
    },
    store: store || makeStore(),
  });
}

function makeStore() {
  const store = makeAvailableChannelsPageStore();
  store.dispatch('SET_DRIVE_LIST', [
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

// prettier-ignore
function getElements(wrapper) {
  return {
    titleText: () => wrapper.find(coreModal).props().title,
    driveListLoading: () => wrapper.find('.drive-list-loading'),
    driveListLoadingText: () => wrapper.find('.drive-list-loading').text().trim(),
    driveListContainer: () => wrapper.find('.drive-list'),
    writableImportableRadio: () => wrapper.find('input[value="writable_importable_drive"]'),
    noContentRadio: () => wrapper.find('input[value="no_content_drive"]'),
    unwritableRadio: () => wrapper.find('input[value="unwritable_drive"]'),
    incompatibleRadio: () => wrapper.find('input[value="incompatible_chanel_drive"]'),
    cancelButton: () => wrapper.find('.core-modal-buttons button'),
    continueButton: () => wrapper.findAll('.core-modal-buttons button').at(1),
    UiAlerts: () => wrapper.find(UiAlert),
    findingLocalDrives: () => wrapper.find('.finding-local-drives'),
  };
}

describe('selectDriveModal component', () => {
  let store;

  beforeEach(() => {
    store = makeStore();
  });

  function setTransferType(transferType) {
    store.state.pageState.wizardState.transferType = transferType;
  }

  it('when drive list is loading, show a message', () => {
    const wrapper = makeWrapper({ store });
    return wrapper.vm.$nextTick().then(() => {
      const alert = wrapper.find(UiAlert);
      expect(alert.text().trim()).to.equal('Finding local drives…');
    });
  });

  it('when drive list is loaded, it shows the drive-list component ', () => {
    const wrapper = makeWrapper({ store });
    const { driveListContainer, driveListLoading } = getElements(wrapper);
    return wrapper.vm
      .$nextTick()
      .then(() => {
        return wrapper.vm.$nextTick();
      })
      .then(() => {
        expect(driveListContainer().is('div')).to.be.true;
        expect(driveListLoading().exists()).to.be.false;
      });
  });

  it('in import mode, drive-list only shows the drives with content', () => {
    setTransferType('localimport');
    const wrapper = makeWrapper({ store });
    const { writableImportableRadio, noContentRadio } = getElements(wrapper);
    expect(writableImportableRadio().is('input')).to.be.true;
    expect(noContentRadio().exists()).to.be.false;
  });

  it('in import more mode, drive-list only shows drives with a compatible channel', () => {
    setTransferType('localimport');
    const channel = {
      id: 'channel_1',
      version: 1,
    };
    store.dispatch('SET_TRANSFERRED_CHANNEL', channel);
    store.state.pageState.channelList = [{ ...channel }];
    const wrapper = makeWrapper({ store });
    const { writableImportableRadio } = getElements(wrapper);
    expect(writableImportableRadio().is('input')).to.be.true;
  });

  it('in import more mode, drive-list hides drives with an incompatible channel', () => {
    setTransferType('localimport');
    const channel = {
      id: 'channel_2',
      version: 6,
    };
    store.dispatch('SET_TRANSFERRED_CHANNEL', channel);
    store.state.pageState.channelList = [{ ...channel }];
    const wrapper = makeWrapper({ store });
    const { incompatibleRadio } = getElements(wrapper);
    expect(incompatibleRadio().exists()).to.be.false;
  });

  it('in export mode, drive-list only shows drives that are writable', () => {
    setTransferType('localexport');
    const wrapper = makeWrapper({ store });
    const { writableImportableRadio, noContentRadio, unwritableRadio } = getElements(wrapper);
    expect(writableImportableRadio().is('input')).to.be.true;
    expect(noContentRadio().is('input')).to.be.true;
    expect(unwritableRadio().exists()).to.be.false;
  });

  it('in import mode, if there are no drives with content, there is an empty state', () => {
    setTransferType('localimport');
    wizardState(store.state).driveList.forEach(d => {
      d.metadata.channels = [];
    });
    const wrapper = makeWrapper({ store });
    const driveListText = wrapper.find(UiAlert);
    const expectedMessage = 'No drives with Kolibri content are connected to the server';
    expect(driveListText.text().trim()).to.equal(expectedMessage);
  });

  it('in export mode, if there are no writable drives, there is an empty state', () => {
    setTransferType('localexport');
    wizardState(store.state).driveList.forEach(d => {
      d.writable = false;
    });
    const wrapper = makeWrapper({ store });
    const driveListText = wrapper.find(UiAlert);
    const expectedMessage = 'No drives that can be written to are connected to the server';
    expect(driveListText.text().trim()).to.equal(expectedMessage);
  });

  it('when no drive is selected, "Continue" button is disabled', () => {
    const wrapper = makeWrapper({ store });
    const { continueButton } = getElements(wrapper);
    expect(continueButton().attributes().disabled).to.equal('disabled');
  });

  it('when a drive is selected, "Continue" button is enabled', () => {
    const wrapper = makeWrapper({ store });
    const { continueButton, writableImportableRadio } = getElements(wrapper);
    writableImportableRadio().trigger('change');
    return wrapper.vm.$nextTick().then(() => {
      expect(continueButton().attributes().disabled).to.equal(undefined);
    });
  });

  it('clicking "Continue" triggers a "transitionWizardPage" action', () => {
    const wrapper = makeWrapper({ store });
    const transitionStub = sinon.stub(wrapper.vm, 'goForwardFromSelectDriveModal');
    const { continueButton, writableImportableRadio } = getElements(wrapper);
    writableImportableRadio().trigger('change');
    return wrapper.vm.$nextTick().then(() => {
      continueButton().trigger('click');
      // same parameters for import or export flow
      sinon.assert.calledWith(transitionStub, {
        driveId: 'writable_importable_drive',
        forExport: false,
      });
    });
  });

  it('clicking "Cancel" triggers a "cancel" event', () => {
    const wrapper = makeWrapper({ store });
    const { cancelButton } = getElements(wrapper);
    cancelButton().trigger('click');
    expect(wrapper.emitted().cancel).to.have.lengthOf(1);
  });

  // not tested
  // * when resfreshDriveList fails
});
