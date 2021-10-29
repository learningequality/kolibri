<template>

  <div>
    <main
      class="main-grid"
      :style="{ marginLeft: `${(sidePanelWidth + 24)}px` }"
    >
      <div v-if="!windowIsLarge">
        <!-- TO DO Marcella swap out new icon after KDS update -->
        <KButton
          icon="channel"
          :text="coreString('searchLabel')"
          :primary="false"
          @click="toggleSidePanelVisibility"
        />
      </div>
      <!-- "Default" display - channels and recent/popular content -->
      <div v-if="!displayingSearchResults">
        <h2>{{ coreString('channelsLabel') }}</h2>
        <ChannelCardGroupGrid
          v-if="channels.length"
          class="grid"
          :contents="channels"
        />
        <div v-if="!(windowBreakpoint < 1 )" class="toggle-view-buttons">
          <KIconButton
            icon="menu"
            :ariaLabel="$tr('viewAsList')"
            :color="$themeTokens.text"
            :tooltip="$tr('viewAsList')"
            @click="toggleCardView('list')"
          />
          <KIconButton
            icon="channel"
            :ariaLabel="$tr('viewAsGrid')"
            :color="$themeTokens.text"
            :tooltip="$tr('viewAsGrid')"
            @click="toggleCardView('card')"
          />
        </div>
        <h2>{{ $tr('recent') }}</h2>
        <HybridLearningCardGrid
          v-if="popular.length"
          :cardViewStyle="currentViewStyle"
          :numCols="numCols"
          :genContentLink="genContentLink"
          :contents="trimmedPopular"
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
        <div v-if="!(windowBreakpoint < 1)" class="toggle-view-buttons">
          <KIconButton
            icon="menu"
            :ariaLabel="$tr('viewAsList')"
            :color="$themeTokens.text"
            :tooltip="$tr('viewAsList')"
            @click="toggleCardView('list')"
          />
          <KIconButton
            icon="channel"
            :ariaLabel="$tr('viewAsGrid')"
            :color="$themeTokens.text"
            :tooltip="$tr('viewAsGrid')"
            @click="toggleCardView('card')"
          />
        </div>
        <div class="results-header-group">
          <div
            v-for="(item, key) in searchTermChipList"
            :key="item"
            class="filter-chip"
          >
            <!-- TODO Marcella convert to strings, and add relevant aria label -->
            <span>
              <p class="filter-chip-text">{{ item }}</p>
              <KIconButton
                icon="close"
                size="mini"
                class="filter-chip-button"
                @click="removeFilterTag(item, key)"
              />
            </span>

          </div>
          <KButton
            :text="$tr('clearAll')"
            appearance="basic-link"
            class="filter-action-button"
            @click="clearSearch"
          />
        </div>
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
  import uniq from 'lodash/uniq';

  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import { ContentNodeProgressResource, ContentNodeResource } from 'kolibri.resources';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { AllCategories, NoCategories } from 'kolibri.coreVue.vuex.constants';
  import FullScreenSidePanel from 'kolibri.coreVue.components.FullScreenSidePanel';
  import genContentLink from '../utils/genContentLink';
  import { PageNames } from '../constants';
  import { normalizeContentNode } from '../modules/coreLearn/utils';
  import BrowseResourceMetadata from './BrowseResourceMetadata';
  import commonLearnStrings from './commonLearnStrings';
  import ChannelCardGroupGrid from './ChannelCardGroupGrid';
  import HybridLearningCardGrid from './HybridLearningCardGrid';
  import EmbeddedSidePanel from './EmbeddedSidePanel';
  import CategorySearchModal from './CategorySearchModal/index';

  const mobileCarouselLimit = 3;
  const desktopCarouselLimit = 15;

  const searchKeys = [
    'learning_activities',
    'categories',
    'learner_needs',
    'channels',
    'accessibility_labels',
    'languages',
    'grade_levels',
  ];

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
    },
    mixins: [commonLearnStrings, commonCoreStrings, responsiveWindowMixin],
    data: function() {
      return {
        currentViewStyle: 'card',
        currentCategory: null,
        searchLoading: true,
        moreLoading: false,
        results: [],
        more: null,
        labels: null,
        showSearchModal: false,
        sidePanelIsOpen: false,
        sidePanelContent: null,
      };
    },
    computed: {
      ...mapState('recommended', ['nextSteps', 'popular', 'resume']),
      ...mapState('topicsRoot', { channels: 'rootNodes' }),
      carouselLimit() {
        return this.windowIsSmall ? mobileCarouselLimit : desktopCarouselLimit;
      },
      trimmedPopular() {
        return this.popular.slice(0, this.carouselLimit);
      },
      trimmedNextSteps() {
        return this.nextSteps.slice(0, this.carouselLimit);
      },
      trimmedResume() {
        return this.resume.slice(0, this.carouselLimit);
      },
      currentPage() {
        return PageNames.LIBRARY;
      },
      searchTerms: {
        get() {
          const searchTerms = {};
          for (let key of searchKeys) {
            const obj = {};
            if (this.$route.query[key]) {
              for (let value of this.$route.query[key].split(',')) {
                obj[value] = true;
              }
            }
            searchTerms[key] = obj;
          }
          if (this.$route.query.keywords) {
            searchTerms.keywords = this.$route.query.keywords;
          }
          return searchTerms;
        },
        set(value) {
          const query = { ...this.$route.query };
          for (let key of searchKeys) {
            const val = Object.keys(value[key])
              .filter(Boolean)
              .join(',');
            if (val.length) {
              query[key] = Object.keys(value[key]).join(',');
            } else {
              delete query[key];
            }
          }
          if (value.keywords && value.keywords.length) {
            query.keywords = value.keywords;
          } else {
            delete query.keywords;
          }
          this.$router.push({ ...this.$route, query });
        },
      },
      displayingSearchResults() {
        return Object.values(this.searchTerms).some(v => Object.keys(v).length);
      },
      searchTermChipList() {
        return this.$route.query;
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
          return 1;
        } else if (this.windowBreakpoint < 2) {
          return 2;
        } else {
          return 3;
        }
      },
    },
    watch: {
      searchTerms() {
        this.search();
      },
    },
    created() {
      this.search();
      if (this.$store.getters.isUserLoggedIn) {
        const contentNodeIds = uniq(
          [...this.trimmedNextSteps, ...this.trimmedPopular, ...this.trimmedResume].map(
            ({ id }) => id
          )
        );

        if (contentNodeIds.length > 0) {
          ContentNodeProgressResource.fetchCollection({ getParams: { ids: contentNodeIds } }).then(
            progresses => {
              this.$store.commit('recommended/SET_RECOMMENDED_NODES_PROGRESS', progresses);
            }
          );
        }
      }
    },
    methods: {
      /* eslint-disable kolibri/vue-no-unused-methods */
      // TODO: Remove this if we're close to release and haven't used it
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
        this.searchTerms = { ...this.searchTerms, categories: { [category]: true } };
        this.currentCategory = null;
      },
      search() {
        const getParams = { max_results: 25 };
        if (this.displayingSearchResults) {
          this.searchLoading = true;
          for (let key of searchKeys) {
            if (key === 'categories') {
              if (this.searchTerms[key][AllCategories]) {
                getParams['categories__isnull'] = false;
                break;
              } else if (this.searchTerms[key][NoCategories]) {
                getParams['categories__isnull'] = true;
                break;
              }
            }
            const keys = Object.keys(this.searchTerms[key]);
            if (keys.length) {
              getParams[key] = keys;
            }
          }
          if (this.searchTerms.keywords) {
            getParams.keywords = this.searchTerms.keywords;
          }
          ContentNodeResource.fetchCollection({ getParams }).then(data => {
            this.results = data.results.map(normalizeContentNode);
            this.more = data.more;
            this.labels = data.labels;
            this.searchLoading = false;
          });
        } else {
          ContentNodeResource.fetchCollection({ getParams }).then(data => {
            this.labels = data.labels;
          });
        }
      },
      searchMore() {
        if (this.displayingSearchResults && this.more && !this.moreLoading) {
          this.moreLoading = true;
          ContentNodeResource.fetchCollection({ getParams: this.more }).then(data => {
            this.results.push(...data.results.map(normalizeContentNode));
            this.more = data.more;
            this.labels = data.labels;
            this.moreLoading = false;
          });
        }
      },
      removeFilterTag(value, key) {
        const keyObject = this.searchTerms[key];
        delete keyObject[value];
        this.searchTerms = {
          ...this.searchTerms,
          [key]: keyObject,
        };
      },
      clearSearch() {
        this.searchTerms = {};
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

  .filter-chip {
    display: inline-block;
    margin: 2px;
    font-size: 14px;
    vertical-align: top;
    background-color: #dedede;
    border-radius: 34px;
  }

  .filter-chip-text {
    display: inline-block;
    margin: 4px 0 4px 8px;
    font-size: 14px;
  }

  .filter-chip-button {
    padding-top: 4px;
    margin: 2px;
    color: #dadada;
    vertical-align: middle;
    /deep/ svg {
      width: 20px;
      height: 20px;
    }
  }

</style>
