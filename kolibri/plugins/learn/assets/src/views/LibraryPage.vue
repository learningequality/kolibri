<template>

  <div>
    <main
      class="main-grid"
      :style="{ marginLeft: `${(sidePanelWidth + 24)}px` }"
    >
      <div v-if="!windowIsLarge">
        <KIconButton
          icon="channel"
          :ariaLabel="coreString('search')"
          :color="$themeTokens.text"
          :tooltip="coreString('search')"
          @click="toggleSidePanelVisibility"
        />
      </div>
      <div v-if="!displayingSearchResults">
        <h2>{{ coreString('channelsLabel') }}</h2>
        <ChannelCardGroupGrid
          v-if="channels.length"
          class="grid"
          :contents="channels"
          :genContentLink="genChannelLink"
        />
        <div class="toggle-view-buttons">
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
        />
      </div>
      <div v-else-if="!searchLoading">
        <h2>
          {{ $tr('results', { results: results.length }) }}
        </h2>
        <div>
          <KButton
            v-if="more"
            :text="coreString('viewMoreAction')"
            :primary="false"
            :disabled="moreLoading"
            @click="searchMore"
          />
          <KButton
            :text="$tr('clearAll')"
            appearance="basic-link"
            @click="clearSearch"
          />
        </div>
        <HybridLearningCardGrid
          v-if="results.length"
          :numCols="numCols"
          :cardViewStyle="currentViewStyle"
          :genContentLink="genContentLink"
          :contents="results"
        />
        <KButton
          v-if="more"
          :text="coreString('viewMoreAction')"
          :primary="false"
          :disabled="moreLoading"
          @click="searchMore"
        />
      </div>
      <div v-else>
        <KCircularLoader
          v-if="searchLoading"
          class="loader"
          type="indeterminate"
          :delay="false"
        />
        <div v-else>
          <h2>{{ $tr('results', { results: results.length }) }}</h2>

          <p>{{ $tr('clearAll') }}</p>
          <HybridLearningCardGrid
            v-if="results.length"
            :numCols="numCols"
            :cardViewStyle="currentViewStyle"
            :genContentLink="genContentLink"
            :contents="results"
          />
        </div>
      </div>
    </main>
    <EmbeddedSidePanel
      v-if="!!windowIsLarge"
      v-model="searchTerms"
      :width="`${sidePanelWidth}px`"
      :availableLabels="labels"
      @currentCategory="handleShowSearchModal"
    />
    <!-- <FullScreenSidePanel
      v-if="!windowIsLarge && sidePanelIsOpen"
      @togglePanel="toggleSidePanelVisibility"
    /> -->
    <CategorySearchModal
      v-if="currentCategory"
      :selectedCategory="currentCategory"
      :numCols="numCols"
      :availableLabels="labels"
      @cancel="currentCategory = null"
      @input="handleCategory"
    />
    <KGrid
      class="main-content-grid"
    >
      <EmbeddedSidePanel
        :channels="channels"
        width="3"
      />
      <div>
        <KIconButton
          icon="channel"
          :ariaLabel="coreString('search')"
          :color="$themeTokens.text"
          :tooltip="coreString('search')"
          @click="toggleSidePanelVisibility"
        />
      </div>
      <KGridItem
        :layout="{ span: 3 }"
        class="side-panel"
      />
      <KGridItem
        class="card-grid"
        :style="{ padding: windowIsSmall ? '24px' : 0 }"
        :layout="{ span: 8 }"
        :layout4="{ span: 4 }"
      >
        <div v-if="!displayingSearchResults">
          <h2>{{ coreString('channelsLabel') }}</h2>
          <ChannelCardGroupGrid
            v-if="channels.length"
            class="grid"
            :contents="channels"
            @toggleInfoPanel="toggleInfoPanel"
          />
          <div class="toggle-view-buttons">
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
            @toggleInfoPanel="toggleInfoPanel"
          />
        </div>
        <div v-else>
          <KCircularLoader
            v-if="searchLoading"
            class="loader"
            type="indeterminate"
            :delay="false"
          />
          <div v-else>
            <h2>{{ $tr('results', { results: results.length }) }}</h2>

            <p>{{ $tr('clearAll') }}</p>
            <HybridLearningCardGrid
              v-if="results.length"
              :cardViewStyle="currentViewStyle"
              :genContentLink="genContentLink"
              :contents="results"
            />
          </div>
        </div>
      </KGridItem>
    </KGrid>
    <CategorySearchModal
      v-if="currentCategory"
      :selectedCategory="currentCategory"
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

  import FullScreenSidePanel from 'kolibri.coreVue.components.FullScreenSidePanel';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import { ContentNodeProgressResource, ContentNodeResource } from 'kolibri.resources';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { AllCategories, NoCategories } from 'kolibri.coreVue.vuex.constants';
  // import FullScreenSidePanel from '../../../../../core/assets/src/views/FullScreenSidePanel';
  import { PageNames } from '../constants';
  import BrowseResourceMetadata from './BrowseResourceMetadata';
  import commonLearnStrings from './commonLearnStrings';
  import ChannelCardGroupGrid from './ChannelCardGroupGrid';
  import HybridLearningCardGrid from './HybridLearningCardGrid';
  import EmbeddedSidePanel from './EmbeddedSidePanel';
  import CategorySearchModal from './CategorySearchModal';

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
      BrowseResourceMetadata,
      CategorySearchModal,
      HybridLearningCardGrid,
      ChannelCardGroupGrid,
      EmbeddedSidePanel,
      FullScreenSidePanel,
      CategorySearchModal,
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
        sidePanelContent: null,
        showSearchModal: false,
        // sidePanelIsOpen: false,
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
          console.log(searchTerms);
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
      sidePanelWidth() {
        if (this.windowIsSmall || this.windowIsMedium) {
          return 0;
        } else if (this.windowBreakpoint < 4) {
          return 234;
        } else {
          return 346;
        }
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
      genChannelLink(channel_id) {
        return {
          name: PageNames.TOPICS_CHANNEL,
          params: { channel_id },
        };
      },
      handleShowSearchModal(value) {
        this.currentCategory = value;
        this.showSearchModal = true;
      },
      // hideSearchModal() {
      //   this.showSearchModal = false;
      // },

      toggleCardView(value) {
        this.currentViewStyle = value;
      },
      toggleSidePanelVisibility() {
        this.sidePanelIsOpen = !this.sidePanelIsOpen;
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
            console.log(data);
            this.results = data.results;
            this.more = data.more;
            this.labels = data.labels;
            this.searchLoading = false;
          });
        } else {
          ContentNodeResource.fetchCollection({ getParams }).then(data => {
            console.log(data.labels);
            this.labels = data.labels;
          });
        }
      },
      searchMore() {
        if (this.displayingSearchResults && this.more && !this.moreLoading) {
          this.moreLoading = true;
          ContentNodeResource.fetchCollection({ getParams: this.more }).then(data => {
            this.results.push(...data.results);
            this.more = data.more;
            this.labels = data.labels;
            this.moreLoading = false;
          });
        }
      },
      toggleInfoPanel(content) {
        this.sidePanelContent = content;
      },
      clearSearch() {
        this.$router.push(this.$router.getRoute(PageNames.LIBRARY));
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

</style>
