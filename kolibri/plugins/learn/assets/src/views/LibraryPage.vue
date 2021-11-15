<template>

  <div>
    <main
      class="main-grid"
      :style="{ marginLeft: `${(sidePanelWidth + 24)}px` }"
    >
      <div v-if="!windowIsLarge">
        <!-- TO DO Marcella swap out new icon after KDS update -->
        <KButton
          icon="filter"
          :text="coreString('searchLabel')"
          :primary="false"
          @click="toggleSidePanelVisibility"
        />
      </div>
      <!-- "Default" display - channels and recent/popular content -->
      <div v-if="!displayingSearchResults">
        <h2>{{ coreString('channelsLabel') }}</h2>
        <ChannelCardGroupGrid
          v-if="rootNodes.length"
          class="grid"
          :contents="rootNodes"
        />
        <div v-if="!(windowBreakpoint < 1 )" class="toggle-view-buttons">
          <KIconButton
            icon="menu"
            :ariaLabel="$tr('viewAsList')"
            :color="$themeTokens.text"
            :tooltip="$tr('viewAsList')"
            @click="toggleCardView('list')"
            :disabled="currentViewStyle === 'list' && true"
          />
          <KIconButton
            icon="channel"
            :ariaLabel="$tr('viewAsGrid')"
            :color="$themeTokens.text"
            :tooltip="$tr('viewAsGrid')"
            @click="toggleCardView('card')"
            :disabled="currentViewStyle === 'card' && true"
          />
        </div>
        <h2 v-if="resumableContentNodes.length">
          {{ $tr('recent') }}
        </h2>
        <HybridLearningCardGrid
          v-if="resumableContentNodes.length"
          :cardViewStyle="currentViewStyle"
          :numCols="numCols"
          :genContentLink="genContentLink"
          :contents="trimmedResume"
          :currentPage="currentPage"
          @toggleInfoPanel="toggleInfoPanel"
        />
      </div>

      <!-- Display of search results, after the search is finished loading -->

      <!-- First section is the results title and the various display buttons  -->
      <!-- for interacting or updating the results   -->
      <div v-else-if="!searchLoading" class="results-title">
        <h2 class="results-title">
          {{ $tr('results', { results: results.length }) }}
        </h2>
        <KButton
          v-if="more"
          :text="coreString('viewMoreAction')"
          appearance="basic-link"
          :disabled="moreLoading"
          class="filter-action-button"
          @click="searchMore"
        />
        <div v-if="!(windowBreakpoint < 1) && results.length" class="toggle-view-buttons">
          <KIconButton
            icon="menu"
            :ariaLabel="$tr('viewAsList')"
            :color="$themeTokens.text"
            :tooltip="$tr('viewAsList')"
            @click="toggleCardView('list')"
            :disabled="currentViewStyle === 'list' && true"
          />
          <KIconButton
            icon="channel"
            :ariaLabel="$tr('viewAsGrid')"
            :color="$themeTokens.text"
            :tooltip="$tr('viewAsGrid')"
            @click="toggleCardView('card')"
            :disabled="currentViewStyle === 'card' && true"
          />
        </div>
        <SearchChips
          :searchTerms="searchTerms"
          @removeItem="removeFilterTag"
          @clearSearch="clearSearch"
        />
        <!-- Grid of search results  -->
        <HybridLearningCardGrid
          v-if="results.length"
          :numCols="numCols"
          :cardViewStyle="currentViewStyle"
          :genContentLink="genContentLink"
          :contents="results"
          @toggleInfoPanel="toggleInfoPanel"
        />
        <!-- conditionally displayed button if there are additional results -->
        <KButton
          v-if="more"
          :text="coreString('viewMoreAction')"
          appearance="basic-link"
          :disabled="moreLoading"
          class="filter-action-button"
          @click="searchMore"
        />
      </div>
      <!-- loader for search loading -->
      <div v-else>
        <KCircularLoader
          v-if="searchLoading"
          class="loader"
          type="indeterminate"
          :delay="false"
        />
      </div>
    </main>

    <!-- Side Panels for filtering and searching  -->

    <!-- Embedded Side panel is on larger views, and exists next to content -->
    <EmbeddedSidePanel
      v-if="!!windowIsLarge"
      v-model="searchTerms"
      :width="`${sidePanelWidth}px`"
      :availableLabels="labels"
      position="embedded"
      :activeActivityButtons="activeActivityButtons"
      :activeCategories="activeCategories"
      @currentCategory="handleShowSearchModal"
    />
    <!-- The full screen side panel is used on smaller screens, and toggles as an overlay -->
    <!-- FullScreen is a container component, and then the EmbeddedSidePanel sits within -->
    <FullScreenSidePanel
      v-if="!windowIsLarge && sidePanelIsOpen"
      alignment="left"
      class="full-screen-side-panel"
      closeButtonHidden="true"
      :sidePanelOverrideWidth="`${sidePanelOverlayWidth + 64}px`"
      @closePanel="toggleSidePanelVisibility"
    >
      <KIconButton
        v-if="windowIsSmall && !currentCategory"
        class="overlay-close-button"
        icon="close"
        :ariaLabel="coreString('closeAction')"
        :color="$themeTokens.text"
        :tooltip="coreString('closeAction')"
        @click="toggleSidePanelVisibility"
      />
      <KIconButton
        v-if="windowIsSmall && currentCategory"
        icon="back"
        :ariaLabel="coreString('back')"
        :color="$themeTokens.text"
        :tooltip="coreString('back')"
        @click="closeCategoryModal"
      />
      <EmbeddedSidePanel
        v-if="!currentCategory"
        v-model="searchTerms"
        :width="`${sidePanelOverlayWidth}px`"
        :availableLabels="labels"
        position="overlay"
        @currentCategory="handleShowSearchModal"
      />
      <CategorySearchModal
        v-if="currentCategory && windowIsSmall"
        :selectedCategory="currentCategory"
        :numCols="numCols"
        :availableLabels="labels"
        position="fullscreen"
        @cancel="currentCategory = null"
        @input="handleCategory"
      />
    </FullScreenSidePanel>

    <!-- Category Search modal for larger screens. On smaller screens, it is -->
    <!-- contained within the full screen search modal (different design) -->
    <CategorySearchModal
      v-if="(windowIsMedium || windowIsLarge) && currentCategory"
      :selectedCategory="currentCategory"
      :numCols="numCols"
      :availableLabels="labels"
      position="modal"
      @cancel="currentCategory = null"
      @input="handleCategory"
    />

    <FullScreenSidePanel
      v-if="sidePanelContent"
      @closePanel="sidePanelContent = null"
    >
      <BrowseResourceMetadata :content="sidePanelContent" :canDownloadContent="true" />
    </FullScreenSidePanel>
  </div>

