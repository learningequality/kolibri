/* eslint-env mocha */
import Vue from 'vue-test'; // eslint-disable-line
import Vuex from 'vuex';
import assert from 'assert';
import { mount } from 'avoriaz';
import sinon from 'sinon';
import SelectDriveModal from '../../views/manage-content-page/wizards/select-drive-modal';
import { wizardState } from '../../state/getters';
import coreModal from 'kolibri.coreVue.components.coreModal';

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
  return new Vuex.Store({
    state: {
      pageState: {
        wizardState: {
          page: '',
          meta: {
            transferType: 'localimport',
          },
          driveListLoading: false,
          driveList: [
            {
              id: 'unwritable_drive',
              metadata: { channels: [{ id: 'installed_channel' }] },
              name: 'Unwritable',
              writable: false,
            },
            {
              id: 'writable_importable_drive',
              metadata: { channels: [{ id: 'channel_1' }] },
              name: 'Writable and Importable',
              writable: true,
            },
            {
              id: 'no_content_drive',
              metadata: { channels: [] },
              name: 'Writable and Importable',
              writable: true,
            },
          ],
        },
      },
    },
  });
}

function getElements(wrapper) {
  return {
    titleText: () => wrapper.first(coreModal).getProp('title'),
    driveListLoading: () => wrapper.find('.drive-list-loading'),
    driveListLoadingText: () => wrapper.first('.drive-list-loading').text().trim(),
    driveListContainer: () => wrapper.find('.drive-list'),
    writableImportableRadio: () => wrapper.find('input[value="writable_importable_drive"]'),
    noContentRadio: () => wrapper.find('input[value="no_content_drive"]'),
    unwritableRadio: () => wrapper.find('input[value="unwritable_drive"]'),
    cancelButton: () => wrapper.find('.buttons button')[0],
    continueButton: () => wrapper.find('.buttons button')[1],
  }
}

describe('selectDriveModal component', () => {
  it('when importing, shows the correct title', () => {
    const wrapper = makeWrapper();
    const { titleText } = getElements(wrapper);
    assert.equal(titleText(), 'Select a drive');
  });

  it('when importing, shows the correct title', () => {
    const store = makeStore();
    wizardState(store.state).meta.transferType = 'localexport';
    const wrapper = makeWrapper({ store });
    const { titleText } = getElements(wrapper);
    assert.equal(titleText(), 'Select an export destination');
  });

  it('drive labels show the available space', () => {

  });

  it('when drive list is loading, show a message', () => {
    const store = makeStore();
    wizardState(store.state).driveListLoading =  true;
    const wrapper = makeWrapper({ store });
    const { driveListLoadingText } = getElements(wrapper);
    assert.equal(driveListLoadingText(), 'Finding local drives…');
  });

  it('when drive list is loaded, it shows the drive-list component ', () => {
    const store = makeStore();
    const wrapper = makeWrapper({ store });
    const { driveListContainer, driveListLoading } = getElements(wrapper);
    assert(driveListContainer()[0].is('div'));
    assert.deepEqual(driveListLoading(), []);
  });

  it('in import mode, drive-list only shows the drives with content', () => {
    const store = makeStore();
    const wrapper = makeWrapper({ store });
    const { writableImportableRadio, noContentRadio } = getElements(wrapper);
    assert(writableImportableRadio()[0].is('input'));
    assert.deepEqual(noContentRadio(), []);
  });

  it('in export mode, drive-list only shows drives that are writable', () => {
    const store = makeStore();
    wizardState(store.state).meta.transferType = 'localexport';
    const wrapper = makeWrapper({ store });
    const { writableImportableRadio, noContentRadio, unwritableRadio } = getElements(wrapper);
    assert(writableImportableRadio()[0].is('input'));
    assert(noContentRadio()[0].is('input'));
    assert.deepEqual(unwritableRadio(), []);
  });

  it('in import mode, if there are no drives with content, there is an empty state', () => {
    const store = makeStore();
    wizardState(store.state).driveList.forEach(d => { d.metadata.channels = []; });
    const wrapper = makeWrapper({ store });
    const driveListText = wrapper.find('.drive-list h2');
    assert.equal(driveListText[0].text().trim(), 'No drives were detected');
  });

  it('in export mode, if there are no writable drives, there is an empty state', () => {
    const store = makeStore();
    wizardState(store.state).driveList.forEach(d => { d.writable = false; });
    wizardState(store.state).meta.transferType = 'localexport';
    const wrapper = makeWrapper({ store });
    const driveListText = wrapper.find('.drive-list h2');
    assert.equal(driveListText[0].text().trim(), 'No drives were detected');
  });

  it('when no drive is selected, "Continue" button is disabled', () => {
    const store = makeStore();
    const wrapper = makeWrapper({ store });
    const { continueButton } = getElements(wrapper);
    assert.equal(continueButton().getAttribute('disabled'), 'disabled');
  });

  it('when a drive is selected, "Continue" button is enabled', () => {
    const store = makeStore();
    const wrapper = makeWrapper({ store });
    const { continueButton, writableImportableRadio } = getElements(wrapper);
    writableImportableRadio()[0].trigger('click');
    return wrapper.vm.$nextTick()
      .then(() => {
        assert.equal(continueButton().hasAttribute('disabled'), false);
      });
  });

  it('clicking "Continue" triggers a "transitionWizardPage" action', () => {
    const store = makeStore();
    const wrapper = makeWrapper({ store });
    const transitionStub = sinon.stub(wrapper.vm, 'transitionWizardPage');
    const { continueButton, writableImportableRadio } = getElements(wrapper);
    writableImportableRadio()[0].trigger('click');
    return wrapper.vm.$nextTick()
      .then(() => {
        continueButton().trigger('click');
      })
      .then(() => {
        // same parameters for import or export flow
        sinon.assert.calledWith(transitionStub, 'forward', { driveId: 'writable_importable_drive' });
      });
  });

  it('clicking "Cancel" triggers a "transitionWizardPage" action', () => {
    const store = makeStore();
    const wrapper = makeWrapper({ store });
    const transitionStub = sinon.stub(wrapper.vm, 'transitionWizardPage');
    const { cancelButton } = getElements(wrapper);
    cancelButton().trigger('click');
    return wrapper.vm.$nextTick()
      .then(() => {
        sinon.assert.calledWith(transitionStub, 'cancel');
      });
  });
});
