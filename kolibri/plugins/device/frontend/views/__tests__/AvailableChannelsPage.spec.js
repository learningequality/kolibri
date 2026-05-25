import { mount } from '@vue/test-utils';
import AvailableChannelsPage from '../AvailableChannelsPage';
import { makeAvailableChannelsPageStore } from '../../__tests__/utils/makeStore';
import router from './testRouter';

jest.mock('kolibri/urls');
jest.mock('kolibri/client');
jest.mock('kolibri-common/composables/usePageLoading');

function makeWrapper(options = {}) {
  const { store, props = {} } = options;
  const defaultProps = {};
  const node = document.createElement('div');
  document.body.appendChild(node);
  return mount(AvailableChannelsPage, {
    propsData: { ...defaultProps, ...props },
    store: store || makeAvailableChannelsPageStore(),
    ...router,
    attachTo: node,
  });
}

// prettier-ignore
function getElements(wrapper) {
  return {
    noChannels: () => wrapper.find('.no-channels'),
    channelsList: () => wrapper.find('.channels-list'),
    channelsAvailableText: () => wrapper.find('[data-testid="available"]').text().trim(),
    channelListItems: () => wrapper.findAllComponents({ name: 'WithImportDetails' }),
    ChannelTokenModal: () => wrapper.findComponent({ name: 'ChannelTokenModal' }),
    filters: () => wrapper.find('.filters'),
    languageFilter: () => wrapper.findComponent({ name: 'KSelect' }),
    titleText: () => wrapper.find('[data-testid="title"]').text().trim(),
    titleFilter: () => wrapper.findComponent({ name: 'FilterTextbox' }),
    unlistedChannelsButton: () => wrapper.find('[data-testid="token-button"]'),
    filterComponent: () => wrapper.findComponent({name: 'FilteredChannelListContainer'}),
  }
}

function testChannelVisibility(wrapper, visibilities) {
  const channels = getElements(wrapper).channelListItems();
  visibilities.forEach((v, i) => {
    if (v) {
      expect(channels.at(i).element).toBeVisible();
    } else {
      expect(channels.at(i).element).not.toBeVisible();
    }
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

  it('in REMOTEIMPORT mode, the unlisted channel button is available', async () => {
    // ...and clicking it opens the channel token modal
    setTransferType('remoteimport');
    const wrapper = makeWrapper({ store });
    const { unlistedChannelsButton, ChannelTokenModal } = getElements(wrapper);
    // prettier-ignore
    const button = unlistedChannelsButton();
    button.trigger('click');
    await wrapper.vm.$nextTick();
    expect(ChannelTokenModal().exists()).toEqual(true);
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
      ({ id }) => id === 'f9e29616935fbff37913ed46bf20e2c0',
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
    const link = channels.at(0).findComponent({ name: 'KRouterLink' });
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

  describe('handleSubmitToken', () => {
    let wrapper;
    let pushSpy;

    beforeEach(() => {
      store = makeAvailableChannelsPageStore();
      store.commit('manageContent/wizard/SET_TRANSFER_TYPE', 'remoteimport');
      wrapper = makeWrapper({ store });
      pushSpy = jest.spyOn(wrapper.vm.$router, 'push').mockResolvedValue();
    });

    afterEach(() => {
      pushSpy.mockRestore();
      wrapper.destroy();
    });

    it('single-channel token: routes to selectContentPage with token in query', () => {
      wrapper.vm.handleSubmitToken({ token: 'test-token-xyz', channels: [{ id: 'channel-abc' }] });
      expect(pushSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'SELECT_CONTENT',
          query: expect.objectContaining({ token: 'test-token-xyz' }),
        }),
      );
    });

    it('collection token (multiple channels): does not route to SELECT_CONTENT', () => {
      wrapper.vm.handleSubmitToken({
        token: 'collection-token',
        channels: [{ id: 'ch-1' }, { id: 'ch-2' }],
      });
      expect(pushSpy).toHaveBeenCalledTimes(1);
      const pushed = pushSpy.mock.calls[0][0];
      expect(pushed.name).not.toBe('SELECT_CONTENT');
      expect(pushed.query).toMatchObject({ token: 'collection-token' });
    });
  });

  describe('handleSubmitToken redirect', () => {
    beforeEach(async () => {
      // Reset shared router to AVAILABLE_CHANNELS so each navigation test starts fresh
      await router.router.push({ name: 'AVAILABLE_CHANNELS' }).catch(() => {});
    });

    it('redirects to NewChannelVersionPage when token-resolved version differs from installed', async () => {
      store.commit('manageContent/wizard/SET_TRANSFER_TYPE', 'remoteimport');
      const wrapper = makeWrapper({ store });

      // awesome_channel is installed at version 10 (from test data in makeStore)
      // Token resolves to version 11 — a different version
      await wrapper.vm.handleSubmitToken({
        token: 'my-token',
        channels: [{ id: 'awesome_channel', version: 11 }],
      });
      await wrapper.vm.$nextTick();

      expect(wrapper.vm.$route.name).toBe('NEW_CHANNEL_VERSION_PAGE');
      expect(wrapper.vm.$route.params.channel_id).toBe('awesome_channel');
      expect(wrapper.vm.$route.query.token).toBe('my-token');
    });

    it('redirects to NewChannelVersionPage for an installed draft (version 0) even when versions match', async () => {
      // A draft always reports version 0, so an installed draft has the same version
      // number as a changed draft. The version-difference check alone would skip the
      // upgrade flow, so drafts must always route to it.
      const draftStore = makeAvailableChannelsPageStore({
        channelList: [
          {
            id: 'draft_channel',
            name: 'Draft',
            version: 0,
            available: true,
            on_device_resources: 5,
            on_device_file_size: 100,
          },
        ],
      });
      draftStore.commit('manageContent/wizard/SET_TRANSFER_TYPE', 'remoteimport');
      const wrapper = makeWrapper({ store: draftStore });

      await wrapper.vm.handleSubmitToken({
        token: 'my-token',
        channels: [{ id: 'draft_channel', version: 0 }],
      });
      await wrapper.vm.$nextTick();

      expect(wrapper.vm.$route.name).toBe('NEW_CHANNEL_VERSION_PAGE');
      expect(wrapper.vm.$route.params.channel_id).toBe('draft_channel');
      expect(wrapper.vm.$route.query.token).toBe('my-token');
    });

    it('goes to SelectContentPage when token-resolved version matches installed', async () => {
      store.commit('manageContent/wizard/SET_TRANSFER_TYPE', 'remoteimport');
      const wrapper = makeWrapper({ store });

      // awesome_channel is installed at version 10; token also resolves to version 10
      await wrapper.vm.handleSubmitToken({
        token: 'my-token',
        channels: [{ id: 'awesome_channel', version: 10 }],
      });
      await wrapper.vm.$nextTick();

      expect(wrapper.vm.$route.name).toBe('SELECT_CONTENT');
    });

    it('goes to SelectContentPage when channel is not installed', async () => {
      store.commit('manageContent/wizard/SET_TRANSFER_TYPE', 'remoteimport');
      const wrapper = makeWrapper({ store });

      // new_uninstalled_channel is not in channelsOnDevice
      await wrapper.vm.handleSubmitToken({
        token: 'my-token',
        channels: [{ id: 'new_uninstalled_channel', version: 1 }],
      });
      await wrapper.vm.$nextTick();

      expect(wrapper.vm.$route.name).toBe('SELECT_CONTENT');
    });
  });
});
