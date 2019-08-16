<template>

  <SideBar>
    <form
      class="d-t"
      @submit.prevent="submitSearch"
    >
      <div class="d-tr">
        <input
          ref="searchInput"
          v-model.trim="searchQuery"
          class="d-tc search-input"
          type="search"
          :aria-label="$tr('enterSearchQuery')"
          @keyup.esc.stop
        >

        <UiIconButton
          type="secondary"
          buttonType="submit"
          :ariaLabel="$tr('submitSearchQuery')"
          class="d-tc"
        >
          <mat-svg
            name="search"
            category="action"
          />
        </UiIconButton>
      </div>
    </form>

    <transition mode="out-in">
      <p
        v-if="!searchHasBeenMade"
        key="no-search"
        :style="paragraphStyle"
      >
        {{ $tr('searchThroughBook') }}
      </p>

      <div
        v-else-if="searchIsLoading"
        key="loading-true"
      >
        <p :style="paragraphStyle">
          {{ $tr('loadingResults') }}
        </p>
        <KCircularLoader :delay="false" />
      </div>

      <p
        v-else-if="searchResults.length === 0"
        key="results-false"
        :style="paragraphStyle"
      >
        {{ $tr('noSearchResults') }}
      </p>

      <p
        v-else-if="searchResults.length > 0"
        key="results-true"
        :style="paragraphStyle"
      >
        {{ numberOfSearchResults }}
      </p>
    </transition>

    <ol
      v-show="searchHasBeenMade && !searchIsLoading && searchResults.length > 0"
      ref="searchResultsList"
      class="search-results-list"
    >
      <li
        v-for="(item, index) in searchResults"
        :key="index"
        class="search-results-list-item"
        :style="{ borderTop: `solid 1px ${$themeTokens.fineLine}` }"
      >
        <KButton
          :text="item.excerpt"
          appearance="basic-link"
          class="search-results-list-item-button"
          @click="$emit('navigateToSearchResult', item)"
        />
      </li>
    </ol>
  </SideBar>

</template>


<script>

  import UiIconButton from 'kolibri.coreVue.components.UiIconButton';
  import Mark from 'mark.js';
  import SideBar from './SideBar';

  /**
   * Searches through an entire book for a string, but caps after a certain amount of results is
   * exceeded
   * Helpful in preventing a CPU lockup for search queries with a lot of search results
   * @param {object} book Ebookjs book object
   * @param {string} searchQuery String to search for
   * @param {number} maxSearchResults Stop searching for matches after this is amount is exceeded,
   *                                  e.g. 1000
   * @returns {Promise} A promise that resolves to the search results
   */
  function searchThroughEntireBook(book, searchQuery, maxSearchResults) {
    function searchThroughSpineItem(spineItem, searchQuery, numOfTotalSearchResultsSoFar) {
      return new Promise(resolve => {
        // If numOfTotalSearchResultsSoFar has been exceeded, don't bother to search this spineItem
        if (numOfTotalSearchResultsSoFar > maxSearchResults) {
          resolve([]);
        } else {
          const final = searchResults => {
            spineItem.unload();
            return searchResults || [];
          };
          spineItem
            .load(book.load.bind(book))
            .then(() => spineItem.find(searchQuery))
            .then(final, final)
            .then(searchResults => resolve(searchResults));
        }
      });
    }
    return book.spine.spineItems.reduce(
      (promiseChain, currentSpineItem) =>
        promiseChain.then(totalSearchResults =>
          searchThroughSpineItem(currentSpineItem, searchQuery, totalSearchResults.length).then(
            currentSpineItemSearchResults =>
              totalSearchResults.concat(currentSpineItemSearchResults)
          )
        ),
      Promise.resolve([])
    );
  }

  const MAX_SEARCH_RESULTS = 500;

  export default {
    name: 'SearchSideBar',
    components: {
      SideBar,
      UiIconButton,
    },
    props: {
      book: {
        type: Object,
        required: true,
      },
    },
    data: () => ({
      searchResults: [],
      searchQuery: '',
      searchIsLoading: false,
      maxSearchResultsExceeded: false,
      searchHasBeenMade: false,
      markInstance: null,
    }),
    computed: {
      numberOfSearchResults() {
        if (this.maxSearchResultsExceeded) {
          return this.$tr('overCertainNumberOfSearchResults', { num: MAX_SEARCH_RESULTS });
        }
        return this.$tr('numberOfSearchResults', { num: this.searchResults.length });
      },
      paragraphStyle() {
        return {
          color: this.$themeTokens.annotation,
        };
      },
    },
    methods: {
      /**
       * @public
       */
      focusOnInput() {
        this.$refs.searchInput.focus();
      },
      submitSearch() {
        const searchQuery = this.searchQuery.toLowerCase();
        if (searchQuery.length > 0 && this.searchIsLoading === false) {
          this.searchIsLoading = true;
          this.searchHasBeenMade = true;
          this.maxSearchResultsExceeded = false;
          searchThroughEntireBook(this.book, searchQuery, MAX_SEARCH_RESULTS).then(
            searchResults => {
              if (searchResults.length > MAX_SEARCH_RESULTS) {
                this.maxSearchResultsExceeded = true;
              }
              this.searchResults = searchResults.slice(0, MAX_SEARCH_RESULTS);

              // Wait for list to be updated
              this.$nextTick().then(() => {
                if (this.markInstance) {
                  this.markInstance.unmark({
                    done: () => this.createMarks(searchQuery),
                  });
                } else {
                  this.createMarks(searchQuery);
                }
              });
            }
          );
        }
      },
      createMarks(searchQuery) {
        this.markInstance = new Mark(this.$refs.searchResultsList);
        this.markInstance.mark(searchQuery, {
          separateWordSearch: false,
          done: () => {
            this.$emit('newSearchQuery', searchQuery);
            this.searchIsLoading = false;
          },
        });
      },
    },
    $trs: {
      searchThroughBook: 'Search through book',
      noSearchResults: 'No results',
      loadingResults: 'Loading results',
      overCertainNumberOfSearchResults:
        'Over {num, number, integer} {num, plural, one {result} other {results}}',
      numberOfSearchResults: '{num, number, integer} {num, plural, one {result} other {results}}',
      enterSearchQuery: 'Enter search query',
      submitSearchQuery: 'Submit search query',
    },
  };

</script>


<style lang="scss" scoped>

  @import './EpubStyles';

  .d-t {
    display: table;
  }

  .d-tr {
    display: table-row;
  }

  .d-tc {
    display: table-cell;
  }

  .search-input {
    width: 160px;
    vertical-align: middle;
  }

  .search-results-list {
    padding: 0;
    margin: 0;
    list-style-type: none;
  }

  .search-results-list-item {
    padding-top: 8px;
    padding-bottom: 8px;
  }

  .search-results-list-item-button {
    @include epub-basic-link;
  }

</style>
