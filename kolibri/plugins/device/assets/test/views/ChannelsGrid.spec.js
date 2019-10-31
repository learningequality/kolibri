import { mount } from '@vue/test-utils';
import ChannelsGrid from '../../src/views/ManageContentPage/ChannelsGrid';
import { makeAvailableChannelsPageStore } from '../utils/makeStore';

function makeWrapper(options) {
  const { store = store, props = {} } = options;
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
    channelListItems: () => wrapper.findAll({ name: 'ChannelListItem' }),
    emptyState: () => wrapper.find('.no-channels'),
    ProgressBar: () => wrapper.find({ name: 'KLinearLoader' }),
    deleteChannelModal: () => wrapper.find({ name: 'DeleteChannelModal' }),
  };
}

describe('channelsGrid component', () => {
  let store;

  beforeEach(() => {
    store = makeAvailableChannelsPageStore();
    store.commit('manageContent/SET_CHANNEL_LIST', [
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
    store.commit('manageContent/SET_CHANNEL_LIST', [
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
    expect(emptyState().is('p')).toEqual(true);
  });

  it('shows a progress bar if channels are loading', () => {
    const wrapper = makeWrapper({ store });
    const { ProgressBar } = getElements(wrapper);
    store.commit('manageContent/SET_CHANNEL_LIST_LOADING', true);
    expect(ProgressBar().isVueInstance()).toEqual(true);
  });

  it('channels appear sorted by name', () => {
    store.commit('manageContent/SET_CHANNEL_LIST', [
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
      expect(items.at(0).props().channel.id).toBe('awesome_channel');
      expect(items.at(1).props().channel.id).toBe('beautiful_channel');
    });
  });

  it('a modal appears if channel is selected for deletion', () => {
    // and clicking "confirm" triggers an action
    let deleteModal;
    const wrapper = makeWrapper({ store });
    const deleteActionStub = jest
      .spyOn(wrapper.vm, 'triggerChannelDeleteTask')
      .mockImplementation(() => {});
    const { channelListItems, deleteChannelModal } = getElements(wrapper);
    const items = channelListItems();
    const dropdownMenu = items.at(0).find({ name: 'KDropdownMenu' });
    dropdownMenu.vm.$emit('select', { value: 'DELETE_CHANNEL' });
    deleteModal = deleteChannelModal();
    expect(deleteModal.isVueInstance()).toEqual(true);
    const deleteButton = deleteModal.find('button[name="submit"]');
    expect(deleteButton.text().trim()).toEqual('Delete');
    deleteChannelModal().vm.$emit('submit');
    expect(deleteActionStub).toHaveBeenCalledWith('visible_channel');
  });
});
