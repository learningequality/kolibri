import { mount, shallowMount, createLocalVue } from '@vue/test-utils';
import flushPromises from 'flush-promises';
import Vuex, { Store } from 'vuex';
import VueRouter from 'vue-router';
import KCircularLoader from 'kolibri-design-system/lib/loaders/KCircularLoader';
import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
import ContentNodeResource from 'kolibri-common/apiResources/ContentNodeResource';
import useUser from 'kolibri/composables/useUser';
import { coreString } from 'kolibri/uiText/commonCoreStrings';
/* eslint-disable import-x/named */
import useBaseSearch, { useBaseSearchMock } from 'kolibri-common/composables/useBaseSearch';
import useChannels, { useChannelsMock } from 'kolibri-common/composables/useChannels';
/* eslint-enable import-x/named */
import { PageNames } from '../../constants';
import LibraryPage from '../LibraryPage';
import SearchFiltersSidePanel from '../SearchFiltersSidePanel';
import OtherLibraries from '../LibraryPage/OtherLibraries';
/* eslint-disable import-x/named */
import usePinnedDevices, { usePinnedDevicesMock } from '../../composables/usePinnedDevices';
import useDevices, { useDevicesMock } from '../../composables/useDevices';
/* eslint-enable import-x/named */

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
jest.mock('../../composables/useCardLayoutSpan');
jest.mock('../../composables/useDevices');
jest.mock('../../composables/useLearnerResources');
jest.mock('kolibri-common/composables/useLearningActivities');
jest.mock('../../composables/useContentLink');
jest.mock('../../composables/usePinnedDevices');
jest.mock('kolibri-common/composables/usePageLoading');
jest.mock('kolibri-common/composables/useBaseSearch');
jest.mock('kolibri/composables/useUser');
jest.mock('kolibri-common/utils/samePageCheckGenerator', () => jest.fn(() => () => true));
jest.mock('kolibri-design-system/lib/composables/useKResponsiveWindow');
jest.mock('kolibri-common/apiResources/ContentNodeResource');
jest.mock('kolibri/urls');

