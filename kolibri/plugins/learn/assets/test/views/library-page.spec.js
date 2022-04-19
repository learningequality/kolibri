import { mount, shallowMount, createLocalVue } from '@vue/test-utils';
import { createTranslator } from 'kolibri.utils.i18n';
import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
import Vuex from 'vuex';
import VueRouter from 'vue-router';
import KCircularLoader from 'kolibri-design-system/lib/loaders/KCircularLoader';
import { PageNames } from '../../src/constants';
import LibraryPage from '../../src/views/LibraryPage';
import ChannelCardGroupGrid from '../../src/views/ChannelCardGroupGrid';
/* eslint-disable import/named */
import useSearch, { useSearchMock } from '../../src/composables/useSearch';
import useLearnerResources, {
  useLearnerResourcesMock,
} from '../../src/composables/useLearnerResources';
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

const LibPageStrings = createTranslator('LibraryPage', LibraryPage.$trs);
const coreStrings = commonCoreStrings.methods.coreString;

// rootNodes used when showing default view, should always have length
const mockStore = new Vuex.Store({
  state: { rootNodes: ['length'] },
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
        stubs: ['FullScreenSidePanel', 'HybridLearningCardGrid'],
      });
      // not displayed by default
      expect(wrapper.find('[data-test="filters-side-panel"]').exists()).toBe(false);
      wrapper.find('[data-test="filter-button"]').trigger('click');
      await wrapper.vm.$nextTick();
      expect(wrapper.find('[data-test="filters-side-panel"]').exists()).toBe(true);
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

    describe('when there are nodes with progress that can be resumed', () => {
      beforeEach(() =>
        useLearnerResources.mockImplementation(() =>
          useLearnerResourcesMock({
            /*
             * moreResumableContentNodes having length would realistically mean
             * that there are a significant number of resumableContentNodes but we
             * rely on useSearch to handle the details of that implementation
             */
            resumableContentNodes: [{ node: 1 }],
            moreResumableContentNodes: [{ node: 2 }],
          })
        )
      );
      afterEach(() => jest.clearAllMocks());
      it('displays resumable content nodes string', () => {
        const wrapper = shallowMount(LibraryPage, {
          localVue,
          store: mockStore,
        });
        expect(wrapper.find('[data-test="recent-content-nodes-title"').element).toBeTruthy();
      });

      it('displays grid / list toggle buttons when on medium or larger screens', () => {
        const wrapper = shallowMount(LibraryPage, {
          computed: { windowIsMedium: () => true },
          localVue,
          store: mockStore,
        });
        expect(wrapper.find('[data-test="toggle-view-buttons"]').element).toBeTruthy();
      });

      it('does not show the grid / list toggle buttons when on extra small screens', async () => {
        const wrapper = shallowMount(LibraryPage, {
          computed: { windowIsSmall: () => true },
          localVue,
          store: mockStore,
        });
        expect(wrapper.find('[data-test="toggle-view-buttons"]').element).toBeFalsy();
      });

      it('displays HybridLearningCardGrid', () => {
        const wrapper = shallowMount(LibraryPage, {
          localVue,
          store: mockStore,
        });
        expect(wrapper.find('[data-test="resumable-content-card-grid"').element).toBeTruthy();
      });

      it('displays button to show more resumableContentNodes when there are moreResumableContentNodes', () => {
        const wrapper = shallowMount(LibraryPage, {
          localVue,
          store: mockStore,
        });
        expect(wrapper.find('[data-test="more-resumable-nodes-button"').element).toBeTruthy();
      });

      it('does not show a button to show more resumableContentNodes when there are no moreResumableContentNodes', () => {
        jest.clearAllMocks();
        useLearnerResources.mockImplementation(() =>
          useLearnerResourcesMock({
            resumableContentNodes: [{ node: 1 }],
            moreResumableContentNodes: [],
          })
        );
        const wrapper = shallowMount(LibraryPage, {
          localVue,
          store: mockStore,
        });
        expect(wrapper.find('[data-test="more-resumable-nodes-button"').element).toBeFalsy();
      });
    });
  });

  describe('when search results are loaded', () => {
    /* useSearch#displayingSearchResults is truthy and isLoading is false */
    it('does not display a ChannelCardGroupGrid', () => {
      useSearch.mockImplementation(() => useSearchMock({ displayingSearchResults: true }));
      const wrapper = shallowMount(LibraryPage, {
        localVue,
        store: mockStore,
      });
      expect(wrapper.findComponent(ChannelCardGroupGrid).exists()).toBe(false);
    });

    describe('when there are more results to show than the default amount', () => {
      it('displays a message indicating there are more results', () => {
        useSearch.mockImplementation(() =>
          useSearchMock({
            more: true,
            results: [],
            displayingSearchResults: true,
            searchLoading: false,
          })
        );
        const wrapper = shallowMount(LibraryPage, {
          localVue,
          store: mockStore,
        });
        expect(wrapper.find('[data-test="search-results-title"]').element).toHaveTextContent(
          coreStrings('overCertainNumberOfSearchResults', { num: 0 })
        );
      });
    });

    describe('when there are no more results to show than the default amount', () => {
      it('displays results message with the number of results', () => {
        /* useSearch#more is relied on here to determine if there are more to show */
        useSearch.mockImplementation(() =>
          useSearchMock({
            more: false,
            results: ['1 result'],
            displayingSearchResults: true,
            searchLoading: false,
          })
        );
        const wrapper = shallowMount(LibraryPage, {
          localVue,
          store: mockStore,
        });
        expect(wrapper.find('[data-test="search-results-title"]').element).toHaveTextContent(
          LibPageStrings.$tr('results', { results: 1 })
        );
      });
    });

    describe('when there are search results', () => {
      describe('when the windowIsSmall', () => {
        it('does not show toggle buttons between list and grid views', () => {
          useSearch.mockImplementation(() =>
            useSearchMock({
              more: false,
              results: ['1 result'],
              displayingSearchResults: true,
              searchLoading: false,
            })
          );
          const wrapper = shallowMount(LibraryPage, {
            localVue,
            store: mockStore,
            computed: { windowIsSmall: () => true },
          });
          expect(wrapper.find('[data-test="toggle-view-buttons"]').exists()).toBeFalsy();
        });
      });

      describe('when window is not extra small', () => {
        it('displays buttons to toggle between list and grid views', () => {
          useSearch.mockImplementation(() =>
            useSearchMock({
              more: false,
              results: ['1 result'],
              displayingSearchResults: true,
              searchLoading: false,
            })
          );
          const wrapper = shallowMount(LibraryPage, {
            localVue,
            store: mockStore,
            computed: { windowIsSmall: () => false },
          });
          expect(wrapper.find('[data-test="toggle-view-buttons"]').exists()).toBeTruthy();
        });
      });

      it('displays a list of cards showing the results', () => {
        useSearch.mockImplementation(() =>
          useSearchMock({
            more: false,
            results: ['1 result'],
            displayingSearchResults: true,
            searchLoading: false,
          })
        );
        const wrapper = shallowMount(LibraryPage, {
          localVue,
          store: mockStore,
        });
        expect(wrapper.find('[data-test="search-results-card-grid"]').exists()).toBeTruthy();
      });

      it('displays a button to view more when there are more to be displayed', () => {
        const searchMoreSpy = jest.spyOn(useSearch(), 'searchMore');

        useSearch.mockImplementation(() =>
          useSearchMock({
            more: true,
            results: ['1 result'],
            displayingSearchResults: true,
            searchLoading: false,
          })
        );

        const wrapper = mount(LibraryPage, {
          localVue,
          router,
          store: mockStore,
          stubs: ['HybridLearningCardGrid'],
        });

        const moreButton = wrapper.find('[data-test="more-results-button"]');
        moreButton.trigger('click');
        expect(searchMoreSpy).toBeCalled();
      });
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

  describe("handleShowSearchModal method's managing of the category", () => {
    describe('when windowIsMedium or windowIsLarge', () => {
      const wrapper = shallowMount(LibraryPage, {
        localVue,
        store: mockStore,
        computed: { windowIsSmall: () => false },
      });
      wrapper.vm.handleShowSearchModal('value');
      it('sets the currentCategory to the first param', () => {
        expect(wrapper.vm.currentCategory).toEqual('value');
      });
      it('shows the search model, closes side panel', () => {
        expect(wrapper.vm.showSearchModal).toBe(true);
        expect(wrapper.vm.sidePanelIsOpen).toBe(false);
      });
    });
    describe('when windowIsSmall', () => {
      it('hides the side panel', () => {
        const wrapper = shallowMount(LibraryPage, {
          localVue,
          store: mockStore,
          computed: { windowIsSmall: () => true },
        });
        wrapper.vm.handleShowSearchModal('value');
        expect(wrapper.vm.sidePanelIsOpen).toBe(false);
      });
    });
  });

  describe('handleCategory method', () => {
    it('passes the first param to useSearch#setCategory', () => {
      const setCategorySpy = jest.spyOn(useSearch(), 'setCategory');
      const wrapper = shallowMount(LibraryPage, {
        localVue,
        store: mockStore,
      });
      wrapper.vm.handleCategory('category');
      expect(setCategorySpy).toBeCalledWith('category');
    });

    it('sets this.currentCategory to null', () => {
      const wrapper = shallowMount(LibraryPage, {
        localVue,
        store: mockStore,
      });
      wrapper.vm.handleCategory('category');
      expect(wrapper.vm.currentCategory).toBeNull();
    });
  });

  describe('search/filter panel display on large screens', () => {
    // is there a way to test the currentCategory event?
    it('displays EmbeddedSidePanel', async () => {
      const wrapper = shallowMount(LibraryPage, {
        localVue,
        store: mockStore,
        computed: { windowIsLarge: () => true },
      });
      expect(wrapper.find("[data-test='desktop-search-side-panel']").exists()).toBeTruthy();
      // Even if sidePanelIsOpen is true, this shouldn't show
      wrapper.setData({ sidePanelIsOpen: true });
      expect(
        wrapper.find('[data-test="smallscreen-search-fullscreen-side-panel"]').exists()
      ).toBeFalsy();
    });
  });

  describe('search/filter panel display on non-large screens', () => {
    it('displays EmbeddedSidePanel within FullScreenSidePanel', async () => {
      const wrapper = shallowMount(LibraryPage, {
        computed: { windowIsLarge: () => false },
        localVue,
        store: mockStore,
      });
      await wrapper.setData({ sidePanelIsOpen: true });
      expect(wrapper.find('[data-test="filters-side-panel"]').exists()).toBeTruthy();
      expect(wrapper.find("[data-test='desktop-search-side-panel']").exists()).toBeFalsy();
    });
  });

  describe('showing the side panel when there is `sidePanelContent`', () => {
    it('shows BrowseResourceMetadata', async () => {
      const wrapper = shallowMount(LibraryPage, {
        localVue,
        store: mockStore,
      });
      await wrapper.setData({ sidePanelContent: { some: 'content' } });
      expect(wrapper.find("[data-test='content-side-panel']").exists()).toBeTruthy();
    });
  });
});
