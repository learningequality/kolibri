/* eslint-env mocha */
import Vue from 'vue-test'; // eslint-disable-line
import Vuex from 'vuex';
import assert from 'assert';
import { mount } from 'avoriaz';
import SelectContentPage from '../../views/select-content-page';
import { channelFactory } from '../utils/data';
import UiAlert from 'keen-ui/src/UiAlert';
import SelectedResourcesSize from '../../views/select-content-page/selected-resources-size';

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
          nodes: {
            include: [],
            omit: [],
          },
        },
        remainingSpace: 1000,
        onDeviceInfoIsReady: true,
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
    notificationsSection: () => wrapper.find('section.notifications'),
    versionAvailable: () => wrapper.first('.version-available').text().trim(),
    treeView: () => wrapper.find('section.resources-tree-view'),
    resourcesSize: () => wrapper.find(SelectedResourcesSize),
  };
}

const fakeImage = 'data:image/png;base64,abcd1234';

describe('selectContentPage', () => {

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
    const { updateSection, notificationsSection, versionAvailable } = getElements(wrapper);
    assert(updateSection()[0].is('div'));
    assert(!notificationsSection()[0].isEmpty());
    assert.equal(versionAvailable(), 'Version 20 available');

  });

  it('clicking the "update" button triggers an event', () => {

  });

  it('if a new version is not available, then no notification/button appear', () => {
    const store = makeStore();
    store.state.pageState.channelOnDevice.version = 20;
    const wrapper = makeWrapper({ store });
    const { updateSection, notificationsSection } = getElements(wrapper)
    assert(notificationsSection()[0].isEmpty());
    assert.equal(updateSection()[0], undefined);
  });

  it('if on-device info is not ready, then the size display and tree view are not shown', () => {
    const store = makeStore();
    store.state.pageState.onDeviceInfoIsReady = false;
    const wrapper = makeWrapper({ store });
    const { resourcesSize, treeView } = getElements(wrapper);
    assert.equal(resourcesSize()[0], undefined);
    assert.equal(treeView()[0], undefined);
  });

  it('if on-device info is ready, then the size display and tree view are shown', () => {
    const store = makeStore();
    const wrapper = makeWrapper({ store });
    const { resourcesSize, treeView } = getElements(wrapper);
    assert(resourcesSize()[0].isVueComponent);
    assert(treeView()[0].is('section'));
  });

  it('the correct props are passed to the selected resources size component', () => {
    const store = makeStore();
    const wrapper = makeWrapper({ store });
    const { resourcesSize } = getElements(wrapper);
    const props = resourcesSize()[0].vm.$props;
    assert.deepEqual(props, {
      mode: 'import',
      fileSize: 10000000000,
      resourceCount: 5000,
      remainingSpace: 1000,
    });
  });

  it('the corrct props are passed to the tree view component', () => {

  });
});
