/* eslint-env mocha */
import Vue from 'vue-test'; // eslint-disable-line
import Vuex from 'vuex';
import assert from 'assert';
import sinon from 'sinon';
import { mount } from 'avoriaz';
import ChannelsGrid from '../../views/manage-content-page/channels-grid.vue';
import DeleteChannelModal from '../../views/manage-content-page/delete-channel-modal.vue';
import ChannelListItem from '../../views/manage-content-page/channel-list-item.vue';
import { manageContentPageState } from '../../state/wizardState';
import mutations from '../../state/mutations';
import SlottedDiv from '../../../../../../learn/assets/test/util/SlottedDiv.vue';
import UiProgressLinear from 'keen-ui/src/UiProgressLinear.vue';

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
    components: {
      transition: SlottedDiv,
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
    channelListItems: () => wrapper.find(ChannelListItem),
    emptyState: () => wrapper.find('.no-channels'),
    progressBar: () => wrapper.find(UiProgressLinear),
    deleteChannelModal: () => wrapper.first(DeleteChannelModal),
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
      assert(emptyState()[0].is('p'));
    });
  });

  it('shows a progress bar if channels are loading', () => {
    const wrapper = makeWrapper({ store });
    const { progressBar } = getElements(wrapper);
    return wrapper.vm
      .$nextTick()
      .then(() => {
        wrapper.setData({ channelsLoading: true });
        return wrapper.vm.$nextTick();
      })
      .then(() => {
        assert(progressBar()[0].isVueComponent);
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
      const [ch1, ch2] = channelListItems();
      assert.equal(ch1.getProp('channel').id, 'awesome_channel');
      assert.equal(ch2.getProp('channel').id, 'beautiful_channel');
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
        const [ch1] = channelListItems();
        const button = ch1.first('button');
        assert.equal(button.text().trim(), 'Delete');
        button.trigger('click');
        return wrapper.vm.$nextTick();
      })
      .then(() => {
        deleteModal = deleteChannelModal();
        assert(deleteModal.isVueComponent);
        const deleteButton = deleteModal.first('button[name="confirm"]');
        assert.equal(deleteButton.text().trim(), 'Confirm');
        deleteButton.trigger('click');
        return wrapper.vm.$nextTick();
      })
      .then(() => {
        sinon.assert.calledWith(deleteActionStub, 'visible_channel');
      });
  });
});
