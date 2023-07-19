import { mount, shallowMount, createLocalVue } from '@vue/test-utils';
import Vuex from 'vuex';
import VueRouter from 'vue-router';
import KCircularLoader from 'kolibri-design-system/lib/loaders/KCircularLoader';
import useKResponsiveWindow from 'kolibri-design-system/lib/useKResponsiveWindow';
import { PageNames } from '../../src/constants';
import LibraryPage from '../../src/views/LibraryPage';
/* eslint-disable import/named */
import useSearch, { useSearchMock } from '../../src/composables/useSearch';
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

// rootNodes used when showing default view, should always have length
const mockStore = (rootNodes = ['length'], getters = {}) => {
  return new Vuex.Store({
    state: { rootNodes, core: { loading: false } },
    getters: {
      isUserLoggedIn: jest.fn(),
      isLearner: jest.fn(),
      isSuperuser: jest.fn(),
      isAdmin: jest.fn(),
      isCoach: jest.fn(),
      isAppContext: jest.fn(),
      getUserKind: jest.fn(),
      getRootNodesLoading: jest.fn(),
      ...getters,
    },
  });
};

jest.mock('../../src/composables/useChannels');
jest.mock('../../src/composables/useDevices');
jest.mock('../../src/composables/useSearch');
jest.mock('../../src/composables/useLearnerResources');
jest.mock('../../src/composables/useLearningActivities');
jest.mock('../../src/composables/useContentLink');
jest.mock('../../src/composables/usePinnedDevices');
jest.mock('kolibri-design-system/lib/useKResponsiveWindow');
jest.mock('kolibri.resources');
jest.mock('kolibri.urls');

function makeWrapper({ rootNodes = ['length'], getters, options, fullMount = false } = {}) {
  // rootNodes used when showing default view, should always have length
  const store = new Vuex.Store({
    state: { rootNodes, core: { loading: false } },
    getters: {
      isUserLoggedIn: jest.fn(),
      isLearner: jest.fn(),
      isSuperuser: jest.fn(),
      isAdmin: jest.fn(),
      isCoach: jest.fn(),
      isAppContext: jest.fn(),
      getUserKind: jest.fn(),
      ...getters,
    },
  });
  if (fullMount) {
    return mount(LibraryPage, { store, localVue, router, ...options });
  } else {
    return shallowMount(LibraryPage, { store, localVue, router, ...options });
  }
}

