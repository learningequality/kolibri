/* eslint-env mocha */
import Vue from 'vue-test'; // eslint-disable-line
import Vuex from 'vuex';
import VueRouter from 'vue-router';
import assert from 'assert';
import { mount } from '@vue/test-utils';
import SelectContentPage from '../../src/views/select-content-page';
import { defaultChannel, contentNodeGranularPayload } from '../utils/data';
import { wizardState } from '../../src/state/getters';
import SelectedResourcesSize from '../../src/views/select-content-page/selected-resources-size';
import sinon from 'sinon';
import { importExportWizardState } from '../../src/state/wizardState';

SelectContentPage.vuex.actions.getAvailableSpaceOnDrive = () => {};

const router = new VueRouter({
  routes: [],
});

function makeStore() {
  return new Vuex.Store({
    state: {
      pageState: {
        channelList: [
          {
            ...defaultChannel,
            on_device_file_size: 2200000000,
            on_device_resources: 2000,
            available: true,
          },
        ],
        taskList: [],
        wizardState: {
          ...importExportWizardState(),
          transferredChannel: { ...defaultChannel },
          transferType: 'localimport',
          currentTopicNode: contentNodeGranularPayload(),
        },
      },
    },
  });
}

function makeWrapper(options) {
  const { store, props = {} } = options;
  return mount(SelectContentPage, {
    propsData: props,
    store: store || makeStore(),
    stubs: ['content-tree-viewer'],
    router,
  });
}

// prettier-ignore
function getElements(wrapper) {
  return {
    description: () => wrapper.find('.description').text().trim(),
    notificationsSection: () => wrapper.find('section.notifications'),
    onDeviceRows: () => wrapper.findAll('tr.on-device td'),
    resourcesSize: () => wrapper.find(SelectedResourcesSize),
    thumbnail: () => wrapper.find('.thumbnail'),
    title: () => wrapper.find('.title').text().trim(),
    totalSizeRows: () => wrapper.findAll('tr.total-size td'),
    treeView: () => wrapper.find('section.resources-tree-view'),
    updateSection: () => wrapper.find('.updates-available'),
    updateButton: () => wrapper.find('button[name="update"]'),
    version: () => wrapper.find('.version').text().trim(),
    versionAvailable: () => wrapper.find('.updates-available span').text().trim(),
  };
}

function updateMetaChannel(store, updates) {
  const { transferredChannel } = store.state.pageState.wizardState;
  store.state.pageState.wizardState.transferredChannel = {
    ...transferredChannel,
    ...updates,
  };
}

describe('selectContentPage', () => {
  let store;

  beforeEach(() => {
    store = makeStore();
  });

  it('shows the thumbnail, title, descripton, and version of the channel', () => {
    const fakeImage = 'data:image/png;base64,abcd1234';
    updateMetaChannel(store, { thumbnail: fakeImage });
    const wrapper = makeWrapper({ store });
    const { thumbnail, version, title, description } = getElements(wrapper);
    // prettier-ignore
    assert.equal(thumbnail().find('img').attributes().src, fakeImage);
    assert.equal(title(), 'Channel Title');
    assert.equal(version(), 'Version 20');
    assert.equal(description(), 'An awesome channel');
  });

  it('shows the total size of the channel', () => {
    const wrapper = makeWrapper({ store });
    const { totalSizeRows } = getElements(wrapper);
    const rows = totalSizeRows();
    assert.equal(rows.at(1).text(), '5,000');
    assert.equal(rows.at(2).text(), '4 GB');
  });

  it('if resources are on the device, it shows the total size of those', () => {
    const wrapper = makeWrapper({ store });
    const { onDeviceRows } = getElements(wrapper);
    const rows = onDeviceRows();
    assert.equal(rows.at(1).text(), '2,000');
    assert.equal(rows.at(2).text(), '2 GB');
  });

  it('if channel is not on device, it shows size and resources as 0', () => {
    updateMetaChannel(store, { id: 'not_awesome_channel' });
    const wrapper = makeWrapper({ store });
    const { onDeviceRows } = getElements(wrapper);
    const rows = onDeviceRows();
    assert.equal(rows.at(1).text(), '0');
    assert.equal(rows.at(2).text(), '0 B');
  });

  it('if a new version is available, a update notification and button appear', () => {
    updateMetaChannel(store, { version: 1000 });
    const wrapper = makeWrapper({ store });
    const { updateSection, notificationsSection, versionAvailable } = getElements(wrapper);
    assert.equal(updateSection().exists(), true);
    assert(notificationsSection().is('section'));
    // { useGrouping: false } intl option not working, but probably won't see such a large number
    assert.equal(versionAvailable(), 'Version 1,000 available');
  });

  it('in LOCALIMPORT, clicking the "update" button triggers a downloadChannelMetadata action', () => {
    updateMetaChannel(store, { version: 1000 });
    store.state.pageState.wizardState.transferType = 'localimport';
    store.state.pageState.wizardState.selectedDrive = {
      driveId: 'drive_1',
    };
    const wrapper = makeWrapper({ store });
    const { updateButton } = getElements(wrapper);
    const stub = sinon.stub(wrapper.vm, 'downloadChannelMetadata').returns(Promise.resolve());
    updateButton().trigger('click');
    sinon.assert.called(stub);
  });

  it('in REMOTEIMPORT, clicking the "update" button triggers a downloadChannelMetadata action', () => {
    updateMetaChannel(store, { version: 1000 });
    wizardState(store.state).transferType = 'remoteimport';
    const wrapper = makeWrapper({ store });
    const { updateButton } = getElements(wrapper);
    const stub = sinon.stub(wrapper.vm, 'downloadChannelMetadata').returns(Promise.resolve());
    updateButton().trigger('click');
    sinon.assert.calledWith(stub);
  });

  it('if a new version is not available, then no notification/button appear', () => {
    updateMetaChannel(store, { version: 20 });
    const wrapper = makeWrapper({ store });
    const { updateSection } = getElements(wrapper);
    // isEmpty seems to not work if child is not rendered via v-if
    // assert.equal(notificationsSection().isEmpty(), true);
    assert.equal(updateSection().exists(), false);
  });
});
