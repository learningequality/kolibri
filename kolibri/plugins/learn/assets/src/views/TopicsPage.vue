<template>

  <div>
    <div v-if="currentChannelIsCustom">
      <CustomContentRenderer :topic="topic" />
    </div>


    <div v-else class="page">
      <div v-if="!windowIsSmall" class="header">
        <KGrid>
          <KGridItem
            :layout4="{ span: 4 }"
            :layout8="{ span: 8 }"
            :layout12="{ span: 12 }"
          >
            <h3 class="title">
              {{ topicOrChannel.title }}
            </h3>
          </KGridItem>

          <KGridItem
            v-if="topicOrChannel['thumbnail']"
            class="thumbnail"
            :layout4="{ span: 1 }"
            :layout8="{ span: 2 }"
            :layout12="{ span: 2 }"
          >
            <CardThumbnail
              class="thumbnail"
              :thumbnail="topicOrChannel['thumbnail']"
              :isMobile="windowIsSmall"
              :showTooltip="false"
              kind="channel"
              :showContentIcon="false"
            />
          </KGridItem>

          <!-- tagline or description -->
          <KGridItem
            v-if="getTagline"
            class="text"
            :layout4="{ span: topicOrChannel['thumbnail'] ? 3 : 4 }"
            :layout8="{ span: topicOrChannel['thumbnail'] ? 6 : 8 }"
            :layout12="{ span: topicOrChannel['thumbnail'] ? 10 : 12 }"
          >
            {{ getTagline }}
          </KGridItem>
        </KGrid>
        <div class="tabs">
          <KButton
            ref="tab_button"
            :text="coreString('folders')"
            appearance="flat-button"
            class="tab-button"
            :appearanceOverrides="customTabButtonOverrides"
            @click="toggleSidebarView('folders')"
          />
          <KButton
            ref="tab_button"
            :text="coreString('searchLabel')"
            appearance="flat-button"
            class="tab-button"
            :appearanceOverrides="customTabButtonOverrides"
            @click="toggleSidebarView('search')"
          />
        </div>
      </div>
      <div v-if="windowIsSmall" class="mobile-header">
        <div class="mobile-header-contents">
          <div class="mobile-tabs">
            <KButton
              v-if="!windowIsSmall || topics.length"
              ref="tab_button"
              :text="coreString('folders')"
              appearance="flat-button"
              :appearanceOverrides="customTabButtonOverrides"
              @click="toggleFolderDropdown"
            />
            <KButton
              ref="tab_button"
              :text="coreString('searchLabel')"
              appearance="flat-button"
              :appearanceOverrides="customTabButtonOverrides"
              @click="toggleSidePanelVisibility"
            />
          </div>
          <img
            :src="topicOrChannel['thumbnail']"
            class="channel-logo"
          >
        </div>
      </div>

      <main
        class="main-content-grid"
        :style="{ marginLeft: `${(sidePanelWidth + 24)}px` }"
      >
        <div
          class="card-grid"
        >
          <!-- folder selection dropdown menu for small resolutions -->
          <KSelect
            v-if="showFoldersDropdown && topics.length"
            :options="topicOptionsList"
            :value="selected"
            :label="coreString('folders')"
            class="selector"
            @change="updateFolder($event.value)"
          />
          <!-- breadcrumbs - for large screens, or when there are no more folders -->
          <KGrid v-if="!showFoldersDropdown">
            <KGridItem
              class="breadcrumbs"
              :layout4="{ span: 4 }"
              :layout8="{ span: 8 }"
              :layout12="{ span: 12 }"
            >
              <slot name="breadcrumbs"></slot>
            </KGridItem>
          </KGrid>

          <div v-if="!windowIsLarge">
            <!-- TO DO Marcella swap out new icon after KDS update -->
            <KButton
              v-if="!windowIsSmall"
              icon="channel"
              class="filter-overlay-toggle-button"
              :text="coreString('searchLabel')"
              :primary="false"
              @click="toggleSidePanelVisibility"
            />
          </div>
          <!-- default/preview display of nested folder structure, not search -->
          <div v-if="!displayingSearchResults">
            <!-- display for each nested topic/folder  -->
            <div v-for="t in topics" :key="t.id">
              <!-- header link to folder -->
              <h2>
                <KRouterLink
                  :text="t.title"
                  :to="genContentLink(t.id)"
                  class="folder-header-link"
                  iconAfter="chevronRight"
                  :appearanceOverrides="{ color: $themeTokens.text }"
                />
              </h2>
              <!-- card grid of items in folder -->
              <HybridLearningCardGrid
                v-if="t.children.results && t.children.results.length"
                :contents="trimmedTopicsList(t.children.results)"
                :numCols="numCols"
                :genContentLink="genContentLink"
                :channelThumbnail="topicOrChannel['thumbnail']"
                cardViewStyle="card"
              />
              <KButton
                v-if="t.children && t.children.more"
                @click="childLoadMore(t.children.more)"
              >
                {{ $tr('viewMore') }}
              </KButton>
            </div>
            <HybridLearningCardGrid
              v-if="resources.length"
              :contents="trimmedTopicsList(resources)"
              :numCols="numCols"
              :genContentLink="genContentLink"
              :channelThumbnail="topicOrChannel['thumbnail']"
              cardViewStyle="card"
            />
          </div>
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
            <div class="results-header-group">
              <div
                v-for="item in Object.values(searchTermChipList)"
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
                    @click="removeFilterTag(item)"
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
              appearance="basic-link"
              :disabled="moreLoading"
              class="filter-action-button"
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
          </div>
        </div>
      </main>
      <EmbeddedSidePanel
        v-if="!!windowIsLarge"
        v-model="searchTerms"
        :topicsListDisplayed="topics.length > 0 ? activeTab === 'folders' : false"
        topicPage="True"
        :topics="topics"
        :genContentLink="genContentLink"
        :width="`${sidePanelWidth}px`"
        :availableLabels="labels"
        position="embedded"
        :style="{ position: 'fixed',
                  marginTop: stickyTop,
                  paddingTop: '24px' }"
        @currentCategory="handleShowSearchModal"
      />
      <FullScreenSidePanel
        v-if="!windowIsLarge && sidePanelIsOpen"
        alignment="left"
        class="full-screen-side-panel"
        :closeButtonHidden="true"
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
      <CategorySearchModal
        v-if="(windowIsMedium || windowIsLarge) && currentCategory"
        :selectedCategory="currentCategory"
        :numCols="numCols"
        :availableLabels="labels"
        position="modal"
        @cancel="currentCategory = null"
        @input="handleCategory"
      />

    </div>
  </div>

