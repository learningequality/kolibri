/* eslint-env mocha */
import Vue from 'vue-test'; // eslint-disable-line
import Vuex from 'vuex';
import assert from 'assert';
import sinon from 'sinon';
import { mount } from '@vue/test-utils';
import ChannelsGrid from '../../src/views/manage-content-page/channels-grid.vue';
import { manageContentPageState } from '../../src/state/wizardState';
import mutations from '../../src/state/mutations';

function makeStore() {
  return new Vuex.Store({
    state: {
      pageState: manageContentPageState(),
    },
    mutations,
  });
}

function makeWrapper(options) {
  const { store = {}, props = {} } = options;
  return mount(ChannelsGrid, {
    propsData: { ...props },
    store,
    stubs: {
      transition: '<div><slot></slot></div>',
    },
    vuex: {
      actions: {
        refreshChannelList: () => Promise.resolve(),
      },
    },
  });
}

function getElements(wrapper) {
  return {
    channelListItems: () => wrapper.findAll({ name: 'channelListItem' }),
    emptyState: () => wrapper.find('.no-channels'),
    progressBar: () => wrapper.find({ name: 'ui-progress-linear' }),
    deleteChannelModal: () => wrapper.find({ name: 'deleteChannelModal' }),
  };
}

describe('channelsGrid component', () => {
  let store;

  beforeEach(() => {
    store = makeStore();
    store.dispatch('SET_CHANNEL_LIST', [
      {
        name: 'visible channel',
        id: 'visible_channel',
        on_device_resources: 10,
        total_resources: 1000,
        available: true,
      },
    ]);
  });

  it('shows an empty state if there are no visible channels', () => {
    // "visible" meaning it has on-device resources
    store.dispatch('SET_CHANNEL_LIST', [
      {
        name: 'hidden channel',
        id: 'hidden_channel',
        available: false,
        on_device_resources: 0,
        total_resources: 1000,
      },
    ]);
    const wrapper = makeWrapper({ store });
    const { emptyState } = getElements(wrapper);
    return wrapper.vm.$nextTick().then(() => {
      assert(emptyState().is('p'));
    });
  });

  it('shows a progress bar if channels are loading', () => {
    const wrapper = makeWrapper({ store });
    const { progressBar } = getElements(wrapper);
    return wrapper.vm
      .$nextTick()
      .then(() => {
        store.dispatch('SET_CHANNEL_LIST_LOADING', true);
        return wrapper.vm.$nextTick();
      })
      .then(() => {
        assert(progressBar().isVueComponent);
      });
  });

  it('channels appear sorted by name', () => {
    store.dispatch('SET_CHANNEL_LIST', [
      {
        name: 'beautiful channel',
        id: 'beautiful_channel',
        available: true,
        on_device_resources: 10,
        total_resources: 1000,
      },
      {
        name: 'awesome channel',
        id: 'awesome_channel',
        available: true,
        on_device_resources: 10,
        total_resources: 1000,
      },
    ]);
    const wrapper = makeWrapper({ store });
    const { channelListItems } = getElements(wrapper);
    return wrapper.vm.$nextTick().then(() => {
      const items = channelListItems();
      assert.equal(items.at(1).props().channel.id, 'awesome_channel');
      assert.equal(items.at(0).props().channel.id, 'beautiful_channel');
    });
  });

  it('a modal appears if channel is selected for deletion', () => {
    // and clicking "confirm" triggers an action
    let deleteModal;
    const wrapper = makeWrapper({ store });
    const deleteActionStub = sinon.stub(wrapper.vm, 'triggerChannelDeleteTask');
    const { channelListItems, deleteChannelModal } = getElements(wrapper);
    return wrapper.vm
      .$nextTick()
      .then(() => {
        const items = channelListItems();
        const button = items.at(0).find('button');
        assert.equal(button.text().trim(), 'Delete');
        button.trigger('click');
        return wrapper.vm.$nextTick();
      })
      .then(() => {
        deleteModal = deleteChannelModal();
        assert(deleteModal.isVueComponent);
        const deleteButton = deleteModal.find('button[name="confirm"]');
        assert.equal(deleteButton.text().trim(), 'Delete');
        deleteButton.trigger('click');
        return wrapper.vm.$nextTick();
      })
      .then(() => {
        sinon.assert.calledWith(deleteActionStub, 'visible_channel');
      });
  });
});
