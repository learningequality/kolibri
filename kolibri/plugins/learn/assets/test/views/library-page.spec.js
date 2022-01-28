import { mount, shallowMount, createLocalVue } from '@vue/test-utils';
import { createTranslator } from 'kolibri.utils.i18n';
import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
import Vuex from 'vuex';
import VueRouter from 'vue-router';
import KCircularLoader from 'kolibri-design-system/lib/loaders/KCircularLoader';
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
const router = new VueRouter();

const LibPageStrings = createTranslator('LibraryPage', LibraryPage.$trs);
const coreStrings = commonCoreStrings.methods.coreString;

// rootNodes used when showing default view, should always have length
const mockStore = new Vuex.Store({ state: { rootNodes: ['length'] } });

jest.mock('../../src/composables/useSearch');
jest.mock('../../src/composables/useLearnerResources');

// function makeWrapper() {
//   return mount(LibraryPage);
// }
//const wrapper = mount(LibraryPage, { computed: { windowIsLarge: jest.fn(() => true) } });

describe('LibraryPage', () => {
  describe('displaying the filters button', () => {
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

  describe('method: toggleSidePanelVisibility', () => {
    it('toggles `this/vm.sidePanelIsOpen`', () => {
      const wrapper = shallowMount(LibraryPage, {
        localVue,
        store: mockStore,
      });
      expect(wrapper.vm.sidePanelIsOpen).toBeFalsy();
      wrapper.vm.toggleSidePanelVisibility();
      expect(wrapper.vm.sidePanelIsOpen).toBeTruthy();
    });
  });

  describe('default view: when displayingSearchResults is falsy and there are rootNodes', () => {
    it('displays a ChannelCardGroupGrid', () => {
      useSearch.mockImplementation(() => useSearchMock({ displayingSearchResults: false }));
      const wrapper = shallowMount(LibraryPage, {
        localVue,
        store: mockStore,
      });
      expect(wrapper.findComponent(ChannelCardGroupGrid).exists()).toBe(true);
    });

    describe('when there are resumableContentNodes', () => {
      beforeEach(() =>
        useLearnerResources.mockImplementation(() =>
          useLearnerResourcesMock({
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

      it('does not show a button to show more resumableContentNodes when there are moreResumableContentNodes', () => {
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
        console.log(wrapper.vm.moreResumableContentNodes);

        expect(wrapper.find('[data-test="more-resumable-nodes-button"').element).toBeFalsy();
      });
    });
  });

  describe('when search results are loaded (displayingSearchResults is true, isLoading false)', () => {
    it('does not display a ChannelCardGroupGrid', () => {
      useSearch.mockImplementation(() => useSearchMock({ displayingSearchResults: true }));
      const wrapper = shallowMount(LibraryPage, {
        localVue,
        store: mockStore,
      });
      expect(wrapper.findComponent(ChannelCardGroupGrid).exists()).toBe(false);
    });

    it('displays coreString.overCertainNumberOfSearchResults with useSearch#results.length when useSearch#more is truthy', () => {
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

    it('displays $trs.results with useSearch#results.length when useSearch#more is falsy', () => {
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

    describe('when there are results', () => {
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

        describe('method: toggleCardView', () => {
          it('sets this.currentViewStyle to the first param', () => {
            const wrapper = shallowMount(LibraryPage, {
              localVue,
              store: mockStore,
            });
            wrapper.vm.toggleCardView('something else');
            expect(wrapper.vm.currentViewStyle).toEqual('something else');
          });
        });
      });

      it('displays HybridLearningCardGrid of results', () => {
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

  describe('method: handleShowSearchModal', () => {
    describe('when windowIsMedium or windowIsLarge', () => {
      const wrapper = shallowMount(LibraryPage, {
        localVue,
        store: mockStore,
        computed: { windowIsSmall: () => false },
      });
      wrapper.vm.handleShowSearchModal('value');
      it('sets this.currentCategory to the first param', () => {
        expect(wrapper.vm.currentCategory).toEqual('value');
      });
      it('sets this.showSearchModal to true, sidePanelIsOpen to false', () => {
        expect(wrapper.vm.showSearchModal).toBe(true);
        expect(wrapper.vm.sidePanelIsOpen).toBe(false);
      });
    });
    describe('when windowIsSmall', () => {
      it('sets this.sidePanelIsOpen to false, if the window is not small', () => {
        const wrapper = shallowMount(LibraryPage, {
          localVue,
          store: mockStore,
          computed: { windowIsSmall: () => true },
        });
        wrapper.vm.handleShowSearchModal('value');
        expect(wrapper.vm.sidePanelIsOpen).toBe(true);
      });
    });
  });

  describe('method: toggleInfoPanel', () => {
    it('sets this.sidePanelContent to the first param', () => {
      const wrapper = shallowMount(LibraryPage, {
        localVue,
        store: mockStore,
      });
      wrapper.vm.toggleInfoPanel('content');
      expect(wrapper.vm.sidePanelContent).toBe('content');
    });
  });

  describe('method: closeCategoryModal', () => {
    it('sets this.currentCategory to null', () => {
      const wrapper = shallowMount(LibraryPage, {
        localVue,
        store: mockStore,
      });
      wrapper.vm.closeCategoryModal();
      expect(wrapper.vm.currentCategory).toBeNull();
    });
  });

  describe('method: handleCategory', () => {
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

  describe('on large screens, the search/filter panel should display embedded within the main page', () => {
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

  describe('on non-large screens, the search/filter panel is displayed in a FullScreenSidePanel', () => {
    it('displays EmbeddedSidePanel within FullScreenSidePanel', async () => {
      const wrapper = shallowMount(LibraryPage, {
        localVue,
        store: mockStore,
        computed: { windowIsLarge: () => false },
      });
      await wrapper.setData({ sidePanelIsOpen: true });
      expect(wrapper.find('[data-test="full-screen-side-panel"]').exists()).toBeTruthy();
      expect(wrapper.find("[data-test='desktop-search-side-panel']").exists()).toBeFalsy();
    });
  });

  describe('when there is sidePanelContent, show FullScreenSidePanel', () => {
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