</template>


<script>

  import { mapMutations, mapState } from 'vuex';
  import uniq from 'lodash/uniq';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import { ContentNodeKinds, AllCategories, NoCategories } from 'kolibri.coreVue.vuex.constants';
  import { ContentNodeProgressResource, ContentNodeResource } from 'kolibri.resources';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { normalizeContentNode } from '../modules/coreLearn/utils.js';
  import FullScreenSidePanel from '../../../../../core/assets/src/views/FullScreenSidePanel';
  import commonCoach from '../../../../../plugins/coach/assets/src/views/common';
  import genContentLink from '../utils/genContentLink';
  import HybridLearningCardGrid from './HybridLearningCardGrid';
  import EmbeddedSidePanel from './EmbeddedSidePanel';
  import CustomContentRenderer from './ChannelRenderer/CustomContentRenderer';
  import CardThumbnail from './ContentCard/CardThumbnail';
  import CategorySearchModal from './CategorySearchModal/index';
  import plugin_data from 'plugin_data';

  const searchKeys = [
    'learning_activities',
    'categories',
    'learner_needs',
    'channels',
    'accessibility_labels',
    'languages',
    'grade_levels',
  ];

  const carouselLimit = 4;
  const mobileCarouselLimit = 3;

  export default {
    name: 'TopicsPage',
    metaInfo() {
      let title;
      if (this.isRoot) {
        title = this.$tr('documentTitleForChannel', {
          channelTitle: this.channelTitle,
        });
      } else {
        title = this.$tr('documentTitleForTopic', {
          channelTitle: this.channelTitle,
          topicTitle: this.topic.title,
        });
      }
      return { title };
    },
    components: {
      CardThumbnail,
      HybridLearningCardGrid,
      CustomContentRenderer,
      CategorySearchModal,
      EmbeddedSidePanel,
      FullScreenSidePanel,
    },
    mixins: [commonCoach, responsiveWindowMixin, commonCoreStrings],
    data: function() {
      return {
        activeTab: 'folders',
        stickyTop: '360px',
        currentViewStyle: 'card',
        currentCategory: null,
        searchLoading: true,
        moreLoading: false,
        results: [],
        more: null,
        labels: null,
        showSearchModal: false,
        sidePanelIsOpen: false,
        showFoldersDropdown: false,
      };
    },
    computed: {
      ...mapState('topicsTree', ['channel', 'contents', 'isRoot', 'topic']),
      channelTitle() {
        return this.channel.title;
      },
      resources() {
        return this.contents.filter(content => content.kind !== ContentNodeKinds.TOPIC);
      },
      topics() {
        return this.contents.filter(content => content.kind === ContentNodeKinds.TOPIC);
      },
      topicOrChannel() {
        // Get the channel if we're root, topic if not
        return this.isRoot ? this.channel : this.topic;
      },
      topicOptionsList() {
        return this.topics.map(topic => ({
          value: topic.id,
          label: topic.title,
        }));
      },
      currentChannelIsCustom() {
        if (
          plugin_data.enableCustomChannelNav &&
          this.topic &&
          this.topic.options.modality === 'CUSTOM_NAVIGATION'
        ) {
          return true;
        }
        return false;
      },
      getTagline() {
        return this.topicOrChannel['tagline'] || this.topicOrChannel['description'] || null;
      },
      selected(value) {
        return this.topicOptionsList.find(t => t.value === value) || {};
      },
      customTabButtonOverrides() {
        return {
          textTransform: 'capitalize',
          paddingBottom: '10px',
          fontWeight: 'normal',
          ':hover': {
            color: this.$themeTokens.primary,
            'background-color': this.$themeTokens.surface,
            borderBottom: `2px solid ${this.$themeTokens.primary}`,
          },
        };
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
        } else if (this.windowBreakpoint < 3) {
          return 3;
        } else {
          return 4;
        }
      },
    },
    watch: {
      searchTerms() {
        this.search();
      },
    },
    beforeDestroy() {
      window.removeEventListener('scroll', this.stickyCalculation);
    },
    created() {
      window.addEventListener('scroll', this.stickyCalculation);
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
      genContentLink,
      handleShowSearchModal(value) {
        this.currentCategory = value;
        this.showSearchModal = true;
        !this.windowIsSmall ? (this.sidePanelIsOpen = false) : '';
      },
      toggleSidePanelVisibility() {
        this.sidePanelIsOpen = !this.sidePanelIsOpen;
      },
      toggleFolderDropdown() {
        this.showFoldersDropdown = !this.showFoldersDropdown;
      },
      closeCategoryModal() {
        this.currentCategory = null;
      },
      handleCategory(category) {
        this.searchTerms = { ...this.searchTerms, categories: { [category]: true } };
        this.currentCategory = null;
      },
      trimmedTopicsList(contents) {
        // if more folders, display limited preview
        if (this.topics.length > 0) {
          return contents.slice(0, this.windowIsSmall ? mobileCarouselLimit : carouselLimit);
          // if we have reached the end of the folder, show all contents
        } else {
          return contents;
        }
      },
      updateFolder(id) {
        this.$router.push(genContentLink(id));
      },
      search() {
        this.sidePanelIsOpen = false;
        // updated search to only display results within the currently opened channel
        const getParams = { max_results: 25, channel_id: this.topic.channel_id };
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
          ContentNodeResource.fetchCollection({
            getParams: this.more,
            channel_id: this.topic.channel_id,
          }).then(data => {
            this.results.map(normalizeContentNode).push(...data.results);
            this.more = data.more;
            this.labels = data.labels;
            this.moreLoading = false;
          });
        }
      },
      removeFilterTag(value) {
        let query = JSON.parse(JSON.stringify(this.$route.query));
        const key = Object.keys(query).filter(function(key) {
          return query[key] === value;
        })[0];
        delete query[key];
        this.$router.replace({ query: query });
      },
      clearSearch() {
        console.log('clearing search');
        let query = JSON.parse(JSON.stringify(this.$route.query));
        query = null;
        this.$router.replace({ query: query });
      },
      ...mapMutations('topicsTree', ['ADD_MORE_CHILD_CONTENTS']),
      childLoadMore(more) {
        return ContentNodeResource.fetchTree(more).then(data => {
          const index = this.contents.findIndex(content => content.id === more.id);
          this.ADD_MORE_CHILD_CONTENTS({ index, ...data.children });
        });
      },
      toggleSidebarView(value) {
        this.activeTab = value;
      },
      stickyCalculation() {
        let header = document.getElementsByClassName('header')[0];
        if (header) {
          let position = header.getBoundingClientRect();
          if (position.bottom >= 64) {
            this.stickyTop = `${position.bottom}px`;
          } else {
            this.stickyTop = '64px';
          }
        } else {
          null;
        }
      },
    },
    $trs: {
      documentTitleForChannel: {
        message: 'Folders - { channelTitle }',
        context:
          'A folder is a collection of resources and other subfolders within a channel. This string indicates the folders grouped under a specific channel.',
      },
      documentTitleForTopic: {
        message: '{ topicTitle } - { channelTitle }',
        context: 'DO NOT TRANSLATE\nCopy the source string.',
      },
      viewMore: 'View more',
      /* eslint-disable kolibri/vue-no-unused-translations */
      showMore: {
        message: 'Show more',
        context: 'Clickable link which allows to load more resources.',
      },
      viewAll: {
        message: 'View all',
        context: 'Clickable link which allows to display all resources in a topic.',
      },
      results: {
        message: '{results, number, integer} {results, plural, one {result} other {results}}',
        context: 'Number of results for a given term after a Library search.',
      },
      clearAll: {
        message: 'Clear all',
        context: 'Clickable link which removes all currently applied search filters.',
      },
      /* eslint-disable kolibri/vue-no-unused-translations */
    },
  };

