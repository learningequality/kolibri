import { mount, shallowMount, createLocalVue } from '@vue/test-utils';
import flushPromises from 'flush-promises';
import Vuex, { Store } from 'vuex';
import VueRouter from 'vue-router';
import KCircularLoader from 'kolibri-design-system/lib/loaders/KCircularLoader';
import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
import ContentNodeResource from 'kolibri-common/apiResources/ContentNodeResource';
import useUser from 'kolibri/composables/useUser';
/* eslint-disable import/named */
import useBaseSearch, { useBaseSearchMock } from 'kolibri-common/composables/useBaseSearch';
import useChannels, { useChannelsMock } from 'kolibri-common/composables/useChannels';
/* eslint-enable import/named */
import { PageNames } from '../../src/constants';
import LibraryPage from '../../src/views/LibraryPage';
import OtherLibraries from '../../src/views/LibraryPage/OtherLibraries';
/* eslint-disable import/named */
import usePinnedDevices, { usePinnedDevicesMock } from '../../src/composables/usePinnedDevices';
import useDevices, { useDevicesMock } from '../../src/composables/useDevices';
/* eslint-enable import/named */

const localVue = createLocalVue();
localVue.use(Vuex);
localVue.use(VueRouter);
const router = new VueRouter({
  routes: [
    {
      path: '/',
      name: PageNames.TOPICS_TOPIC,
    },
  ],
});

const CHANNEL_ID = 'channel-id';
const CHANNEL = {
  id: CHANNEL_ID,
  name: 'test channel',
  root: 'test root',
  thumbnail: 'test thumbnail',
};

jest.mock('kolibri-common/composables/useChannels');
jest.mock('../../src/composables/useCardLayoutSpan');
jest.mock('../../src/composables/useDevices');
jest.mock('../../src/composables/useLearnerResources');
jest.mock('../../src/composables/useLearningActivities');
jest.mock('../../src/composables/useContentLink');
jest.mock('../../src/composables/usePinnedDevices');
jest.mock('kolibri-common/composables/useBaseSearch');
jest.mock('kolibri/composables/useUser');
jest.mock('kolibri-design-system/lib/composables/useKResponsiveWindow');
jest.mock('kolibri-common/apiResources/ContentNodeResource');
jest.mock('kolibri/urls');

async function makeWrapper({ options, fullMount = false } = {}) {
  const store = new Store({
    state: { core: { loading: false } },
    getters: {
      isUserLoggedIn: jest.fn(),
      isLearner: jest.fn(),
      isSuperuser: jest.fn(),
      isAdmin: jest.fn(),
      isCoach: jest.fn(),
      isAppContext: jest.fn(),
      getUserKind: jest.fn(),
      isPageLoading: jest.fn(),
      pageSessionId: jest.fn(() => 0),
    },
    mutations: {
      SET_WELCOME_MODAL_VISIBLE: jest.fn(),
      SET_PAGE_NAME: jest.fn(),
      CORE_SET_PAGE_LOADING: jest.fn(),
      CORE_SET_ERROR: jest.fn(),
    },
  });
  let wrapper;
  if (fullMount) {
    wrapper = mount(LibraryPage, { store, localVue, router, ...options });
  } else {
    wrapper = shallowMount(LibraryPage, { store, localVue, router, ...options });
  }
  await flushPromises();
  return wrapper;
}

