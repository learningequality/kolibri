/* eslint-env mocha */
import Vue from 'vue-test'; // eslint-disable-line
import Vuex from 'vuex';
import assert from 'assert';
import { mount } from 'avoriaz';
import SelectContentPage from '../../views/select-content-page';
import { channelFactory } from '../utils/data';

const defaultChannel = channelFactory();

function makeStore() {
  return new Vuex.Store({
    state: {
      pageState: {
        channel: defaultChannel,
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

describe.only('selectContentPage', () => {

  it('shows the thumbnail, title, descripton, and version of the channel', () => {
    const store = makeStore();
    store.state.pageState.channel.thumbnail = 'abcd1234';
    const wrapper = makeWrapper({ store });
    const thumbnail = wrapper.first('.thumbnail');
    const title = wrapper.first('.title').text().trim();
    const version = wrapper.first('.version').text().trim();
    const description = wrapper.first('.description').text().trim();
    assert.equal(thumbnail.first('img').getAttribute('src'), 'abcd1234');
    assert.equal(title, 'Channel Title');
    assert.equal(version, 'Version 20');
    assert.equal(description, 'An awesome channel');
  });

  it('if there is no thumbnail, it shows a placeholder', () => {

  });

  it('shows the total size of the channel', () => {
    const store = makeStore();
    store.state.pageState.channel.thumbnail = 'abcd1234';
    const wrapper = makeWrapper({ store });
    const rows = wrapper.find('tr.total-size td')
    assert.equal(rows[1].text(), '5,000');
    assert.equal(rows[2].text(), '4 GB');
  });

  it('if resources are on the device, it shows the total size of those', () => {

  });

  it('if a new version is available, a update notification and button appear', () => {

  });

  it('if a new version is not available, then no notification/button appear', () => {

  });

  it('if the device is undergoing database upload, then the size display and tree view are not shown', () => {

  });

  it('the correct props are passed to the size display component', () => {

  });

  it('the corrct props are passed to the tree view component', () => {

  });
});
