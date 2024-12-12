import { mount, shallowMount } from '@vue/test-utils';
import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
import { createTranslator } from 'kolibri/utils/i18n';
import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
import SearchResultsGrid from '../../src/views/SearchResultsGrid.vue';

const SearchStrings = createTranslator('SearchResultsGrid', SearchResultsGrid.$trs);
const coreStrings = commonCoreStrings.methods.coreString;

jest.mock('kolibri-common/composables/useBaseSearch');
jest.mock('kolibri-design-system/lib/composables/useKResponsiveWindow');

describe('when search results are loaded', () => {
  beforeEach(() => {
    useKResponsiveWindow.mockImplementation(() => ({
      windowIsSmall: false,
      windowIsLarge: true,
    }));
  });
  /* useBaseSearch#displayingSearchResults is truthy and isLoading is false */
  it('does not display a list of channels', () => {
    const wrapper = shallowMount(SearchResultsGrid);
    expect(wrapper.findComponent({ name: 'ChannelCardGroupGrid' }).exists()).toBe(false);
  });

  describe('when there are more results to show than the default amount', () => {
    it('displays a message indicating there are more results', () => {
      const wrapper = shallowMount(SearchResultsGrid, {
        propsData: {
          results: [{ result: 1 }],
          more: [{ result: 2 }],
        },
      });
      expect(wrapper.find('[data-test="search-results-title"]').element).toHaveTextContent(
        coreStrings('uncountedAdditionalResults', { num: 1 }),
      );
    });
  });

  describe('when there are no more results to show than the default amount', () => {
    it('displays results message with the number of results', () => {
      /* useBaseSearch#more is relied on here to determine if there are more to show */
      const wrapper = shallowMount(SearchResultsGrid, {
        propsData: {
          results: [{ result: 1 }],
        },
      });
      expect(wrapper.find('[data-test="search-results-title"]').element).toHaveTextContent(
        SearchStrings.$tr('results', { results: 1 }),
      );
    });
  });

  describe('when there are search results', () => {
    describe('when the windowIsSmall', () => {
      it('does not show toggle buttons between list and grid views', () => {
        useKResponsiveWindow.mockImplementation(() => ({
          windowIsSmall: true,
          windowIsLarge: false,
        }));
        const wrapper = shallowMount(SearchResultsGrid);
        expect(wrapper.find('[data-test="toggle-view-buttons"]').exists()).toBeFalsy();
      });
    });

    describe('when window is not extra small', () => {
      it('displays buttons to toggle between list and grid views', () => {
        const wrapper = shallowMount(SearchResultsGrid, {
          propsData: {
            results: [{ result: 1 }],
            searchLoading: false,
          },
        });
        expect(wrapper.find('[data-test="toggle-view-buttons"]').exists()).toBeTruthy();
      });
    });

    it('displays a list of cards showing the results', () => {
      const wrapper = shallowMount(SearchResultsGrid, {});
      expect(wrapper.find('[data-test="search-results-card-grid"]').exists()).toBeTruthy();
    });

    it('displays a button to view more when there are more to be displayed', () => {
      const wrapper = mount(SearchResultsGrid, {
        propsData: {
          more: true,
          results: ['1 result'],
          displayingSearchResults: true,
          searchLoading: false,
        },
        stubs: ['LibraryAndChannelBrowserMainContent', 'SearchChips'],
      });

      const moreButton = wrapper.find('[data-test="more-results-button"]');
      expect(moreButton.exists()).toBeTruthy();
    });
  });
});
