import { shallowMount, createLocalVue } from '@vue/test-utils';
import Vuex from 'vuex';
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
    it('displays $trs.overCertainNumberOfSearchResults with results.length', () => {});

    describe('when there are results', () => {
      describe('when window is not extra small', () => {
        it('displays buttons to toggle between list and grid views', () => {});

        describe('method: toggleCardView', () => {
          it('sets this.currentViewStyle to the first param', () => {});
        });
      });

      it('displays HybridLearningCardGrid of results', () => {});
      it('displays a button to view more when there are more to be displayed', () => {
        // Try to test that the useSearch#searchMore fn is called on @click?
      });
    });
  });

  describe('when page is loading', () => {
    it('shows a KCircularLoader', () => {});
  });

  describe('method: handleShowSearchModal', () => {
    it('sets this.currentCategory to the first param', () => {});
    it('sets this.showSearchModal to true', () => {});
    it('sets this.sidePanelIsOpen to false, if the window is not small', () => {});
  });

  describe('method: toggleInfoPanel', () => {
    it('sets this.sidePanelContent to the first param', () => {});
  });

  describe('method: closeCategoryModal', () => {
    it('sets this.currentCategory to null', () => {});
  });

  describe('method: handleCategory', () => {
    it('passes the first param to this.setCategory', () => {});
    it('sets this.currentCategory to null', () => {});
  });

  describe('on large screens, the search/filter panel should display embedded within the main page', () => {
    // is there a way to test the currentCategory event?
    it('displays EmbeddedSidePanel', () => {});
  });

  describe('on non-large screens, the search/filter panel is displayed in a FullScreenSidePanel', () => {
    //describe();
    // need to follow up on whether or not we will be changing the category search display (
    // modal vs. side panel) on medium screens
  });

  describe('when there is sidePanelContent, show FullScreenSidePanel', () => {
    it('shows BrowseResourceMetadata', () => {});
  });
});
