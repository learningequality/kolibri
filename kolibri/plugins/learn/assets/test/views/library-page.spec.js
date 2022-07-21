import { mount, shallowMount, createLocalVue } from '@vue/test-utils';
import Vuex from 'vuex';
import VueRouter from 'vue-router';
import KCircularLoader from 'kolibri-design-system/lib/loaders/KCircularLoader';
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
const mockStore = new Vuex.Store({
  state: { rootNodes: ['length'], core: { loading: false } },
  getters: { isUserLoggedIn: jest.fn() },
});

jest.mock('../../src/composables/useSearch');
jest.mock('../../src/composables/useLearnerResources');
jest.mock('../../src/composables/useLearningActivities');

describe('LibraryPage', () => {
  describe('filters button', () => {
    it('is visible when the page is not large', () => {
      const wrapper = shallowMount(LibraryPage, {
        computed: { windowIsLarge: () => false },
        localVue,
        store: mockStore,
      });
      expect(wrapper.find('[data-test="filter-button"').element).toBeTruthy();
    });
    it('is hidden when the page is large', () => {
      const wrapper = shallowMount(LibraryPage, {
        computed: { windowIsLarge: () => true },
        localVue,
        store: mockStore,
      });
      expect(wrapper.find('[data-test="filter-button"').element).toBeFalsy();
    });
  });

  describe('when user clicks the filters button', () => {
    it('displays the filters side panel, which is not displayed by default', async () => {
      // mount to ensure we can click the button
      const wrapper = mount(LibraryPage, {
        computed: { windowIsLarge: () => false }, // ensure filters button shown
        localVue,
        router,
        store: mockStore,
        stubs: ['SidePanelModal', 'HybridLearningCardGrid'],
      });
      // not displayed by default
      expect(wrapper.findComponent({ name: 'SidePanel' }).vm.$children.length).toEqual(0);
      wrapper.find('[data-test="filter-button"]').trigger('click');
      await wrapper.vm.$nextTick();
      expect(wrapper.findComponent({ name: 'SidePanel' }).vm.$children.length).not.toEqual(0);
    });
  });

  describe('displaying channels and recent/popular content ', () => {
    /** useSearch#displayingSearchResults is falsy and there are rootNodes.length */
    it('displays a grid of channel cards', () => {
      useSearch.mockImplementation(() => useSearchMock({ displayingSearchResults: false }));
      const wrapper = shallowMount(LibraryPage, {
        localVue,
        store: mockStore,
      });
      expect(wrapper.find("[data-test='channel-cards']").exists()).toBe(true);
    });
    it('displays a ResumableContentGrid', () => {
      useSearch.mockImplementation(() => useSearchMock({ displayingSearchResults: false }));
      const wrapper = shallowMount(LibraryPage, {
        localVue,
        store: mockStore,
      });
      expect(wrapper.findComponent({ name: 'ResumableContentGrid' }).exists()).toBe(true);
    });
  });

  describe('when page is loading', () => {
    it('shows a KCircularLoader', () => {
      useSearch.mockImplementation(() => useSearchMock({ searchLoading: true }));
      const wrapper = shallowMount(LibraryPage, {
        localVue,
        store: mockStore,
      });
      expect(wrapper.findComponent(KCircularLoader).exists()).toBeTruthy();
    });
  });
});
