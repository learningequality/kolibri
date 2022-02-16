<template>

  <div>
    <main
      class="main-grid"
      :style="gridOffset"
    >
      <div v-if="!windowIsLarge">
        <KButton
          icon="filter"
          :text="translator.$tr('filter')"
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
        <div
          v-if="!(windowBreakpoint < 1 ) && resumableContentNodes.length "
          class="toggle-view-buttons"
        >
          <KIconButton
            icon="menu"
            :ariaLabel="$tr('viewAsList')"
            :color="$themeTokens.text"
            :tooltip="$tr('viewAsList')"
            :disabled="currentViewStyle === 'list'"
            @click="toggleCardView('list')"
          />
          <KIconButton
            icon="channel"
            :ariaLabel="$tr('viewAsGrid')"
            :color="$themeTokens.text"
            :tooltip="$tr('viewAsGrid')"
            :disabled="currentViewStyle === 'card'"
            @click="toggleCardView('card')"
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
          :footerIcons="footerIcons"
          :currentPage="currentPage"
          @toggleInfoPanel="toggleInfoPanel"
        />
        <KButton
          v-if="moreResumableContentNodes"
          appearance="basic-link"
          @click="fetchMoreResumableContentNodes"
        >
          {{ coreString('viewMoreAction') }}
        </KButton>
      </div>

      <!-- Display of search results, after the search is finished loading -->

      <!-- First section is the results title and the various display buttons  -->
      <!-- for interacting or updating the results   -->
      <div v-else-if="!searchLoading">
        <h2 class="results-title">
          {{ more ?
            coreString('overCertainNumberOfSearchResults', { num: results.length }) :
            $tr('results', { results: results.length })
          }}
        </h2>
        <div v-if="!(windowBreakpoint < 1) && results.length" class="toggle-view-buttons">
          <KIconButton
            icon="menu"
            :ariaLabel="$tr('viewAsList')"
            :color="$themeTokens.text"
            :tooltip="$tr('viewAsList')"
            :disabled="currentViewStyle === 'list'"
            @click="toggleCardView('list')"
          />
          <KIconButton
            icon="channel"
            :ariaLabel="$tr('viewAsGrid')"
            :color="$themeTokens.text"
            :tooltip="$tr('viewAsGrid')"
            :disabled="currentViewStyle === 'card'"
            @click="toggleCardView('card')"
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
          :footerIcons="footerIcons"
          :currentPage="currentPage"
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
      class="full-screen-side-panel"
      alignment="left"
      :fullScreenSidePanelCloseButton="displayCloseButton"
      :sidePanelOverrideWidth="`${sidePanelOverlayWidth}px`"
      @closePanel="toggleSidePanelVisibility"
      @shouldFocusFirstEl="findFirstEl()"
    >
      <KIconButton
        v-if="(windowIsSmall || windowIsMedium) && currentCategory"
        icon="back"
        :ariaLabel="coreString('goBackAction')"
        :color="$themeTokens.text"
        :tooltip="coreString('goBackAction')"
        @click="closeCategoryModal"
      />
      <EmbeddedSidePanel
        v-if="!currentCategory"
        ref="embeddedPanel"
        v-model="searchTerms"
        :width="`${sidePanelOverlayWidth - 64}px`"
        :availableLabels="labels"
        position="overlay"
        :activeActivityButtons="activeActivityButtons"
        :activeCategories="activeCategories"
        @currentCategory="handleShowSearchModal"
      />
      <CategorySearchModal
        v-if="currentCategory && (windowIsSmall || windowIsMedium)"
        ref="searchModal"
        :selectedCategory="currentCategory"
        :numCols="numCols"
        :availableLabels="labels"
        position="fullscreen"
        @cancel="currentCategory = null"
        @input="handleCategory"
      />
    </FullScreenSidePanel>

    <!-- Category Search modal for large screens. On smaller screens, it is -->
    <!-- contained within the full screen search modal (different design) -->
    <CategorySearchModal
      v-if="windowIsLarge && currentCategory"
      :selectedCategory="currentCategory"
      :numCols="numCols"
      :availableLabels="labels"
      position="modal"
      @cancel="currentCategory = null"
      @input="handleCategory"
    />

    <FullScreenSidePanel
      v-if="sidePanelContent"
      alignment="right"
      :fullScreenSidePanelCloseButton="true"
      @closePanel="sidePanelContent = null"
      @shouldFocusFirstEl="findFirstEl()"
    >
      <template #header>
        <!-- Flex styles tested in ie11 and look good. Ensures good spacing between
            multiple chips - not a common thing but just in case -->
        <div
          v-for="activity in sidePanelContent.learning_activities"
          :key="activity"
          class="side-panel-chips"
          :class="$computedClass({ '::after': {
            content: '',
            flex: 'auto'
          } })"
        >
          <LearningActivityChip
            class="chip"
            style="margin-left: 8px; margin-bottom: 8px;"
            :kind="activity"
          />
        </div>
      </template>

      <BrowseResourceMetadata
        ref="resourcePanel"
        :content="sidePanelContent"
        :showLocationsInChannel="true"
      />
    </FullScreenSidePanel>
  </div>

