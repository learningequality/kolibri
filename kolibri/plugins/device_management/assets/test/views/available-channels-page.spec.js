/* eslint-env mocha */
import { expect } from 'chai';
import Vue from 'vue-test'; // eslint-disable-line
import VueRouter from 'vue-router';
import { mount } from '@vue/test-utils';
import AvailableChannelsPage from '../../src/views/available-channels-page';
import { makeAvailableChannelsPageStore } from '../utils/makeStore';

const router = new VueRouter({
  routes: [{ path: '', name: 'wizardtransition' }],
});

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
    channelsAvailableText: () => wrapper.find('.channels p').text().trim(),
    channelListItems: () => wrapper.findAll({ name: 'channelListItem' }),
    channelTokenModal: () => wrapper.find({ name: 'channelTokenModal' }),
    filters: () => wrapper.find('.filters'),
    languageFilter: () => wrapper.find({ name: 'kSelect' }),
    titleText: () => wrapper.find('.channels h1').text().trim(),
    titleFilter: () => wrapper.find({ name: 'kFilterTextbox' }),
    unlistedChannelsSection: () => wrapper.findAll('section.unlisted-channels'),
  }
}

function testChannelVisibility(wrapper, visibilities) {
  const channels = getElements(wrapper).channelListItems();
  visibilities.forEach((v, i) => {
    expect(channels.at(i).isVisible()).to.equal(v);
  });
}

describe('availableChannelsPage', () => {
  let store;

  beforeEach(() => {
    store = makeAvailableChannelsPageStore();
  });

  function setTransferType(transferType) {
    store.dispatch('SET_TRANSFER_TYPE', transferType);
  }

  it('in REMOTEIMPORT mode, the unlisted channel button is available', () => {
    // ...and clicking it opens the channel token modal
    setTransferType('remoteimport');
    const wrapper = makeWrapper({ store });
    const { unlistedChannelsSection, channelTokenModal } = getElements(wrapper);
    // prettier-ignore
    const button = unlistedChannelsSection().at(0).find('button');
    button.trigger('click');
    expect(channelTokenModal().isVueInstance()).to.be.true;
  });

  it('in LOCALIMPORT and LOCALEXPORT mode, the unlisted channel button is not available', () => {
    setTransferType('localexport');
    const wrapper = makeWrapper({ store });
    const { unlistedChannelsSection } = getElements(wrapper);
    expect(unlistedChannelsSection().length).to.equal(0);
  });

  it('in LOCALEXPORT mode, the back link text and title are correct', () => {
    setTransferType('localexport');
    store.dispatch('SET_SELECTED_DRIVE', 'f9e29616935fbff37913ed46bf20e2c1');
    const wrapper = makeWrapper({ store });
    const { titleText } = getElements(wrapper);
    expect(titleText()).to.equal('Your channels');
  });

  it('in LOCALIMPORT mode, the back link text and title are correct', () => {
    setTransferType('localimport');
    store.dispatch('SET_SELECTED_DRIVE', 'f9e29616935fbff37913ed46bf20e2c0');
    const wrapper = makeWrapper({ store });
    const { titleText } = getElements(wrapper);
    expect(titleText()).to.equal('SANDISK (G:)');
  });

  it('in REMOTEIMPORT mode, the back link text and title are correct', () => {
    setTransferType('remoteimport');
    const wrapper = makeWrapper({ store });
    const { titleText } = getElements(wrapper);
    expect(titleText()).to.equal('Channels');
  });

  it('in LOCALEXPORT shows the correct number of channels available message', () => {
    setTransferType('localexport');
    const wrapper = makeWrapper({ store });
    const { channelsAvailableText, noChannels } = getElements(wrapper);
    expect(channelsAvailableText()).to.equal('4 channels available');
    expect(noChannels().exists()).to.be.false;
  });

  it('in REMOTEIMPORT/LOCALIMPORT shows the correct number of channels available message', () => {
    setTransferType('localimport');
    const wrapper = makeWrapper({ store });
    const { channelsAvailableText, noChannels } = getElements(wrapper);
    expect(channelsAvailableText()).to.equal('4 channels available');
    expect(noChannels().exists()).to.be.false;
  });

  it('if there are no channels, then filters do not appear', () => {
    store.dispatch('SET_AVAILABLE_CHANNELS', []);
    const wrapper = makeWrapper({ store });
    const { filters } = getElements(wrapper);
    expect(filters().exists()).to.be.false;
  });

  it('in LOCALIMPORT/REMOTEIMPORT, channel item (not) on device has the correct props', () => {
    const wrapper = makeWrapper();
    const { channelListItems } = getElements(wrapper);
    const channels = channelListItems();
    const channelNProps = n => channels.at(n).props();
    expect(channelNProps(0).mode).to.equal('IMPORT');
    expect(channelNProps(0).onDevice).to.be.true;
    expect(channelNProps(1).onDevice).to.be.false;
    expect(channelNProps(2).onDevice).to.be.false;
    expect(channelNProps(3).onDevice).to.be.true;
  });

  it('IN LOCALEXPORT, with no filters, all channels (with resources) appear', () => {
    setTransferType('localexport');
    const wrapper = makeWrapper({ store });
    expect(wrapper.vm.titleFilter).to.equal('');
    expect(wrapper.vm.languageFilter.value).to.equal('ALL');
    testChannelVisibility(wrapper, [true, false, false, true]);
  });

  it('IN LOCALIMPORT/REMOTEIMPORT, with no filters, all appear', () => {
    setTransferType('localimport');
    const wrapper = makeWrapper({ store });
    expect(wrapper.vm.titleFilter).to.equal('');
    expect(wrapper.vm.languageFilter.value).to.equal('ALL');
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
    expect(languageFilter().props().options).to.deep.equal(expected);
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
      expect(wrapper.vm.titleFilter).to.equal('bir ch');
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
    const link = channels.at(0).find({ name: 'kRouterLink' });
    expect(link.props().to).to.deep.equal({
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
