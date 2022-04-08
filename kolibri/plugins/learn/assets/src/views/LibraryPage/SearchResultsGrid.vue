<template>

  <div v-if="!searchLoading">
    <!-- First section is the results title and the various display buttons  -->
    <!-- for interacting or updating the results   -->
    <h2 class="results-title" data-test="search-results-title">
      {{ more ?
        coreString('overCertainNumberOfSearchResults', { num: results.length }) :
        $tr('results', { results: results.length })
      }}
    </h2>
    <SearchChips
      :searchTerms="searchTerms"
      @removeItem="removeFilterTag"
      @clearSearch="clearSearch"
    />
    <div
      v-if="!(windowIsSmall) && results.length"
      class="toggle-view-buttons"
      data-test="toggle-view-buttons"
    >
      <KIconButton
        icon="menu"
        :ariaLabel="$tr('viewAsList')"
        :color="$themeTokens.text"
        :tooltip="$tr('viewAsList')"
        :disabled="currentCardViewStyle === 'list'"
        @click="toggleCardView('list')"
      />
      <KIconButton
        icon="channel"
        :ariaLabel="$tr('viewAsGrid')"
        :color="$themeTokens.text"
        :tooltip="$tr('viewAsGrid')"
        :disabled="currentCardViewStyle === 'card'"
        @click="toggleCardView('card')"
      />
    </div>
    <!-- Grid of search results  -->
    <LibraryAndChannelBrowserMainContent
      :contents="results"
      data-test="search-results-card-grid"
      :currentCardViewStyle="currentCardViewStyle"
      :gridType="1"
      @openCopiesModal="setCopies"
      @toggleInfoPanel="toggleInfoPanel"
    />
    <!-- conditionally displayed button if there are additional results -->
    <KButton
      v-if="more"
      :text="coreString('viewMoreAction')"
      appearance="basic-link"
      :disabled="moreLoading"
      class="filter-action-button"
      data-test="more-results-button"
      @click="searchMore"
    />

    <CopiesModal
      :displayedCopies="displayedCopies"
      @closeModal="setCopies([])"
    />
  </div>

</template>


<script>

  import { ref } from 'kolibri.lib.vueCompositionApi';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import CopiesModal from '../CopiesModal';
  import SearchChips from '../SearchChips';
  import LibraryAndChannelBrowserMainContent from '../LibraryAndChannelBrowserMainContent';

  export default {
    name: 'SearchResultsGrid',
    components: {
      CopiesModal,
      LibraryAndChannelBrowserMainContent,
      SearchChips,
    },
    mixins: [commonCoreStrings, responsiveWindowMixin],
    setup() {
      var displayedCopies = ref({ copies: [] });
      const setCopies = _copies => (displayedCopies.value = { copies: _copies });

      var sidePanelContent = ref(null);
      const toggleInfoPanel = content => (sidePanelContent.value = content);

      return {
        displayedCopies,
        setCopies,
        sidePanelContent,
        toggleInfoPanel,
      };
    },
    props: {
      currentCardViewStyle: {
        type: String,
        default: 'card',
      },
      clearSearch: {
        type: Function,
        default: () => {},
      },
      more: {
        type: Object,
        default: () => {},
      },
      moreLoading: {
        type: Boolean,
        default: false,
      },
      results: {
        type: Array,
        default: () => [],
      },
      removeFilterTag: {
        type: Function,
        default: () => {},
      },
      searchLoading: {
        type: Boolean,
        default: false,
      },
      searchMore: {
        type: Function,
        default: () => {},
      },
      searchTerms: {
        type: Object,
        default: () => {},
      },
    },
    $trs: {
      results: {
        message: '{results, number, integer} {results, plural, one {result} other {results}}',
        context: 'Number of results for a given term after a Library search.',
      },
      viewAsList: {
        message: 'View as list',
        context: 'Label for a button used to view resources as a list.',
      },
      viewAsGrid: {
        message: 'View as grid',
        context: 'Label for a button used to view resources as a grid.',
      },
    },
  };

</script>