</template>


<script>

  import { mapState } from 'vuex';

  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import FullScreenSidePanel from 'kolibri.coreVue.components.FullScreenSidePanel';
  import FilterTextbox from 'kolibri.coreVue.components.FilterTextbox';
  import { crossComponentTranslator } from 'kolibri.utils.i18n';
  import genContentLink from '../utils/genContentLink';
  import { PageNames } from '../constants';
  import useSearch from '../composables/useSearch';
  import useLearnerResources from '../composables/useLearnerResources';
  import BrowseResourceMetadata from './BrowseResourceMetadata';
  import commonLearnStrings from './commonLearnStrings';
  import ChannelCardGroupGrid from './ChannelCardGroupGrid';
  import LearningActivityChip from './LearningActivityChip';
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
      LearningActivityChip,
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
      const {
        resumableContentNodes,
        moreResumableContentNodes,
        fetchMoreResumableContentNodes,
      } = useLearnerResources();
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
        moreResumableContentNodes,
        fetchMoreResumableContentNodes,
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
      footerIcons() {
        return { infoOutline: 'viewInformation' };
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
        if (!this.windowIsSmall) {
          return 364;
        }
        return null;
      },
      displayCloseButton() {
        if (this.currentCategory) {
          return false;
        } else {
          return true;
        }
      },
      numCols() {
        if (this.windowIsMedium) {
          return 2;
        } else if (this.windowBreakpoint < 7) {
          return 3;
        } else if (this.windowBreakpoint >= 7) {
          return 4;
        } else {
          return null;
        }
      },
      activeActivityButtons() {
        return this.searchTerms.learning_activities;
      },
      activeCategories() {
        return this.searchTerms.categories;
      },
      gridOffset() {
        return this.isRtl
          ? { marginRight: `${this.sidePanelWidth + 24}px` }
          : { marginLeft: `${this.sidePanelWidth + 24}px` };
      },
    },
    watch: {
      searchTerms() {
        this.sidePanelIsOpen = false;
      },
      sidePanelIsOpen() {
        if (this.sidePanelIsOpen) {
          document.documentElement.style.position = 'fixed';
          return;
        }
        document.documentElement.style.position = '';
      },
    },
    created() {
      this.search();
      this.translator = crossComponentTranslator(FilterTextbox);
    },
    methods: {
      genContentLink,
      handleShowSearchModal(value) {
        this.currentCategory = value;
        this.showSearchModal = true;
        !(this.windowIsSmall || this.windowIsMedium) ? (this.sidePanelIsOpen = false) : '';
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
      findFirstEl() {
        if (this.$refs.embeddedPanel) {
          this.$refs.embeddedPanel.focusFirstEl();
        } else if (this.$refs.resourcePanel) {
          this.$refs.resourcePanel.focusFirstEl();
        } else {
          this.$refs.searchModal.focusFirstEl();
        }
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
        context: 'Label for a button used to view resources as a list.',
      },
      viewAsGrid: {
        message: 'View as grid',
        context: 'Label for a button used to view resources as a grid.',
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
    width: 100vw;
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

  .side-panel-chips {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-start;
    margin-bottom: -8px;
    margin-left: -8px;
  }
  .chip {
    margin-bottom: 8px;
    margin-left: 8px;
  }

</style>
