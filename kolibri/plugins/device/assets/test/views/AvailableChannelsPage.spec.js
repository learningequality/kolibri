import { mount } from '@vue/test-utils';
import AvailableChannelsPage from '../../src/views/AvailableChannelsPage';
import { makeAvailableChannelsPageStore } from '../utils/makeStore';
import router from './testRouter';

function makeWrapper(options = {}) {
  const { store, props = {} } = options;
  const defaultProps = {};
  return mount(AvailableChannelsPage, {
    propsData: { ...defaultProps, ...props },
    store: store || makeAvailableChannelsPageStore(),
    router,
  });
}

// prettier-ignore
function getElements(wrapper) {
  return {
    noChannels: () => wrapper.find('.no-channels'),
    channelsList: () => wrapper.find('.channels-list'),
    channelsAvailableText: () => wrapper.find('[data-test="available"]').text().trim(),
    channelListItems: () => wrapper.findAll({ name: 'ChannelListItem' }),
    ChannelTokenModal: () => wrapper.find({ name: 'ChannelTokenModal' }),
    filters: () => wrapper.find('.filters'),
    languageFilter: () => wrapper.find({ name: 'KSelect' }),
    titleText: () => wrapper.find('[data-test="title"]').text().trim(),
    titleFilter: () => wrapper.find({ name: 'FilterTextbox' }),
    unlistedChannelsSection: () => wrapper.findAll('section.unlisted-channels'),
  }
}

function testChannelVisibility(wrapper, visibilities) {
  const channels = getElements(wrapper).channelListItems();
  visibilities.forEach((v, i) => {
    expect(channels.at(i).isVisible()).toEqual(v);
  });
}