</template>


<script>

  import { mapState } from 'vuex';

  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import FullScreenSidePanel from 'kolibri.coreVue.components.FullScreenSidePanel';
  import genContentLink from '../utils/genContentLink';
  import { PageNames } from '../constants';
  import useSearch from '../composables/useSearch';
  import useLearnerResources from '../composables/useLearnerResources';
  import BrowseResourceMetadata from './BrowseResourceMetadata';
  import commonLearnStrings from './commonLearnStrings';
  import ChannelCardGroupGrid from './ChannelCardGroupGrid';
  import HybridLearningCardGrid from './HybridLearningCardGrid';
  import EmbeddedSidePanel from './EmbeddedSidePanel';
  import CategorySearchModal from './CategorySearchModal';
  import SearchChips from './SearchChips';

  const mobileCarouselLimit = 3;
  const desktopCarouselLimit = 15;

  export default {
    name: 'LibraryPage',
    metaInfo() {
      return {
        title: this.learnString('learnLabel'),
      };
    },
    components: {
      HybridLearningCardGrid,
      ChannelCardGroupGrid,
      EmbeddedSidePanel,
      FullScreenSidePanel,
      CategorySearchModal,
      BrowseResourceMetadata,
      SearchChips,
    },
    mixins: [commonLearnStrings, commonCoreStrings, responsiveWindowMixin],
    setup() {
      const {
        searchTerms,
        displayingSearchResults,
        searchLoading,
        moreLoading,
        results,
        more,
        labels,
        search,
        searchMore,
        removeFilterTag,
        clearSearch,
        setCategory,
      } = useSearch();
      const { resumableContentNodes } = useLearnerResources();
      return {
        searchTerms,
        displayingSearchResults,
        searchLoading,
        moreLoading,
        results,
        more,
        labels,
        search,
        searchMore,
        removeFilterTag,
        clearSearch,
        setCategory,
        resumableContentNodes,
      };
    },
    data: function() {
      return {
        currentViewStyle: 'card',
        currentCategory: null,
        showSearchModal: false,
        sidePanelIsOpen: false,
        sidePanelContent: null,
      };
    },
    computed: {
      ...mapState(['rootNodes']),
      carouselLimit() {
        return this.windowIsSmall ? mobileCarouselLimit : desktopCarouselLimit;
      },
      trimmedResume() {
        return this.resumableContentNodes.slice(0, this.carouselLimit);
      },
      currentPage() {
        return PageNames.LIBRARY;
      },
      sidePanelWidth() {
        if (this.windowIsSmall || this.windowIsMedium) {
          return 0;
        } else if (this.windowBreakpoint < 4) {
          return 234;
        } else {
          return 346;
        }
      },
      sidePanelOverlayWidth() {
        return 300;
      },
      numCols() {
        if (this.currentViewStyle === 'list' || this.windowBreakpoint < 1) {
          return null;
        } else if (this.windowIsSmall) {
          return 2;
        } else {
          return 3;
        }
      },
      activeActivityButtons() {
        return this.searchTerms.learning_activities;
      },
      activeCategories() {
        return this.searchTerms.categories;
      },
    },
    created() {
      this.search();
    },
    methods: {
      genContentLink,
      handleShowSearchModal(value) {
        this.currentCategory = value;
        this.showSearchModal = true;
        !this.windowIsSmall ? (this.sidePanelIsOpen = false) : '';
      },
      toggleCardView(value) {
        this.currentViewStyle = value;
      },
      toggleSidePanelVisibility() {
        this.sidePanelIsOpen = !this.sidePanelIsOpen;
      },
      toggleInfoPanel(content) {
        this.sidePanelContent = content;
      },
      closeCategoryModal() {
        this.currentCategory = null;
      },
      handleCategory(category) {
        this.setCategory(category);
        this.currentCategory = null;
      },
    },
    $trs: {
      recent: {
        message: 'Recent',
        context:
          'Header for the section in the Library tab with resources that the learner recently engaged with.',
      },
      /* eslint-disable kolibri/vue-no-unused-translations */
      results: {
        message: '{results, number, integer} {results, plural, one {result} other {results}}',
        context: 'Number of results for a given term after a Library search.',
      },
      moreThanXResults: {
        message: 'More than {results} results',
        context: 'Number of results for a given term after a Library search.',
      },
      /* eslint-disable kolibri/vue-no-unused-translations */
      viewAsList: {
        message: 'View as list',
        context: 'Label for a button',
      },
      viewAsGrid: {
        message: 'View as grid',
        context: 'Label for a button. See also https://en.wikipedia.org/wiki/Grid_view',
      },
      clearAll: {
        message: 'Clear all',
        context: 'Clickable link which removes all currently applied search filters.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .main-grid {
    margin-top: 40px;
    margin-right: 24px;
  }

  .loader {
    margin-top: 60px;
  }

  .toggle-view-buttons {
    float: right;
  }

  .full-screen-side-panel {
    position: relative;
  }
  .overlay-close-button {
    position: absolute;
    top: 8px;
    right: 8px;
  }

  .results-title {
    display: inline-block;
    margin-bottom: 24px;
  }

  .results-header-group {
    margin-bottom: 24px;
  }

  .filter-action-button {
    display: inline-block;
    margin: 4px;
    margin-left: 8px;
  }

</style>
