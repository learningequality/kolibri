/* eslint-env mocha */
import Vue from 'vue-test'; // eslint-disable-line
import Vuex from 'vuex';
import assert from 'assert';
import { mount } from 'avoriaz';
import SelectContentPage from '../../views/select-content-page';
import { channelFactory } from '../utils/data';
import UiAlert from 'keen-ui/src/UiAlert';

const defaultChannel = channelFactory();

function makeStore() {
  return new Vuex.Store({
    state: {
      pageState: {
        channel: defaultChannel,
        channelOnDevice: {
          total_resource_count: 5000,
          total_file_size: 10000000000,
          version: 19,
        },
        mode: 'import',
        selectedItems: {
          total_resource_count: 5000,
          total_file_size: 10000000000,
          nodes: [],
        },
        remainingSpace: 1000,
      },
    },
  });
}

function makeWrapper(options) {
  const { store, props = {} } = options;
  return mount(SelectContentPage, {
    propsData: props,
    store: store || makeStore(),
  });
}

// prettier-ignore
function getElements(wrapper) {
  return {
    thumbnail: () => wrapper.first('.thumbnail'),
    version: () => wrapper.first('.version').text().trim(),
    title: () => wrapper.first('.title').text().trim(),
    description: () => wrapper.first('.description').text().trim(),
    totalSizeRows: () => wrapper.find('tr.total-size td'),
    onDeviceRows: () => wrapper.find('tr.on-device td'),
    updateSection: () => wrapper.find('.updates'),
    notification: () => wrapper.find(UiAlert),
    versionAvailable: () => wrapper.first('.version-available').text().trim(),
  }
}

const fakeImage = 'data:image/png;base64,abcd1234';

describe.only('selectContentPage', () => {

  it('shows the thumbnail, title, descripton, and version of the channel', () => {
    const store = makeStore();
    store.state.pageState.channel.thumbnail = fakeImage;
    const wrapper = makeWrapper({ store });
    const { thumbnail, version, title, description } = getElements(wrapper);
    assert.equal(thumbnail().first('img').getAttribute('src'), fakeImage);
    assert.equal(title(), 'Channel Title');
    assert.equal(version(), 'Version 20');
    assert.equal(description(), 'An awesome channel');
  });

  it('if there is no thumbnail, it shows a placeholder', () => {

  });

  it('shows the total size of the channel', () => {
    const store = makeStore();
    const wrapper = makeWrapper({ store });
    const { totalSizeRows } = getElements(wrapper);
    const rows = totalSizeRows();
    assert.equal(rows[1].text(), '5,000');
    assert.equal(rows[2].text(), '4 GB');
  });

  it('if resources are on the device, it shows the total size of those', () => {
    const store = makeStore();
    const wrapper = makeWrapper({ store });
    const { onDeviceRows } = getElements(wrapper);
    const rows = onDeviceRows();
    assert.equal(rows[1].text(), '5,000');
    assert.equal(rows[2].text(), '9 GB');
  });

  it('if a new version is available, a update notification and button appear', () => {
    const store = makeStore();
    const wrapper = makeWrapper({ store });
    const { updateSection, notification, versionAvailable } = getElements(wrapper);
    assert(updateSection()[0].is('div'));
    assert(notification()[0].isVueComponent);
    assert.equal(versionAvailable(), 'Version 20 available');

  });

  it('clicking the "update" button triggers an event', () => {

  });

  it('if a new version is not available, then no notification/button appear', () => {
    const store = makeStore();
    store.state.pageState.channelOnDevice.version = 20;
    const wrapper = makeWrapper({ store });
    const { updateSection, notification } = getElements(wrapper)
    assert.equal(notification()[0], undefined);
    assert.equal(updateSection()[0], undefined);
  });

  it('if the device is undergoing database upload, then the size display and tree view are not shown', () => {

  });

  it('the correct props are passed to the size display component', () => {

  });

  it('the corrct props are passed to the tree view component', () => {

  });
});