</script>


<style lang="scss" scoped>

  .page {
    position: relative;
  }

  .header {
    position: relative;
    // z-index: 4;
    width: 100%;
    height: 300px;
    padding-top: 32px;
    padding-bottom: 0;
    padding-left: 32px;
    background-color: white;
    border: 1px solid #dedede;
  }

  .folder-header-link {
    /deep/ .link-text {
      text-decoration: none !important;
    }
    /deep/ svg {
      fill: black !important;
    }
  }

  .tabs {
    position: absolute;
    bottom: 0;
  }

  .tab-button {
    padding: 18px;
    border-bottom: 2px solid transparent;
  }

  .main-content-grid {
    position: relative;
    margin: 24px;
  }

  .text {
    max-width: 920px;
  }

  /deep/.side-panel {
    position: relative;
    bottom: 0;
  }

  /deep/.card-thumbnail-wrapper {
    max-width: 100%;
    height: 110px;
    border: 1px solid #dedede;
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

  .filter-overlay-toggle-button {
    margin-bottom: 16px;
  }

  .full-screen-side-panel {
    position: fixed;
    top: 0;
    bottom: 0;
    z-index: 12;
  }

  .mobile-header {
    position: relative;
    height: 100px;
    background-color: white;
  }

  .mobile-tabs {
    position: absolute;
    bottom: 0;
  }

  .channel-logo {
    position: absolute;
    top: 24px;
    right: 24px;
    max-height: 55px;
    vertical-align: bottom;
  }
  .overlay-close-button {
    position: absolute;
    top: 8px;
    right: 24px;
  }

</style>
