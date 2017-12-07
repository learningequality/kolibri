/* eslint-env mocha */
import Vue from 'vue-test'; // eslint-disable-line
import Vuex from 'vuex';
import VueRouter from 'vue-router';
import assert from 'assert';
import sinon from 'sinon';
import { mount } from 'avoriaz';
import AvailableChannelsPage from '../../views/available-channels-page';
import ChannelListItem from '../../views/manage-content-page/channel-list-item.vue';
import UiSelect from 'keen-ui/src/UiSelect';
import kFilterTextbox from 'kolibri.coreVue.components.kFilterTextbox';
import ImmersiveFullScreen from 'kolibri.coreVue.components.immersiveFullScreen';
import ChannelTokenModal from '../../views/available-channels-page/channel-token-modal';
import { importExportWizardState } from '../../state/wizardState';
import cloneDeep from 'lodash/cloneDeep';

const router = new VueRouter({
  routes: [{ path: '', name: 'wizardtransition' }],
});

const availableChannels = [
  {
    name: 'Awesome Channel',
    id: 'awesome_channel',
    lang_code: 'en',
    lang_name: 'English',
    total_resources: 100,
  },
  {
    name: 'Bird Channel',
    id: 'bird_channel',
    total_resources: 100,
  },
  {
    name: 'Hunden Channel',
    id: 'hunden_channel',
    lang_code: 'de',
    lang_name: 'German',
    total_resources: 100,
  },
  {
    name: 'Kaetze Channel',
    id: 'kaetze_channel',
    lang_code: 'de',
    lang_name: 'German',
    total_resources: 100,
  },
];

const channelsOnDevice = cloneDeep(availableChannels);

// Pretending that metadata has been downloaded previously for Bird & Hunden channel,
// but no resources. Awesome & Kaetze channel have some resources.
channelsOnDevice[0].on_device_resources = 90;
channelsOnDevice[0].available = true;
channelsOnDevice[1].on_device_resources = 0;
channelsOnDevice[1].available = false;
channelsOnDevice[2].on_device_resources = 0;
channelsOnDevice[2].available = false;
channelsOnDevice[3].on_device_resources = 90;
channelsOnDevice[3].available = true;

function makeStore() {
  return new Vuex.Store({
    state: {
      pageState: {
        channelList: channelsOnDevice,
        wizardState: {
          ...importExportWizardState(),
          availableChannels,
          transferType: 'localimport',
          status: '',
        },
      },
    },
  });
}

function makeWrapper(options = {}) {
  const { store, props = {} } = options;
  const defaultProps = {};
  return mount(AvailableChannelsPage, {
    propsData: { ...defaultProps, ...props },
    store: store || makeStore(),
    router,
  });
}

// prettier-ignore
function getElements(wrapper) {
  return {
    noChannels: () => wrapper.find('.no-channels'),
    channelsList: () => wrapper.find('.channels-list'),
    channelsAvailableText: () => wrapper.first('.channels p').text().trim(),
    channelListItems: () => wrapper.find(ChannelListItem),
    channelTokenModal: () => wrapper.first(ChannelTokenModal),
    filters: () => wrapper.find('.filters'),
    languageFilter: () => wrapper.first(UiSelect),
    titleText: () => wrapper.first('.channels h1').text().trim(),
    titleFilter: () => wrapper.first(kFilterTextbox),
    unlistedChannelsSection: () => wrapper.find('section.unlisted-channels'),
    wholePageBackLink: () => wrapper.first(ImmersiveFullScreen).getProp('backPageLink'),
    wholePageBackText: () => wrapper.first(ImmersiveFullScreen).getProp('backPageText'),
  }
}

function testChannelVisibility(wrapper, visibilities) {
  const channels = getElements(wrapper).channelListItems();
  visibilities.forEach((v, i) => {
    assert.equal(!channels[i].hasStyle('display', 'none'), v);
  });
}

