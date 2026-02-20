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
        <KIconButton
          icon="search"
          buttonType="submit"
          :ariaLabel="$tr('submitSearchQuery')"
          class="d-tc"
          style="position: relative; top: 4px; left: 8px"
          size="small"
        />
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
      v-if="searchHasBeenMade && !searchIsLoading && searchResults.length > 0"
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
          appearance="basic-link"
          class="search-results-list-item-button"
          @click="$emit('navigateToSearchResult', item)"
        >
          <span>{{ item.before }}</span>
          <span :style="markColor">{{ item.match }}</span>
          <span>{{ item.after }}</span>
        </KButton>
      </li>
    </ol>
  </SideBar>

</template>


<script>

  import { EpubCFI } from 'epubjs';
  import isEqual from 'lodash/isEqual';
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
              totalSearchResults.concat(currentSpineItemSearchResults),
          ),
        ),
      Promise.resolve([]),
    );
  }

  const MAX_SEARCH_RESULTS = 500;

  export default {
    name: 'SearchSideBar',
    components: {
      SideBar,
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
      markColor() {
        return {
          color: this.$themePalette.black,
          backgroundColor: this.$themePalette.yellow.v_200,
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
              searchResults = searchResults.slice(0, MAX_SEARCH_RESULTS);
              this.searchResults = this.selectMatchResult(searchResults);
              this.$emit('newSearchQuery', searchQuery);
              this.searchIsLoading = false;
            },
          );
        }
      },
      /**
       * This method "marks" the match text to which the cfi refers in every result in the
       * search results list
       * @param {array} searchResults
       * @returns {array} searchResults with the excerpt split into before, match, and after
       * where the match is the text that will be highlighted
       */
      selectMatchResult(searchResults) {
        const searchQuery = this.searchQuery.toLowerCase();
        return searchResults.map((result, i) => {
          const textSplit = result.excerpt.toLowerCase().split(searchQuery);

          const selectedIndex = this.getMatchIndex({
            textSplit,
            cfi: result.cfi,
            nextResult: searchResults[i + 1],
          });

          const slicedExcerpt = this.splitExcerpt({
            textSplit,
            excerpt: result.excerpt,
            selectedIndex,
          });

          return {
            ...result,
            ...slicedExcerpt,
          };
        });
      },
      /**
       * Identify the index of the match in the result excerpt based
       * on the distance between the cfis with the next result compared to
       * the distance of the result excerpt between a match and the next match.
       * @param {object} params
       * @param {string[]} params.textSplit The result excerpt split by the search query
       * @param {string} params.cfi The cfi of the current result
       * @param {object} params.nextResult The next result
       * @returns {number} The index of the match in the result excerpt
       * @example If there are n matches in the same result excerpt, this method will
       * return 0 if the cfi refers to the first match, 1 for the second match, etc.
       */
      getMatchIndex({ textSplit, cfi, nextResult }) {
        if (textSplit.length <= 2) {
          // There is just one match in the result excerpt
          return 0;
        }
        if (!nextResult) {
          // This is the last result so the index is the last match
          return textSplit.length - 2;
        }

        const distanceNext = this.getDistanceInNode(cfi, nextResult.cfi);
        for (let i = 1; i < textSplit.length - 1; i++) {
          const split = textSplit[i];
          if (split.length === distanceNext) {
            return i - 1;
          }
        }
        // If the distance between the two cfis doesnt match the distance between
        // any two matches in the result excerpt, then the two matches are not in the same node,
        // so we return the last match.
        return textSplit.length - 2;
      },
      /**
       * If two matches appears in the same result excerpt then they are in the same node.
       * So, this method finds the distance between the two matches and return -1 if they are
       * not in the same node.
       * @param {string} cfi1 The cfi of the first match
       * @param {string} cfi2 The cfi of the second match after the first one
       * @returns {number} The number of characters between the two matches or -1 if they are
       * not in the same node.
       */
      getDistanceInNode(cfi1, cfi2) {
        const cfiParser = new EpubCFI();
        const cfi1Parsed = cfiParser.parse(cfi1);
        const cfi2Parsed = cfiParser.parse(cfi2);

        if (!cfi1Parsed.range || !cfi2Parsed.range) {
          // Just in case we have a cfi that is not a range
          return -1;
        }

        const cfi2StartTerminal = cfi2Parsed.start.terminal;
        const cfi1EndTerminal = cfi1Parsed.end.terminal;

        // If both cfi's are in the same node, all its steps will be the same except
        // for the terminals of the range. We can safely delete them to compare the rest.
        delete cfi1Parsed.start.terminal;
        delete cfi2Parsed.start.terminal;
        delete cfi1Parsed.end.terminal;
        delete cfi2Parsed.end.terminal;
        const isInSameNode = isEqual(cfi1Parsed, cfi2Parsed);
        if (!isInSameNode) {
          return -1;
        }

        const distance = cfi2StartTerminal.offset - cfi1EndTerminal.offset;
        return distance;
      },
      /**
       * Divide the excerpt into before, match, and after based on the index of the match
       * where the match is the text that will be highlighted
       * @param {object} params
       * @param {string[]} params.textSplit The result excerpt split by the search query
       * @param {string} params.excerpt The result excerpt
       * @param {number} params.selectedIndex The index of the match in the result excerpt
       * @returns {object} The excerpt divided into before, match, and after
       */
      splitExcerpt({ textSplit, excerpt, selectedIndex }) {
        const searchQueryLength = this.searchQuery.length;
        let startIndex = searchQueryLength * selectedIndex;
        for (let i = 0; i < selectedIndex + 1; i++) {
          startIndex += textSplit[i].length;
        }
        const endIndex = startIndex + searchQueryLength;

        return {
          before: excerpt.slice(0, startIndex),
          match: excerpt.slice(startIndex, endIndex),
          after: excerpt.slice(endIndex),
        };
      },
    },
    $trs: {
      searchThroughBook: {
        message: 'Search through book',
        context: 'Option in the EPUB reader to search for a term throughout the entire book.',
      },
      noSearchResults: {
        message: 'No results',
        context:
          'Displayed when no results are obtained after a learner searches for a term in a digital book.',
      },
      loadingResults: {
        message: 'Loading results',
        context:
          'Message indicating the EPUB reader is loading the results of a search within a book.',
      },
      overCertainNumberOfSearchResults: {
        message: 'Over {num, number, integer} {num, plural, one {result} other {results}}',
        context:
          'Refers to number of search results when there are over a specified amount. Only translate "over", "result" and "results".\n',
      },
      numberOfSearchResults: {
        message: '{num, number, integer} {num, plural, one {result} other {results}}',
        context: 'Refers to number of search results. Only translate "result" and "results".',
      },
      enterSearchQuery: {
        message: 'Enter a word to search',
        context: 'Label for the search field in the EPUB reader.',
      },
      submitSearchQuery: {
        message: 'Start the search',
        context: 'Label for a button to initiate a search in an EPUB book.',
      },
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