describe('LibraryPage', () => {
  describe('filters button', () => {
    it('is visible when the page is not large and channels are available', () => {
      useKResponsiveWindow.mockImplementation(() => ({
        windowIsLarge: false,
      }));
      const wrapper = makeWrapper();
      expect(wrapper.find('[data-test="filter-button"').element).toBeTruthy();
    });
    it('is hidden when the page is not large and channels not are available', async () => {
      useKResponsiveWindow.mockImplementation(() => ({
        windowIsLarge: false,
      }));
      const wrapper = makeWrapper({ rootNodes: [] });
      await wrapper.setData({ isLocalLibraryEmpty: true });
      expect(wrapper.find('[data-test="filter-button"').element).toBeFalsy();
    });
    it('is hidden when the page is large and channels not are available', () => {
      useKResponsiveWindow.mockImplementation(() => ({
        windowIsLarge: true,
      }));
      const wrapper = makeWrapper();
      expect(wrapper.find('[data-test="filter-button"').element).toBeFalsy();
    });
    it('is hidden when the page is large and channels are available', () => {
      useKResponsiveWindow.mockImplementation(() => ({
        windowIsLarge: true,
      }));
      const wrapper = makeWrapper();
      expect(wrapper.find('[data-test="filter-button"').element).toBeFalsy();
    });
  });

  describe('when user clicks the filters button', () => {
    it('displays the filters side panel, which is not displayed by default', async () => {
      useKResponsiveWindow.mockImplementation(() => ({
        windowIsLarge: false,
      }));
      // mount to ensure we can click the button
      const wrapper = makeWrapper({
        fullMount: true,
        options: { stubs: ['SidePanelModal', 'LearnTopNav'] },
      });
      // not displayed by default
      expect(wrapper.findComponent({ name: 'SearchFiltersPanel' }).element).toBeUndefined();
      wrapper.find('[data-test="filter-button"]').trigger('click');
      await wrapper.vm.$nextTick();
      expect(wrapper.findComponent({ name: 'SearchFiltersPanel' }).element).toBeTruthy();
    });
  });

  describe('displaying channels and recent/popular content ', () => {
    beforeAll(() => {
      useSearch.mockImplementation(() => useSearchMock({ displayingSearchResults: false }));
    });
    /** useSearch#displayingSearchResults is falsy and there are rootNodes.length */
    it('displays a grid of channel cards', () => {
      const wrapper = makeWrapper();
      expect(wrapper.find('[data-test="channels"').element).toBeTruthy();
      expect(wrapper.find("[data-test='channel-cards']").exists()).toBe(true);
    });
    it('displays a ResumableContentGrid', () => {
      const wrapper = makeWrapper();
      expect(wrapper.find('[data-test="channels"').element).toBeTruthy();
      expect(wrapper.findComponent({ name: 'ResumableContentGrid' }).exists()).toBe(true);
    });
  });

  describe('when page is loading', () => {
    it('shows a KCircularLoader', () => {
      useSearch.mockImplementation(() => useSearchMock({ searchLoading: true }));
      const wrapper = makeWrapper();
      expect(wrapper.findComponent(KCircularLoader).exists()).toBeTruthy();
    });
  });

  describe('nothing in library label', () => {
    beforeAll(() => {
      useSearch.mockImplementation(() => useSearchMock({ displayingSearchResults: false }));
    });
    it('display when no channels are available', async () => {
      const wrapper = makeWrapper({ rootNodes: [] });
      await wrapper.setData({ isLocalLibraryEmpty: true });
      expect(wrapper.find('[data-test="channels"').element).toBeTruthy();
      expect(wrapper.find('[data-test="nothing-in-lib-label"').element).toBeTruthy();
    });
    it('hide when channels are available', () => {
      const wrapper = shallowMount(LibraryPage, {
        localVue,
        store: mockStore(),
      });
      expect(wrapper.find('[data-test="channels"').element).toBeTruthy();
      expect(wrapper.find('[data-test="nothing-in-lib-label"').element).toBeFalsy();
    });
  });

  describe('Resumable content', () => {
    beforeAll(() => {
      useSearch.mockImplementation(() => useSearchMock({ displayingSearchResults: false }));
    });
    it('show content', () => {
      const wrapper = makeWrapper();
      expect(wrapper.find('[data-test="channels"').element).toBeTruthy();
      expect(wrapper.find('[data-test="resumable-content"').element).toBeTruthy();
    });
    it('hide content', () => {
      const wrapper = makeWrapper({
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
    const getters = {
      isUserLoggedIn: () => true,
    };
    const translations = {
      otherLibraries: 'Other',
      searchingOtherLibrary: 'Searching',
      noOtherLibraries: 'None',
      showingAllLibraries: 'Showing',
      moreLibraries: 'More',
      pinned: 'Pinned',
    };
    const options = {
      methods: {
        refreshDevices: jest.fn(),
      },
      $trs: translations,
    };
    beforeEach(() => {
      useSearch.mockImplementation(() => useSearchMock({ displayingSearchResults: false }));
    });

    it('show other libraries', () => {
      wrapper = makeWrapper({ getters, options });
      expect(wrapper.find('[data-test="other-libraries"').element).toBeTruthy();
    });

    describe('Loading status', () => {
      it('display "searching" label', async () => {
        wrapper = makeWrapper({ getters, options });
        await wrapper.setData({ searching: true });
        expect(wrapper.find('[data-test="searching"').isVisible()).toBe(true);
        expect(wrapper.find('[data-test="searching-label"').text()).toEqual(
          translations.searchingOtherLibrary
        );
      });
      it('display "showing all" label', async () => {
        wrapper = makeWrapper({
          getters,
          options: {
            ...options,
            computed: {
              devicesWithChannelsExist: jest.fn(() => true),
            },
          },
        });
        await wrapper.setData({ searching: false });
        expect(wrapper.find('[data-test="showing-all"').isVisible()).toBe(true);
        expect(wrapper.find('[data-test="showing-all-label"').text()).toEqual(
          translations.showingAllLibraries
        );
      });
      it('display "no other" label', async () => {
        wrapper = makeWrapper({
          getters,
          options: {
            ...options,
            computed: {
              devicesWithChannelsExist: jest.fn(() => false),
            },
          },
        });
        await wrapper.setData({ searching: false });
        expect(wrapper.find('[data-test="no-other"').isVisible()).toBe(true);
        expect(wrapper.find('[data-test="no-other-label"').text()).toEqual(
          translations.noOtherLibraries
        );
      });
      it('display "pinned" label', async () => {
        wrapper = makeWrapper({
          getters,
          options: {
            ...options,
            computed: {
              pinnedDevicesExist: jest.fn(() => true),
              unpinnedDevicesExist: jest.fn(() => true),
            },
          },
        });
        const pinnedLabel = wrapper.find('[data-test="pinned-label"');
        expect(pinnedLabel.element).toBeTruthy();
        expect(pinnedLabel.text()).toEqual(translations.pinned);
        expect(wrapper.find('[data-test="pinned-resources"').element).toBeTruthy();
      });
      it('display "more" label', async () => {
        wrapper = makeWrapper({
          getters,
          options: {
            ...options,
            computed: {
              pinnedDevicesExist: jest.fn(() => true),
              unpinnedDevicesExist: jest.fn(() => true),
            },
          },
        });
        const moreLabel = wrapper.find('[data-test="more-label"');
        expect(moreLabel.element).toBeTruthy();
        expect(moreLabel.text()).toEqual(translations.moreLibraries);
        expect(wrapper.find('[data-test="more-devices"').element).toBeTruthy();
      });
    });
  });

  describe('SearchResultsGrid', () => {
    beforeEach(() => {
      useSearch.mockImplementation(() => useSearchMock({ displayingSearchResults: true }));
    });
    it('display search results grid', () => {
      const wrapper = makeWrapper();
      expect(wrapper.find('[data-test="search-results"').element).toBeTruthy();
    });
  });

  describe('SidePanel', () => {
    it('display side panel if local libraries are available', () => {
      useKResponsiveWindow.mockImplementation(() => ({
        windowIsLarge: true,
      }));
      const wrapper = makeWrapper();
      expect(wrapper.find('[data-test="side-panel"').element).toBeTruthy();
    });
  });

  describe('SidePanelModal', () => {
    it('display side panel modal if local libraries are available', async () => {
      const wrapper = makeWrapper();
      await wrapper.setData({ metadataSidePanelContent: { learning_activities: [] } });
      expect(wrapper.find('[data-test="side-panel-modal"').element).toBeTruthy();
    });
  });
});