describe('availableChannelsPage', () => {
  let store;

  beforeEach(() => {
    store = makeAvailableChannelsPageStore();
  });

  function setTransferType(transferType) {
    store.commit('manageContent/wizard/SET_TRANSFER_TYPE', transferType);
  }

  it('in REMOTEIMPORT mode, the unlisted channel button is available', () => {
    // ...and clicking it opens the channel token modal
    setTransferType('remoteimport');
    const wrapper = makeWrapper({ store });
    const { unlistedChannelsSection, ChannelTokenModal } = getElements(wrapper);
    // prettier-ignore
    const button = unlistedChannelsSection().at(0).find('a');
    button.trigger('click');
    expect(ChannelTokenModal().isVueInstance()).toEqual(true);
  });

  it('in LOCALIMPORT and LOCALEXPORT mode, the unlisted channel button is not available', () => {
    setTransferType('localexport');
    const wrapper = makeWrapper({ store });
    const { unlistedChannelsSection } = getElements(wrapper);
    expect(unlistedChannelsSection().length).toEqual(0);
  });

  it('in LOCALEXPORT mode, the back link text and title are correct', () => {
    setTransferType('localexport');
    const selectedDrive = store.state.manageContent.wizard.driveList.find(
      ({ id }) => id === 'f9e29616935fbff37913ed46bf20e2c1'
    );
    store.state.manageContent.wizard.selectedDrive = selectedDrive;
    const wrapper = makeWrapper({ store });
    const { titleText } = getElements(wrapper);
    expect(titleText()).toEqual('Your channels');
  });

  it('in LOCALIMPORT mode, the back link text and title are correct', () => {
    setTransferType('localimport');
    const selectedDrive = store.state.manageContent.wizard.driveList.find(
      ({ id }) => id === 'f9e29616935fbff37913ed46bf20e2c0'
    );
    store.state.manageContent.wizard.selectedDrive = selectedDrive;
    const wrapper = makeWrapper({ store });
    const { titleText } = getElements(wrapper);
    expect(titleText()).toEqual('SANDISK (G:)');
  });

  it('in REMOTEIMPORT mode, the back link text and title are correct', () => {
    setTransferType('remoteimport');
    const wrapper = makeWrapper({ store });
    const { titleText } = getElements(wrapper);
    expect(titleText()).toEqual('Channels');
  });

  it('in LOCALEXPORT shows the correct number of channels available message', () => {
    setTransferType('localexport');
    const wrapper = makeWrapper({ store });
    const { channelsAvailableText, noChannels } = getElements(wrapper);
    expect(channelsAvailableText()).toEqual('4 channels available');
    expect(noChannels().exists()).toEqual(false);
  });

  it('in REMOTEIMPORT/LOCALIMPORT shows the correct number of channels available message', () => {
    setTransferType('localimport');
    const wrapper = makeWrapper({ store });
    const { channelsAvailableText, noChannels } = getElements(wrapper);
    expect(channelsAvailableText()).toEqual('4 channels available');
    expect(noChannels().exists()).toEqual(false);
  });

  it('if there are no channels, then filters do not appear', () => {
    store.commit('manageContent/wizard/SET_AVAILABLE_CHANNELS', []);
    const wrapper = makeWrapper({ store });
    const { filters } = getElements(wrapper);
    expect(filters().exists()).toEqual(false);
  });

  it('in LOCALIMPORT/REMOTEIMPORT, channel item (not) on device has the correct props', () => {
    const wrapper = makeWrapper();
    const { channelListItems } = getElements(wrapper);
    const channels = channelListItems();
    const channelNProps = n => channels.at(n).props();
    expect(channelNProps(0).mode).toEqual('IMPORT');
    expect(channelNProps(0).onDevice).toEqual(true);
    expect(channelNProps(1).onDevice).toEqual(false);
    expect(channelNProps(2).onDevice).toEqual(false);
    expect(channelNProps(3).onDevice).toEqual(true);
  });

  it('IN LOCALEXPORT, with no filters, all channels (with resources) appear', () => {
    setTransferType('localexport');
    const wrapper = makeWrapper({ store });
    expect(wrapper.vm.titleFilter).toEqual('');
    expect(wrapper.vm.languageFilter.value).toEqual('ALL');
    testChannelVisibility(wrapper, [true, false, false, true]);
  });

  it('IN LOCALIMPORT/REMOTEIMPORT, with no filters, all appear', () => {
    setTransferType('localimport');
    const wrapper = makeWrapper({ store });
    expect(wrapper.vm.titleFilter).toEqual('');
    expect(wrapper.vm.languageFilter.value).toEqual('ALL');
    testChannelVisibility(wrapper, [true, true, true, true]);
  });

  it('the correct language filter options appear', () => {
    const wrapper = makeWrapper();
    const { languageFilter } = getElements(wrapper);
    // Fake labels for now
    const expected = [
      { label: 'All languages', value: 'ALL' },
      { label: 'English', value: 'en' },
      { label: 'German', value: 'de' },
    ];
    expect(languageFilter().props().options).toEqual(expected);
  });

  it('with language filter, the correct channels appear', () => {
    const wrapper = makeWrapper();
    const { languageFilter } = getElements(wrapper);
    const filter = languageFilter();
    return wrapper.vm.$nextTick().then(() => {
      filter.vm.selection = { label: 'English', value: 'en' };
      return wrapper.vm.$nextTick().then(() => {
        testChannelVisibility(wrapper, [true, false, false, false]);
      });
    });
  });

  it('with keyword filter, the correct channels appear', () => {
    const wrapper = makeWrapper();
    const { titleFilter } = getElements(wrapper);
    const filter = titleFilter();
    // Can't trigger 'input' event; need to set new value manually
    filter.vm.model = 'bir ch';
    return wrapper.vm.$nextTick().then(() => {
      expect(wrapper.vm.titleFilter).toEqual('bir ch');
      testChannelVisibility(wrapper, [false, true, false, false]);
    });
  });

  it('with both filters, the correct channels appear', () => {
    const wrapper = makeWrapper();
    const { languageFilter, titleFilter } = getElements(wrapper);
    const lFilter = languageFilter();
    const tFilter = titleFilter();
    tFilter.vm.model = 'hund';
    return wrapper.vm.$nextTick().then(() => {
      lFilter.vm.selection = { label: 'German', value: 'de' };
      return wrapper.vm.$nextTick().then(() => {
        testChannelVisibility(wrapper, [false, false, true, false]);
      });
    });
  });

  it('the "select" link goes to the correct place', () => {
    const wrapper = makeWrapper();
    const { channelListItems } = getElements(wrapper);
    const channels = channelListItems();
    // prettier-ignore
    const link = channels.at(0).find({ name: 'KRouterLink' });
    expect(link.props().to).toMatchObject({
      name: 'SELECT_CONTENT',
      params: {
        channel_id: 'awesome_channel',
      },
      query: {
        drive_id: undefined,
        for_export: undefined,
      },
    });
  });
});