describe('LibraryPage', () => {
  beforeEach(() => {
    // reset back to defaults
    useChannels.mockImplementation(() =>
      useChannelsMock({
        channelsMap: {
          [CHANNEL_ID]: CHANNEL,
        },
        fetchChannels: jest.fn(() => Promise.resolve([CHANNEL])),
      }),
    );
    ContentNodeResource.fetchCollection.mockImplementation(() =>
      Promise.resolve([{ id: 'test', title: 'test', channel_id: CHANNEL_ID }]),
    );
  });
  describe('filters button', () => {
    it('is visible when the page is not large and channels are available', async () => {
      useKResponsiveWindow.mockImplementation(() => ({
        windowIsLarge: false,
      }));
      const wrapper = await makeWrapper();
      expect(wrapper.find('[data-test="filter-button"').element).toBeTruthy();
    });
    it('is hidden when the page is not large and channels not are available', async () => {
      useKResponsiveWindow.mockImplementation(() => ({
        windowIsLarge: false,
      }));
      const wrapper = await makeWrapper({ rootNodes: [] });
      await wrapper.setData({ isLocalLibraryEmpty: true });
      expect(wrapper.find('[data-test="filter-button"').element).toBeFalsy();
    });
    it('is hidden when the page is large and channels not are available', async () => {
      useKResponsiveWindow.mockImplementation(() => ({
        windowIsLarge: true,
      }));
      const wrapper = await makeWrapper();
      expect(wrapper.find('[data-test="filter-button"').element).toBeFalsy();
    });
    it('is hidden when the page is large and channels are available', async () => {
      useKResponsiveWindow.mockImplementation(() => ({
        windowIsLarge: true,
      }));
      const wrapper = await makeWrapper();
      expect(wrapper.find('[data-test="filter-button"').element).toBeFalsy();
    });
  });

  describe('when user clicks the filters button', () => {
    it('displays the filters side panel, which is not displayed by default', async () => {
      useKResponsiveWindow.mockImplementation(() => ({
        windowIsLarge: false,
      }));
      // mount to ensure we can click the button
      const wrapper = await makeWrapper({
        fullMount: true,
        options: { stubs: ['SidePanelModal'] },
      });
      // not displayed by default
      expect(wrapper.find('[data-test="side-panel"]').element).toBeUndefined();
      wrapper.find('[data-test="filter-button"]').trigger('click');
      await wrapper.vm.$nextTick();
      expect(wrapper.findComponent({ name: 'SearchFiltersPanel' }).element).toBeTruthy();
    });
  });

  describe('displaying channels and recent/popular content ', () => {
    beforeAll(() => {
      useBaseSearch.mockImplementation(() => useBaseSearchMock({ displayingSearchResults: false }));
    });
    /** useBaseSearch#displayingSearchResults is falsy and there are rootNodes */
    it('displays a grid of channel cards', async () => {
      const wrapper = await makeWrapper();
      expect(wrapper.find('[data-test="channels"').element).toBeTruthy();
      expect(wrapper.find("[data-test='channel-cards']").exists()).toBe(true);
    });
    it('displays a ResumableContentGrid', async () => {
      const wrapper = await makeWrapper();
      expect(wrapper.find('[data-test="channels"').element).toBeTruthy();
      expect(wrapper.findComponent({ name: 'ResumableContentGrid' }).exists()).toBe(true);
    });
  });

  describe('when page is loading', () => {
    it('shows a KCircularLoader', async () => {
      useBaseSearch.mockImplementation(() => useBaseSearchMock({ searchLoading: true }));
      const wrapper = await makeWrapper();
      expect(wrapper.findComponent(KCircularLoader).exists()).toBeTruthy();
    });
  });

  describe('nothing in library label', () => {
    beforeAll(() => {
      useBaseSearch.mockImplementation(() => useBaseSearchMock({ displayingSearchResults: false }));
    });
    it('display when no channels are available', async () => {
      const wrapper = await makeWrapper({ rootNodes: [] });
      await wrapper.setData({ isLocalLibraryEmpty: true });
      expect(wrapper.find('[data-test="channels"').element).toBeTruthy();
      expect(wrapper.find('[data-test="nothing-in-lib-label"').element).toBeTruthy();
    });
    it('hide when channels are available', async () => {
      const wrapper = await makeWrapper({ rootNodes: [] });
      expect(wrapper.find('[data-test="channels"').element).toBeTruthy();
      expect(wrapper.find('[data-test="nothing-in-lib-label"').element).toBeFalsy();
    });
  });

  describe('Resumable content', () => {
    beforeAll(() => {
      useBaseSearch.mockImplementation(() => useBaseSearchMock({ displayingSearchResults: false }));
    });
    it('show content', async () => {
      const wrapper = await makeWrapper();
      expect(wrapper.find('[data-test="channels"').element).toBeTruthy();
      expect(wrapper.find('[data-test="resumable-content"').element).toBeTruthy();
    });
    it('hide content', async () => {
      const wrapper = await makeWrapper({
        options: {
          propsData: {
            deviceId: 'abc123',
          },
        },
      });
      expect(wrapper.find('[data-test="channels"').element).toBeTruthy();
      expect(wrapper.find('[data-test="resumable-content"').element).toBeFalsy();
    });
  });

  describe('Other Libraries', () => {
    let wrapper;
    const translations = {
      otherLibraries: 'Other',
      searchingOtherLibrary: 'Searching',
      noOtherLibraries: 'None',
      showingAllLibraries: 'Showing',
      moreLibraries: 'More',
      pinned: 'Pinned',
    };
    async function makeOtherLibrariesWrapper({ options } = {}) {
      const wrapper = shallowMount(OtherLibraries, {
        localVue,
        router,
        ...options,
        propsData: {
          injectedtr: msgId => translations[msgId], // mock the translation function
        },
      });
      await flushPromises();
      return wrapper;
    }
    beforeEach(() => {
      useUser.mockImplementation(() => ({ isUserLoggedIn: true }));
      useBaseSearch.mockImplementation(() => useBaseSearchMock({ displayingSearchResults: false }));
    });

    it('show other libraries', async () => {
      wrapper = await makeWrapper();
      expect(wrapper.find('[data-test="other-libraries"').element).toBeTruthy();
    });

    describe('Loading status', () => {
      it('display "searching" label', async () => {
        useDevices.mockImplementation(() =>
          useDevicesMock({
            isLoadingChannels: true,
          }),
        );
        wrapper = await makeOtherLibrariesWrapper();
        expect(wrapper.find('[data-test="searching"').isVisible()).toBe(true);
        expect(wrapper.find('[data-test="searching-label"').text()).toEqual(
          translations.searchingOtherLibrary,
        );
      });
      it('display "showing all" label', async () => {
        useDevices.mockImplementation(() =>
          useDevicesMock({
            isLoadingChannels: false,
            networkDevicesWithChannels: [
              { instance_id: '1' },
              { instance_id: '2' },
              { instance_id: '3' },
              { instance_id: '4' },
            ],
          }),
        );
        wrapper = await makeOtherLibrariesWrapper();
        expect(wrapper.find('[data-test="showing-all"').isVisible()).toBe(true);
        expect(wrapper.find('[data-test="showing-all-label"').text()).toEqual(
          translations.showingAllLibraries,
        );
      });
      it('display "no other" label', async () => {
        useDevices.mockImplementation(() =>
          useDevicesMock({
            isLoadingChannels: false,
          }),
        );
        wrapper = await makeOtherLibrariesWrapper();
        expect(wrapper.find('[data-test="no-other"').isVisible()).toBe(true);
        expect(wrapper.find('[data-test="no-other-label"').text()).toEqual(
          translations.noOtherLibraries,
        );
      });
      it('display "pinned" label', async () => {
        usePinnedDevices.mockImplementation(() =>
          usePinnedDevicesMock({
            pinnedDevicesExist: jest.fn(() => true),
            unpinnedDevicesExist: jest.fn(() => true),
            pinnedDevices: [{ instance_id: '1' }],
            unpinnedDevices: [{ instance_id: '2' }, { instance_id: '3' }, { instance_id: '4' }],
          }),
        );
        useDevices.mockImplementation(() =>
          useDevicesMock({
            deviceChannelsMap: {
              1: [CHANNEL],
              2: [CHANNEL],
              3: [CHANNEL],
              4: [CHANNEL],
            },
            networkDevicesWithChannels: [
              { instance_id: '1' },
              { instance_id: '2' },
              { instance_id: '3' },
              { instance_id: '4' },
            ],
          }),
        );
        wrapper = await makeOtherLibrariesWrapper();
        const pinnedLabel = wrapper.find('[data-test="pinned-label"');
        expect(pinnedLabel.element).toBeTruthy();
        expect(pinnedLabel.text()).toEqual(translations.pinned);
        expect(wrapper.find('[data-test="pinned-resources"').element).toBeTruthy();
      });
      it('display "more" label', async () => {
        usePinnedDevices.mockImplementation(() =>
          usePinnedDevicesMock({
            pinnedDevicesExist: jest.fn(() => true),
            unpinnedDevicesExist: jest.fn(() => true),
            pinnedDevices: [{ instance_id: '1' }],
            unpinnedDevices: [{ instance_id: '2' }, { instance_id: '3' }, { instance_id: '4' }],
          }),
        );
        useDevices.mockImplementation(() =>
          useDevicesMock({
            deviceChannelsMap: {
              1: [CHANNEL],
              2: [CHANNEL],
              3: [CHANNEL],
              4: [CHANNEL],
            },
            networkDevicesWithChannels: [
              { instance_id: '1' },
              { instance_id: '2' },
              { instance_id: '3' },
              { instance_id: '4' },
            ],
          }),
        );
        wrapper = await makeOtherLibrariesWrapper();
        const moreLabel = wrapper.find('[data-test="more-label"');
        expect(moreLabel.element).toBeTruthy();
        expect(moreLabel.text()).toEqual(translations.moreLibraries);
        expect(wrapper.find('[data-test="more-devices"').element).toBeTruthy();
      });
    });
  });

  describe('SearchResultsGrid', () => {
    beforeEach(() => {
      useBaseSearch.mockImplementation(() => useBaseSearchMock({ displayingSearchResults: true }));
    });
    it('display search results grid', async () => {
      const wrapper = await makeWrapper();
      expect(wrapper.find('[data-test="search-results"').element).toBeTruthy();
    });
  });

  describe('SidePanel', () => {
    it('display side panel if local libraries are available', async () => {
      useKResponsiveWindow.mockImplementation(() => ({
        windowIsLarge: true,
      }));
      const wrapper = await makeWrapper();
      expect(wrapper.find('[data-test="side-panel-local"').element).toBeTruthy();
    });
  });

  describe('SidePanelModal', () => {
    it('display side panel modal if local libraries are available', async () => {
      const wrapper = await makeWrapper();
      await wrapper.setData({ metadataSidePanelContent: { learning_activities: [] } });
      expect(wrapper.find('[data-test="side-panel-modal"').element).toBeTruthy();
    });
  });
});
