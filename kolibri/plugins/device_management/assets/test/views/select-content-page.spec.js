import VueRouter from 'vue-router';
import { mount } from '@vue/test-utils';
import SelectContentPage from '../../src/views/SelectContentPage';
import ChannelContentsSummary from '../../src/views/SelectContentPage/ChannelContentsSummary';
import { makeSelectContentPageStore } from '../utils/makeStore';

SelectContentPage.methods.getAvailableSpaceOnDrive = () => {};

const router = new VueRouter({
  routes: [],
});

function makeWrapper(options) {
  const { store, props = {} } = options;
  const wrapper = mount(SelectContentPage, {
    propsData: props,
    store: store || makeSelectContentPageStore(),
    stubs: ['content-tree-viewer'],
    router,
  });
  // To avoid test failures
  wrapper.vm.refreshPage = () => {};
  return wrapper;
}

function updateMetaChannel(store, updates) {
  const { transferredChannel } = store.state.manageContent.wizard;
  store.commit('manageContent/wizard/SET_TRANSFERRED_CHANNEL', {
    ...transferredChannel,
    ...updates,
  });
}

describe('selectContentPage', () => {
  let store;

  beforeEach(() => {
    store = makeSelectContentPageStore();
  });

  it('shows the thumbnail, title, descripton, and version of the channel', () => {
    const fakeImage = 'data:image/png;base64,abcd1234';
    updateMetaChannel(store, { thumbnail: fakeImage });
    const summary = makeWrapper({ store }).find(ChannelContentsSummary);
    expect(summary.find('img').attributes().src).toEqual(fakeImage);
    expect(summary.find('h1').text()).toEqual('Awesome Channel');
    const pTags = summary.findAll('p');
    expect(pTags.at(0).text()).toEqual('Version 10');
    expect(pTags.at(1).text()).toEqual('An awesome channel');
  });

  it('shows the total size of the channel', () => {
    const rows = makeWrapper({ store })
      .find(ChannelContentsSummary)
      .findAll('tr');
    expect(rows.at(1).text()).toEqual('Total size 1,000 5 GB');
  });

  it('shows the total size of any resources on the device', () => {
    const rows = makeWrapper({ store })
      .find(ChannelContentsSummary)
      .findAll('tr');
    expect(rows.at(2).text()).toEqual('On your device 2,000 95 MB');
  });

  it('shows size and resources as 0 if channel is not on device', () => {
    updateMetaChannel(store, {
      id: 'not_awesome_channel',
      on_device_resources: 0,
      on_device_file_size: 0,
    });
    const rows = makeWrapper({ store })
      .find(ChannelContentsSummary)
      .findAll('tr');
    expect(rows.at(2).text()).toEqual('On your device 0 0 B');
  });

  it('shows a update notification if a new version is available', () => {
    updateMetaChannel(store, { version: 1000 });
    const wrapper = makeWrapper({ store });
    expect(wrapper.text()).toContain('Version 1,000 available');
  });

  it('in LOCALIMPORT, clicking the "update" button triggers a downloadChannelMetadata action', () => {
    updateMetaChannel(store, { version: 1000 });
    store.state.manageContent.wizard.transferType = 'localimport';
    store.state.manageContent.wizard.selectedDrive = {
      driveId: 'drive_1',
    };
    const wrapper = makeWrapper({ store });
    const updateButton = wrapper.find('button[name="update"]');
    const stub = jest.spyOn(wrapper.vm, 'downloadChannelMetadata').mockResolvedValue();
    updateButton.trigger('click');
    expect(stub).toHaveBeenCalled();
  });

  it('in REMOTEIMPORT, clicking the "update" button triggers a downloadChannelMetadata action', () => {
    updateMetaChannel(store, { version: 1000 });
    store.state.manageContent.wizard.transferType = 'remoteimport';
    const wrapper = makeWrapper({ store });
    const updateButton = wrapper.find('button[name="update"]');
    const stub = jest.spyOn(wrapper.vm, 'downloadChannelMetadata').mockResolvedValue();
    updateButton.trigger('click');
    expect(stub).toHaveBeenCalled();
  });

  it('if a new version is not available, then no notification/button appear', () => {
    updateMetaChannel(store, { version: 10 }); // same version
    const wrapper = makeWrapper({ store });
    expect(wrapper.text()).not.toMatch(/Version \S+ available/);
  });
});
