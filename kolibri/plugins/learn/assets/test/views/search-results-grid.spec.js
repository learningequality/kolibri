import { mount, shallowMount } from '@vue/test-utils';
import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
import { createTranslator } from 'kolibri.utils.i18n';
import SearchResultsGrid from '../../src/views/LibraryPage/SearchResultsGrid.vue';
/* eslint-disable import/named */
import useSearch, { useSearchMock } from '../../src/composables/useSearch';
/* eslint-enable import/named */

const SearchStrings = createTranslator('SearchResultsGrid', SearchResultsGrid.$trs);
const coreStrings = commonCoreStrings.methods.coreString;

jest.mock('../../src/composables/useSearch');

describe('when search results are loaded', () => {
  /* useSearch#displayingSearchResults is truthy and isLoading is false */
  it('does not display a ChannelCardGroupGrid', () => {
    useSearch.mockImplementation(() => useSearchMock({ displayingSearchResults: true }));
    const wrapper = shallowMount(SearchResultsGrid, {});
    expect(wrapper.findComponent({ name: 'ChannelCardGroupGrid' }).exists()).toBe(false);
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
      const wrapper = shallowMount(SearchResultsGrid, {});
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
      const wrapper = shallowMount(SearchResultsGrid, {});
      expect(wrapper.find('[data-test="search-results-title"]').element).toHaveTextContent(
        SearchStrings.$tr('results', { results: 1 })
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
        const wrapper = shallowMount(SearchResultsGrid, {
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
        const wrapper = shallowMount(SearchResultsGrid, {
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
      const wrapper = shallowMount(SearchResultsGrid, {});
      expect(wrapper.find('[data-test="search-results-card-grid"]').exists()).toBeTruthy();
    });

    it('displays a button to view more when there are more to be displayed', () => {
      const searchMoreSpy = jest.spyOn(useSearch(), 'searchMore');

      useSearch.mockImplementation(() =>
        useSearchMock({
          more: { a: 'another result' },
          results: [{ just: '1 result' }],
          displayingSearchResults: true,
          searchLoading: false,
        })
      );

      const wrapper = mount(SearchResultsGrid, {
        stubs: ['HybridLearningCardGrid', 'LibraryAndChannelBrowserMainContent'],
      });

      const moreButton = wrapper.find('[data-test="more-results-button"]');
      console.log(moreButton);
      moreButton.trigger('click');
      expect(searchMoreSpy).toBeCalled();
    });
  });
});