async function makeWrapper({ options, fullMount = false } = {}) {
  const store = new Store({
    state: { core: {} },
    getters: {},
    mutations: {
      SET_WELCOME_MODAL_VISIBLE: jest.fn(),
      SET_PAGE_NAME: jest.fn(),
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
    useKResponsiveWindow.mockImplementation(() => ({
      windowBreakpoint: 4,
      windowIsLarge: true,
      windowIsMedium: false,
      windowIsSmall: false,
    }));
    useChannels.mockImplementation(() =>
      useChannelsMock({
        channelsMap: {
          [CHANNEL_ID]: CHANNEL,
        },
        fetchChannels: jest.fn(() => Promise.resolve([CHANNEL])),
      }),
    );
    ContentNodeResource.list.mockImplementation(() =>
      Promise.resolve([{ id: 'test', title: 'test', channel_id: CHANNEL_ID }]),
    );
  });
  describe('skip navigation', () => {
    it('marks the main landmark as the skip-link target, since the search bar precedes the h1', async () => {
      const wrapper = await makeWrapper();
      expect(wrapper.find('main.main-grid').attributes('data-skip-nav-target')).toBe('');
    });

    it("names the main landmark to match the page's own heading", async () => {
      const wrapper = await makeWrapper();
      expect(wrapper.find('main.main-grid').attributes('aria-label')).toBe(
        coreString('yourLibrary'),
      );
    });
  });

  describe('search bar', () => {
    it('is visible when channels are available', async () => {
      const wrapper = await makeWrapper();
      expect(wrapper.find('[data-testid="library-search-bar"').element).toBeTruthy();
    });
    it('is hidden when library is empty and no deviceId', async () => {
      const wrapper = await makeWrapper({ rootNodes: [] });
      await wrapper.setData({ isLocalLibraryEmpty: true });
      expect(wrapper.find('[data-testid="library-search-bar"').element).toBeFalsy();
    });
  });

  describe('filter modal', () => {
    it('filter modal is not displayed by default', async () => {
      const wrapper = await makeWrapper();
      expect(wrapper.findComponent(SearchFiltersSidePanel).exists()).toBe(false);
    });
    it('displays filter modal when showFilterModal is true', async () => {
      const wrapper = await makeWrapper();
      await wrapper.setData({ showFilterModal: true });
      expect(wrapper.findComponent(SearchFiltersSidePanel).exists()).toBe(true);
    });
  });

  describe('displaying channels and recent/popular content', () => {
    beforeAll(() => {
      useBaseSearch.mockImplementation(() => useBaseSearchMock({ displayingSearchResults: false }));
    });
    /* useBaseSearch#displayingSearchResults is falsy and there are rootNodes */
    it('displays a grid of channel cards', async () => {
      const wrapper = await makeWrapper();
      expect(wrapper.find('[data-testid="channels"').element).toBeTruthy();
      expect(wrapper.find("[data-testid='channel-cards']").exists()).toBe(true);
    });
    it('displays a ResumableContentGrid', async () => {
      const wrapper = await makeWrapper();
      expect(wrapper.find('[data-testid="channels"').element).toBeTruthy();
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
      await wrapper.setData({ isNetworkLibraryAvailable: true });
      await wrapper.setData({ isLoadingNetworkLibraries: false });
      expect(wrapper.find('[data-testid="channels"').element).toBeTruthy();
      expect(wrapper.find('[data-testid="nothing-in-lib-label"').element).toBeTruthy();
    });
    it('hide when channels are available', async () => {
      const wrapper = await makeWrapper({ rootNodes: [] });
      expect(wrapper.find('[data-testid="channels"').element).toBeTruthy();
      expect(wrapper.find('[data-testid="nothing-in-lib-label"').element).toBeFalsy();
    });
  });

  describe('Resumable content', () => {
    beforeAll(() => {
      useBaseSearch.mockImplementation(() => useBaseSearchMock({ displayingSearchResults: false }));
    });
    it('show content', async () => {
      const wrapper = await makeWrapper();
      expect(wrapper.find('[data-testid="channels"').element).toBeTruthy();
      expect(wrapper.find('[data-testid="resumable-content"').element).toBeTruthy();
    });
    it('hide content', async () => {
      const wrapper = await makeWrapper({
        options: {
          propsData: {
            deviceId: 'abc123',
          },
        },
      });
      expect(wrapper.find('[data-testid="channels"').element).toBeTruthy();
      expect(wrapper.find('[data-testid="resumable-content"').element).toBeFalsy();
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
      expect(wrapper.find('[data-testid="other-libraries"').element).toBeTruthy();
    });

    describe('Loading status', () => {
      it('display "searching" label', async () => {
        useDevices.mockImplementation(() =>
          useDevicesMock({
            isLoadingChannels: true,
          }),
        );
        wrapper = await makeOtherLibrariesWrapper();
        expect(wrapper.find('[data-testid="searching"').isVisible()).toBe(true);
        expect(wrapper.find('[data-testid="searching-label"').text()).toEqual(
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
        expect(wrapper.find('[data-testid="showing-all"').isVisible()).toBe(true);
        expect(wrapper.find('[data-testid="showing-all-label"').text()).toEqual(
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
        expect(wrapper.find('[data-testid="no-other"').isVisible()).toBe(true);
        expect(wrapper.find('[data-testid="no-other-label"').text()).toEqual(
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
        const pinnedLabel = wrapper.find('[data-testid="pinned-label"');
        expect(pinnedLabel.element).toBeTruthy();
        expect(pinnedLabel.text()).toEqual(translations.pinned);
        expect(wrapper.find('[data-testid="pinned-resources"').element).toBeTruthy();
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
        const moreLabel = wrapper.find('[data-testid="more-label"');
        expect(moreLabel.element).toBeTruthy();
        expect(moreLabel.text()).toEqual(translations.moreLibraries);
        expect(wrapper.find('[data-testid="more-devices"').element).toBeTruthy();
      });
    });
  });

  describe('SearchResultsGrid', () => {
    beforeEach(() => {
      useBaseSearch.mockImplementation(() => useBaseSearchMock({ displayingSearchResults: true }));
    });
    it('display search results grid', async () => {
      const wrapper = await makeWrapper();
      expect(wrapper.find('[data-testid="search-results"').element).toBeTruthy();
    });
  });

  describe('HorizontalFilterPills', () => {
    beforeAll(() => {
      useBaseSearch.mockImplementation(() => useBaseSearchMock({ displayingSearchResults: false }));
    });
    it('displays horizontal filter pills when not searching and library not empty', async () => {
      const wrapper = await makeWrapper();
      expect(wrapper.find('[data-testid="horizontal-filter-pills"').element).toBeTruthy();
    });
  });

  describe('SidePanelModal', () => {
    it('display side panel modal if local libraries are available', async () => {
      const wrapper = await makeWrapper();
      await wrapper.setData({ metadataSidePanelContent: { learning_activities: [] } });
      expect(wrapper.find('[data-testid="side-panel-modal"').element).toBeTruthy();
    });
  });
});
