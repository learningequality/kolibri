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
    ...router,
  });
}

// prettier-ignore
function getElements(wrapper) {
  return {
    noChannels: () => wrapper.find('.no-channels'),
    channelsList: () => wrapper.find('.channels-list'),
    channelsAvailableText: () => wrapper.find('[data-test="available"]').text().trim(),
    channelListItems: () => wrapper.findAll({ name: 'WithImportDetails' }),
    ChannelTokenModal: () => wrapper.find({ name: 'ChannelTokenModal' }),
    filters: () => wrapper.find('.filters'),
    languageFilter: () => wrapper.find({ name: 'KSelect' }),
    titleText: () => wrapper.find('[data-test="title"]').text().trim(),
    titleFilter: () => wrapper.find({ name: 'FilterTextbox' }),
    unlistedChannelsButton: () => wrapper.find('[data-test="token-button"]'),
    filterComponent: () => wrapper.find({name: 'FilteredChannelListContainer'}),
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
    const { unlistedChannelsButton, ChannelTokenModal } = getElements(wrapper);
    // prettier-ignore
    const button = unlistedChannelsButton();
    button.trigger('click');
    expect(ChannelTokenModal().isVueInstance()).toEqual(true);
  });

  it('in LOCALIMPORT mode, the unlisted channel button is not available', () => {
    setTransferType('localexport');
    const wrapper = makeWrapper({ store });
    const { unlistedChannelsButton } = getElements(wrapper);
    expect(unlistedChannelsButton().exists()).toBe(false);
  });

  it('in LOCALIMPORT mode, the back link text and title are correct', () => {
    setTransferType('localimport');
    const selectedDrive = store.state.manageContent.wizard.driveList.find(
      ({ id }) => id === 'f9e29616935fbff37913ed46bf20e2c0'
    );
    store.state.manageContent.wizard.selectedDrive = selectedDrive;
    const wrapper = makeWrapper({ store });
    const { titleText } = getElements(wrapper);
    expect(titleText()).toEqual('Select resources for import');
  });

  it('in REMOTEIMPORT mode, the back link text and title are correct', () => {
    setTransferType('remoteimport');
    const wrapper = makeWrapper({ store });
    const { titleText } = getElements(wrapper);
    expect(titleText()).toEqual('Select resources for import');
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
    expect(channelNProps(0).onDevice).toEqual(true);
    expect(channelNProps(1).onDevice).toEqual(true);
    expect(channelNProps(2).onDevice).toEqual(false);
    expect(channelNProps(3).onDevice).toEqual(false);
  });

  it('IN LOCALIMPORT/REMOTEIMPORT, with no filters, all appear', () => {
    setTransferType('localimport');
    const wrapper = makeWrapper({ store });
    const { filterComponent } = getElements(wrapper);
    const { titleFilter, languageFilter } = filterComponent().vm;
    expect(titleFilter).toEqual('');
    expect(languageFilter.value).toEqual('ALL');
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

  it('with language filter, the correct channels appear', async () => {
    const wrapper = makeWrapper();
    const { languageFilter } = getElements(wrapper);
    const filter = languageFilter();
    await wrapper.vm.$nextTick();
    filter.vm.selection = { label: 'English', value: 'en' };

    await wrapper.vm.$nextTick();
    testChannelVisibility(wrapper, [true, false, false, false]);
  });

  it('with keyword filter, the correct channels appear', async () => {
    const wrapper = makeWrapper();
    const { titleFilter, filterComponent } = getElements(wrapper);
    const filter = titleFilter();
    // Can't trigger 'input' event; need to set new value manually
    filter.vm.model = 'bir ch';
    await wrapper.vm.$nextTick();
    expect(filterComponent().vm.titleFilter).toEqual('bir ch');
    testChannelVisibility(wrapper, [false, false, true, false]);
  });

  it('with both filters, the correct channels appear', async () => {
    const wrapper = makeWrapper();
    const { languageFilter, titleFilter } = getElements(wrapper);
    const lFilter = languageFilter();
    const tFilter = titleFilter();
    tFilter.vm.model = 'hund';
    await wrapper.vm.$nextTick();
    lFilter.vm.selection = { label: 'German', value: 'de' };
    await wrapper.vm.$nextTick();
    testChannelVisibility(wrapper, [false, false, false, true]);
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
      },
    });
  });
});
