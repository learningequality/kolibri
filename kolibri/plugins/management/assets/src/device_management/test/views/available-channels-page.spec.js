/* eslint-env mocha */
import Vue from 'vue-test'; // eslint-disable-line
import Vuex from 'vuex';
import VueRouter from 'vue-router';
import assert from 'assert';
import sinon from 'sinon';
import { mount } from 'avoriaz';
import AvailableChannelsPage from '../../views/available-channels-page.vue';
import ChannelListItem from '../../views/manage-content-page/channel-list-item.vue';
import UiSelect from 'keen-ui/src/UiSelect';
import kFilterTextbox from 'kolibri.coreVue.components.kFilterTextbox';
import ImmersiveFullScreen from 'kolibri.coreVue.components.immersiveFullScreen';

const router = new VueRouter({
  routes: [
    { path: '', name: 'wizardtransition' }
  ],
});

const defaultChannels = [
  { name: 'Awesome Channel', id: 'awesome_channel', language_code: 'en', language: 'English' },
  { name: 'Bird Channel', id: 'bird_channel' },
  { name: 'Hunden Channel', id: 'hunden_channel', language_code: 'de', language: 'German' },
  { name: 'Kaetze Channel', id: 'kaetze_channel', language_code: 'de', language: 'German' },
];

const channelsOnDevice = [
  { name: 'Awesome Channel', id: 'awesome_channel' },
  { name: 'Kaetze Channel', id: 'kaetze_channel', language_code: 'de' },
];

function makeStore() {
  return new Vuex.Store({
    state: {
      pageState: {
        wizardState: {
          availableChannels: defaultChannels,
          channelsOnDevice,
        },
      },
    },
  });
}

function makeWrapper(options = {}) {
  const { store, props = {} } = options;
  const defaultProps = {};
  return mount(AvailableChannelsPage, {
    propsData: {...defaultProps, ...props },
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
    filters: () => wrapper.find('.filters'),
    languageFilter: () => wrapper.first(UiSelect),
    titleFilter: () => wrapper.first(kFilterTextbox),
    wholePageBackLink: () => wrapper.first(ImmersiveFullScreen).getProp('backPageLink'),
  }
}

function testChannelVisibility(wrapper, visibilities) {
  const channels = getElements(wrapper).channelListItems();
  visibilities.forEach((v, i) => {
    assert.equal(!channels[i].hasStyle('display', 'none'), v);
  });
}

describe('availableChannelsPage', () => {

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

  it('shows the correct number of channels available message', () => {
    const wrapper = makeWrapper();
    const { channelsAvailableText, noChannels } = getElements(wrapper);
    assert.equal(channelsAvailableText(), '4 channels available');
    assert.deepEqual(noChannels(), []);
  });

  it('if there are no channels, then filters do not appear', () => {
    const store = makeStore();
    store.state.pageState.wizardState.availableChannels = [];
    const wrapper = makeWrapper({ store });
    const { filters } = getElements(wrapper);
    assert.deepEqual(filters(), []);
  });

  it('channel item (not) on device has the correct props', () => {
    // on import mode
    const wrapper = makeWrapper();
    const { channelListItems } = getElements(wrapper);
    const channels = channelListItems();
    assert.equal(channels[0].getProp('mode'), 'importing');
    assert.equal(channels[0].getProp('onDevice'), true);
    assert.equal(channels[1].getProp('onDevice'), false);
    assert.equal(channels[2].getProp('onDevice'), false);
    assert.equal(channels[3].getProp('onDevice'), true);
  });

  it('if in exporting flow, on device icon is not shown', () => {
    const store = makeStore();
    store.state.pageState.wizardState.transferType = 'localexport';
    const wrapper = makeWrapper({ store });
    const { channelListItems } = getElements(wrapper);
    const channels = channelListItems();
    assert.equal(channels[0].getProp('mode'), 'importing');
    assert.equal(channels[0].getProp('onDevice'), false);
    assert.equal(channels[1].getProp('onDevice'), false);
    assert.equal(channels[2].getProp('onDevice'), false);
    assert.equal(channels[3].getProp('onDevice'), false);

  });

  it('with no filters, all channels appear', () => {
    const wrapper = makeWrapper();
    assert.equal(wrapper.vm.titleFilter, '');
    assert.equal(wrapper.vm.languageFilter.value, 'ALL');
    // v-show = true for all
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
    ]
    assert.deepEqual(languageFilter().getProp('options'), expected);
  });

  it('with language filter, the correct channels appear', () => {
    const wrapper = makeWrapper();
    const { languageFilter } = getElements(wrapper);
    const filter = languageFilter();
    // Can't seem to trigger the event, so calling setValue method directly
    filter.vm.setValue({ label: 'English', value: 'en' });
    return wrapper.vm.$nextTick()
    .then(() => {
      testChannelVisibility(wrapper, [true, false, false, false]);
    });
  });

  it('with keyword filter, the correct channels appear', () => {
    const wrapper = makeWrapper();
    const { titleFilter } = getElements(wrapper);
    const filter = titleFilter();
    // Can't trigger 'input' event; need to set new value manually
    filter.vm.model = 'bir ch';
    return wrapper.vm.$nextTick()
    .then(() => {
      assert.equal(wrapper.vm.titleFilter, 'bir ch');
      testChannelVisibility(wrapper, [false, true, false, false])
    });
  });

  it('with both filters, the correct channels appear', () => {
    const wrapper = makeWrapper();
    const { languageFilter , titleFilter } = getElements(wrapper);
    const lFilter = languageFilter();
    const tFilter = titleFilter();
    lFilter.vm.setValue({ label: 'German', value: 'de' });
    tFilter.vm.model = 'hund';
    return wrapper.vm.$nextTick()
    .then(() => {
      testChannelVisibility(wrapper, [false, false, true, false]);
    });
  });

  it('clicking "select" on one of the channels invokes page-transition action', () => {
    const wrapper = makeWrapper();
    const { channelListItems } = getElements(wrapper);
    const actionStub = sinon.stub(wrapper.vm, 'transitionWizardPage');
    const channels = channelListItems();
    channels[0].first('button').trigger('click');
    return wrapper.vm.$nextTick()
    .then(() => {
      sinon.assert.calledOnce(actionStub);
      sinon.assert.calledWith(actionStub, 'forward', { id: defaultChannels[0].id });
    });
  });
})