describe('availableChannelsPage', () => {
  let store;

  beforeEach(() => {
    store = makeStore();
  });

  function setTransferType(transferType) {
    store.state.pageState.wizardState.transferType = transferType;
  }

  it('back button link is correct', () => {
    const wrapper = makeWrapper();
    const { wholePageBackLink } = getElements(wrapper);
    const backLink = wholePageBackLink();
    assert.deepEqual(backLink, {
      name: 'wizardtransition',
      path: '',
      params: {
        transition: 'cancel',
      },
    });
  });

  it('in REMOTEIMPORT mode, the unlisted channel button is available', () => {
    // ...and clicking it opens the channel token modal
    setTransferType('remoteimport');
    const wrapper = makeWrapper({ store });
    const { unlistedChannelsSection, channelTokenModal } = getElements(wrapper);
    const button = unlistedChannelsSection()[0].first('button');
    button.trigger('click');
    return wrapper.vm.$nextTick().then(() => {
      assert(channelTokenModal().isVueComponent);
    });
  });

  it('in LOCALIMPORT and LOCALEXPORT mode, the unlisted channel button is not available', () => {
    setTransferType('localexport');
    const wrapper = makeWrapper({ store });
    const { unlistedChannelsSection } = getElements(wrapper);
    assert.deepEqual(unlistedChannelsSection(), []);
  });

  it('in LOCALEXPORT mode, the back link text and title are correct', () => {
    setTransferType('localexport');
    store.state.pageState.wizardState.selectedDrive = {
      id: 'f9e29616935fbff37913ed46bf20e2c0',
      name: 'SANDISK (F:)',
    };
    const wrapper = makeWrapper({ store });
    const { wholePageBackText, titleText } = getElements(wrapper);
    assert.equal(wholePageBackText(), 'Export to SANDISK (F:)');
    assert.equal(titleText(), 'Your channels');
  });

  it('in LOCALIMPORT mode, the back link text and title are correct', () => {
    setTransferType('localimport');
    store.state.pageState.wizardState.selectedDrive = {
      id: 'f9e29616935fbff37913ed46bf20e2c0',
      name: 'SANDISK (G:)',
    };
    const wrapper = makeWrapper({ store });
    const { wholePageBackText, titleText } = getElements(wrapper);
    assert.equal(wholePageBackText(), 'Import from SANDISK (G:)');
    assert.equal(titleText(), 'SANDISK (G:)');
  });

  it('in REMOTEIMPORT mode, the back link text and title are correct', () => {
    setTransferType('remoteimport');
    const wrapper = makeWrapper({ store });
    const { wholePageBackText, titleText } = getElements(wrapper);
    assert.equal(wholePageBackText(), 'Kolibri Central Server');
    assert.equal(titleText(), 'Channels');
  });

  it('in LOCALEXPORT shows the correct number of channels available message', () => {
    setTransferType('localexport');
    store.state.pageState.wizardState.availableChannels = [...channelsOnDevice];
    const wrapper = makeWrapper({ store });
    const { channelsAvailableText, noChannels } = getElements(wrapper);
    assert.equal(channelsAvailableText(), '2 channels available');
    assert.deepEqual(noChannels(), []);
  });

  it('in REMOTEIMPORT/LOCALIMPORT shows the correct number of channels available message', () => {
    setTransferType('localimport');
    const wrapper = makeWrapper({ store });
    const { channelsAvailableText, noChannels } = getElements(wrapper);
    assert.equal(channelsAvailableText(), '4 channels available');
    assert.deepEqual(noChannels(), []);
  });

  it('if there are no channels, then filters do not appear', () => {
    store.state.pageState.wizardState.availableChannels = [];
    const wrapper = makeWrapper({ store });
    const { filters } = getElements(wrapper);
    assert.deepEqual(filters(), []);
  });

  it('in LOCALIMPORT/REMOTEIMPORT, channel item (not) on device has the correct props', () => {
    const wrapper = makeWrapper();
    const { channelListItems } = getElements(wrapper);
    const channels = channelListItems();
    assert.equal(channels[0].getProp('mode'), 'IMPORT');
    assert.equal(channels[0].getProp('onDevice'), true);
    assert.equal(channels[1].getProp('onDevice'), false);
    assert.equal(channels[2].getProp('onDevice'), false);
    assert.equal(channels[3].getProp('onDevice'), true);
  });

  it('IN LOCALEXPORT, with no filters, all channels (with resources) appear', () => {
    setTransferType('localexport');
    store.state.pageState.wizardState.availableChannels = [...channelsOnDevice];
    const wrapper = makeWrapper({ store });
    assert.equal(wrapper.vm.titleFilter, '');
    assert.equal(wrapper.vm.languageFilter.value, 'ALL');
    testChannelVisibility(wrapper, [true, false, false, true]);
  });

  it('IN LOCALIMPORT/REMOTEIMPORT, with no filters, all appear', () => {
    setTransferType('localimport');
    const wrapper = makeWrapper({ store });
    assert.equal(wrapper.vm.titleFilter, '');
    assert.equal(wrapper.vm.languageFilter.value, 'ALL');
    testChannelVisibility(wrapper, [true, true, true, true]);
  });

  it('the correct language filter options appear', () => {
    const wrapper = makeWrapper();
    const { languageFilter } = getElements(wrapper);
    // Fake labels for now
    const expected = [
      { label: 'All Languages', value: 'ALL' },
      { label: 'English', value: 'en' },
      { label: 'German', value: 'de' },
    ];
    assert.deepEqual(languageFilter().getProp('options'), expected);
  });

  it('with language filter, the correct channels appear', () => {
    const wrapper = makeWrapper();
    const { languageFilter } = getElements(wrapper);
    const filter = languageFilter();
    // Can't seem to trigger the event, so calling setValue method directly
    filter.vm.setValue({ label: 'English', value: 'en' });
    return wrapper.vm.$nextTick().then(() => {
      testChannelVisibility(wrapper, [true, false, false, false]);
    });
  });

  it('with keyword filter, the correct channels appear', () => {
    const wrapper = makeWrapper();
    const { titleFilter } = getElements(wrapper);
    const filter = titleFilter();
    // Can't trigger 'input' event; need to set new value manually
    filter.vm.model = 'bir ch';
    return wrapper.vm.$nextTick().then(() => {
      assert.equal(wrapper.vm.titleFilter, 'bir ch');
      testChannelVisibility(wrapper, [false, true, false, false]);
    });
  });

  it('with both filters, the correct channels appear', () => {
    const wrapper = makeWrapper();
    const { languageFilter, titleFilter } = getElements(wrapper);
    const lFilter = languageFilter();
    const tFilter = titleFilter();
    lFilter.vm.setValue({ label: 'German', value: 'de' });
    tFilter.vm.model = 'hund';
    return wrapper.vm.$nextTick().then(() => {
      testChannelVisibility(wrapper, [false, false, true, false]);
    });
  });

  it('clicking "select" on one of the channels invokes page-transition action', () => {
    const wrapper = makeWrapper();
    const { channelListItems } = getElements(wrapper);
    const actionStub = sinon.stub(wrapper.vm, 'transitionWizardPage');
    const channels = channelListItems();
    channels[0].first('button').trigger('click');
    return wrapper.vm.$nextTick().then(() => {
      sinon.assert.calledOnce(actionStub);
      sinon.assert.calledWith(actionStub, 'forward', { channel: availableChannels[0] });
    });
  });
});
