<template>

  <div>
    <div v-if="currentChannelIsCustom">
      <CustomContentRenderer :topic="topic" />
    </div>

    <div v-else class="page">
      <!-- Header with thumbail and tagline -->
      <div v-if="!windowIsSmall" class="header">
        <KGrid>
          <KGridItem
            v-if="!displayingSearchResults"
            class="breadcrumbs"
            :layout4="{ span: 4 }"
            :layout8="{ span: 8 }"
            :layout12="{ span: 12 }"
          >
            <slot name="breadcrumbs"></slot>
          </KGridItem>
          <KGridItem
            :layout4="{ span: 4 }"
            :layout8="{ span: 8 }"
            :layout12="{ span: 12 }"
          >
            <h1 class="title">
              <TextTruncator
                :text="topic.title"
                :maxHeight="maxTitleHeight"
              />
            </h1>
          </KGridItem>

          <KGridItem
            v-if="topic.thumbnail"
            class="thumbnail"
            :layout4="{ span: 1 }"
            :layout8="{ span: 2 }"
            :layout12="{ span: 2 }"
          >
            <CardThumbnail
              class="thumbnail"
              :thumbnail="topic.thumbnail"
              :isMobile="windowIsSmall"
              :showTooltip="false"
              kind="channel"
              :showContentIcon="false"
            />
          </KGridItem>

          <!-- tagline or description -->
          <KGridItem
            v-if="topic.description"
            class="text"
            :layout4="{ span: topic.thumbnail ? 3 : 4 }"
            :layout8="{ span: topic.thumbnail ? 6 : 8 }"
            :layout12="{ span: topic.thumbnail ? 10 : 12 }"
          >
            <TextTruncator
              :text="topic.description"
              :maxHeight="maxDescriptionHeight"
            />
          </KGridItem>
        </KGrid>
        <!-- Nested tabs within the header, for toggling sidebar options -->
        <!-- larger screens -->
        <div class="tabs">
          <KRouterLink
            ref="tab_button"
            :to="foldersLink"
            :text="coreString('folders')"
            appearance="flat-button"
            class="tab-button"
            :style="!searchActive ? {
              color: `${this.$themeTokens.primary} !important`,
              borderBottom: `2px solid ${this.$themeTokens.primary}`,
              paddingBottom: '2px',
            } : {}"
            :appearanceOverrides="customTabButtonOverrides"
          />
          <KRouterLink
            ref="tab_button"
            :to="searchLink"
            :text="coreString('searchLabel')"
            appearance="flat-button"
            class="tab-button"
            :style="searchActive ? {
              color: `${this.$themeTokens.primary} !important`,
              borderBottom: `2px solid ${this.$themeTokens.primary}`,
              paddingBottom: '2px',
            } : {}"
            :appearanceOverrides="customTabButtonOverrides"
          />
        </div>
      </div>
      <!-- mobile tabs (different alignment and interactions) -->
      <div v-if="windowIsSmall" class="mobile-header">
        <div class="mobile-header-contents">
          <div class="mobile-tabs">
            <KRouterLink
              ref="tab_button"
              :to="foldersLink"
              :text="coreString('folders')"
              appearance="flat-button"
              :appearanceOverrides="customTabButtonOverrides"
            />
            <KRouterLink
              ref="tab_button"
              :to="searchLink"
              :text="coreString('searchLabel')"
              appearance="flat-button"
              :appearanceOverrides="customTabButtonOverrides"
            />
          </div>
          <img
            :src="topic.thumbnail"
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
          <div v-if="(windowIsMedium && searchActive)">
            <KButton
              icon="filter"
              class="filter-overlay-toggle-button"
              :text="coreString('searchLabel')"
              :primary="false"
              @click="$router.push(searchLink)"
            />
          </div>
          <!-- default/preview display of nested folder structure, not search -->
          <div v-if="!displayingSearchResults">
            <h2>
              <TextTruncator
                :text="topic.title"
                :maxHeight="maxTitleHeight"
              />
            </h2>
            <!-- display for each nested topic/folder  -->
            <div v-for="t in topicsForDisplay" :key="t.id">
              <!-- header link to folder -->
              <h3>
                <KRouterLink
                  :text="t.title"
                  :to="genContentLink(t.id)"
                  class="folder-header-link"
                  iconAfter="chevronRight"
                  :appearanceOverrides="{ color: $themeTokens.text }"
                />
              </h3>
              <!-- card grid of items in folder -->
              <HybridLearningCardGrid
                v-if="t.children && t.children.length"
                :contents="t.children"
                :numCols="numCols"
                :genContentLink="genContentLink"
                cardViewStyle="card"
                @toggleInfoPanel="toggleInfoPanel"
              />
              <KButton
                v-if="t.showMore"
                class="more-after-grid"
                appearance="basic-link"
                @click="handleShowMore(t.id)"
              >
                {{ $tr('showMore') }}
              </KButton>
              <KRouterLink v-else-if="t.viewAll" class="more-after-grid" :to="t.viewAll">
                {{ $tr('viewAll') }}
              </KRouterLink>
              <KButton
                v-else-if="t.viewMore && t.id !== subTopicLoading"
                class="more-after-grid"
                appearance="basic-link"
                @click="handleLoadMoreinSubtopic(t.id)"
              >
                {{ coreString('viewMoreAction') }}
              </KButton>
              <KCircularLoader v-if="t.id === subTopicLoading" />
            </div>
            <!-- search results -->
            <HybridLearningCardGrid
              v-if="resources.length"
              :contents="resources"
              :numCols="numCols"
              :genContentLink="genContentLink"
              cardViewStyle="card"
              @toggleInfoPanel="toggleInfoPanel"
            />
            <div v-if="topicMore" class="end-button-block">
              <KButton
                v-if="!topicMoreLoading"
                :text="coreString('viewMoreAction')"
                appearance="raised-button"
                :disabled="topicMoreLoading"
                @click="handleLoadMoreInTopic"
              />
              <KCircularLoader v-else />
            </div>
          </div>
          <div v-else-if="!searchLoading">
            <h2 class="results-title">
              {{ translator.$tr('results', { results: results.length }) }}
            </h2>
            <KButton
              v-if="more"
              :text="coreString('viewMoreAction')"
              appearance="basic-link"
              :disabled="moreLoading"
              class="filter-action-button"
              @click="searchMore"
            />
            <SearchChips
              :searchTerms="searchTerms"
              @removeItem="removeFilterTag"
              @clearSearch="clearSearch"
            />
            <!-- search results display -->
            <HybridLearningCardGrid
              v-if="results.length"
              :numCols="numCols"
              :cardViewStyle="currentViewStyle"
              :genContentLink="genContentLink"
              :contents="results"
              @toggleInfoPanel="toggleInfoPanel"
            />
            <div v-if="more" class="end-button-block">
              <KButton
                v-if="moreLoading"
                :text="coreString('viewMoreAction')"
                appearance="basic-link"
                :disabled="moreLoading"
                class="filter-action-button"
                @click="searchMore"
              />
              <KCircularLoader v-else />
            </div>
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
      <!-- Side Panels for filtering and searching  -->

      <!-- Embedded Side panel is on larger views, and exists next to content -->
      <EmbeddedSidePanel
        v-if="!!windowIsLarge || (windowIsMedium && !searchActive)"
        v-model="searchTerms"
        :topicsListDisplayed="!searchActive"
        topicPage="True"
        :topics="topics"
        :activeActivityButtons="activeActivityButtons"
        :activeCategories="activeCategories"
        :topicsLoading="topicMoreLoading"
        :more="topicMore"
        :genContentLink="genContentLink"
        :width="`${sidePanelWidth}px`"
        :availableLabels="labels"
        :showChannels="false"
        position="embedded"
        :style="{ position: 'fixed',
                  marginTop: stickyTop,
                  paddingTop: '24px',
                  paddingBottom: '200px' }"
        @currentCategory="handleShowSearchModal"
        @loadMoreTopics="handleLoadMoreInTopic"
      />
      <!-- The full screen side panel is used on smaller screens, and toggles as an overlay -->
      <!-- FullScreen is a container component, and then the EmbeddedSidePanel sits within -->
      <FullScreenSidePanel
        v-if="!windowIsLarge && sidePanelIsOpen"
        alignment="left"
        class="full-screen-side-panel"
        :closeButtonHidden="true"
        :sidePanelOverrideWidth="`${sidePanelOverlayWidth + 64}px`"
        @closePanel="$router.push(currentLink)"
      >
        <KIconButton
          v-if="windowIsSmall && !currentCategory"
          class="overlay-close-button"
          icon="close"
          :ariaLabel="coreString('closeAction')"
          :color="$themeTokens.text"
          :tooltip="coreString('closeAction')"
          @click="$router.push(currentLink)"
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
          :topicsListDisplayed="!searchActive"
          topicPage="True"
          :topics="topics"
          :topicsLoading="topicMoreLoading"
          :more="topicMore"
          :genContentLink="genContentLink"
          :width="`${sidePanelOverlayWidth}px`"
          :availableLabels="labels"
          :activeActivityButtons="activeActivityButtons"
          :activeCategories="activeCategories"
          :showChannels="false"
          position="overlay"
          @currentCategory="handleShowSearchModal"
          @loadMoreTopics="handleLoadMoreInTopic"
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
    <FullScreenSidePanel
      v-if="sidePanelContent"
      @closePanel="sidePanelContent = null"
    >
      <BrowseResourceMetadata :content="sidePanelContent" :showLocationsInChannel="true" />
    </FullScreenSidePanel>
  </div>

</template>


<script>

  import { mapActions, mapState } from 'vuex';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import TextTruncator from 'kolibri.coreVue.components.TextTruncator';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { crossComponentTranslator } from 'kolibri.utils.i18n';
  import FullScreenSidePanel from 'kolibri.coreVue.components.FullScreenSidePanel';
  import { throttle } from 'frame-throttle';
  import { PageNames } from '../constants';
  import { normalizeContentNode } from '../modules/coreLearn/utils.js';
  import useSearch from '../composables/useSearch';
  import genContentLink from '../utils/genContentLink';
  import HybridLearningCardGrid from './HybridLearningCardGrid';
  import EmbeddedSidePanel from './EmbeddedSidePanel';
  import BrowseResourceMetadata from './BrowseResourceMetadata';
  import CustomContentRenderer from './ChannelRenderer/CustomContentRenderer';
  import CardThumbnail from './ContentCard/CardThumbnail';
  import CategorySearchModal from './CategorySearchModal';
  import SearchChips from './SearchChips';
  import LibraryPage from './LibraryPage';
  import plugin_data from 'plugin_data';

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
      BrowseResourceMetadata,
      SearchChips,
      TextTruncator,
    },
    mixins: [responsiveWindowMixin, commonCoreStrings],
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
        setSearchWithinDescendant,
      } = useSearch();
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
        setSearchWithinDescendant,
      };
    },
    data: function() {
      return {
        stickyTop: '388px',
        currentViewStyle: 'card',
        currentCategory: null,
        showSearchModal: false,
        sidePanelContent: null,
        expandedTopics: {},
        subTopicLoading: null,
        topicMoreLoading: false,
      };
    },
    computed: {
      ...mapState('topicsTree', ['channel', 'contents', 'isRoot', 'topic']),
      sidePanelIsOpen() {
        return this.$route.query.sidePanel === 'true';
      },
      foldersLink() {
        if (this.topic) {
          const query = {};
          if (this.windowIsSmall || this.windowIsMedium) {
            query.sidePanel = String(
              this.$route.name === PageNames.TOPICS_TOPIC ? !this.sidePanelIsOpen : true
            );
          }
          return {
            name: PageNames.TOPICS_TOPIC,
            id: this.topic.id,
            query,
          };
        }
        return {};
      },
      searchLink() {
        if (this.topic) {
          const query = { ...this.$route.query };
          if (this.windowIsSmall || this.windowIsMedium) {
            query.sidePanel = String(
              this.$route.name === PageNames.TOPICS_TOPIC_SEARCH ? !this.sidePanelIsOpen : true
            );
          }
          delete query.dropdown;
          return {
            name: PageNames.TOPICS_TOPIC_SEARCH,
            id: this.topic.id,
            query: query,
          };
        }
        return {};
      },
      currentLink() {
        return this.searchActive ? this.searchLink : this.foldersLink;
      },
      searchActive() {
        return this.$route.name === PageNames.TOPICS_TOPIC_SEARCH;
      },
      channelTitle() {
        return this.channel.title;
      },
      resources() {
        const resources = this.contents.filter(content => content.kind !== ContentNodeKinds.TOPIC);
        // If there are no topics, then just display all resources we have loaded.
        if (!this.topics.length) {
          return resources;
        }
        return resources.slice(0, this.childrenToDisplay);
      },
      topics() {
        return this.contents.filter(content => content.kind === ContentNodeKinds.TOPIC);
      },
      topicsForDisplay() {
        return this.topics
          .filter(t =>
            this.subTopicId ? t.id === this.subTopicId : t.children && t.children.results.length
          )
          .map(t => {
            let childrenToDisplay;
            const topicChildren = t.children ? t.children.results : [];
            if (this.subTopicId) {
              // If we are in a subtopic display, we should only be displaying this topic
              // so don't bother checking if the ids match.
              childrenToDisplay = topicChildren.length;
            } else if (this.expandedTopics[t.id]) {
              // If topic is expanded show three times as many children.
              childrenToDisplay = this.childrenToDisplay * 3;
            } else {
              childrenToDisplay = this.childrenToDisplay;
            }
            const children = topicChildren.slice(0, childrenToDisplay).map(normalizeContentNode);
            // showMore is whether we should show more inline
            const showMore =
              !this.subTopicId &&
              topicChildren.length > this.childrenToDisplay &&
              !this.expandedTopics[t.id];

            // viewMore is the 'more' object that will be used to load more items from this topic.
            const viewMore = t.children ? t.children.more : null;

            // viewAll is a flag + link object to link to a subpage which shows all initially
            // loaded topics content
            const viewAll =
              !this.subTopicId && (topicChildren.length > childrenToDisplay || viewMore)
                ? {
                    ...this.$route,
                    params: {
                      ...this.$route.params,
                      subtopic: t.id,
                    },
                  }
                : null;

            return {
              ...t,
              viewAll,
              children,
              showMore,
              viewMore,
            };
          });
      },
      subTopicId() {
        return this.$route.params.subtopic;
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
      sidePanelWidth() {
        if (this.windowIsSmall || (this.windowIsMedium && this.searchActive)) {
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
        if (this.windowBreakpoint < 2) {
          return 2;
        } else if (this.windowBreakpoint <= 4) {
          return 3;
        } else {
          return 4;
        }
      },
      // calls handleScroll no more than every 17ms
      throttledHandleScroll() {
        return throttle(this.stickyCalculation);
      },
      activeActivityButtons() {
        return this.searchTerms.learning_activities;
      },
      activeCategories() {
        return this.searchTerms.categories;
      },
      childrenToDisplay() {
        return this.windowIsLarge ? carouselLimit : mobileCarouselLimit;
      },
      topicMore() {
        return this.topic.children && this.topic.children.more;
      },
      maxTitleHeight() {
        return 60;
      },
      maxDescriptionHeight() {
        return 110;
      },
    },
    watch: {
      topic() {
        this.setSearchWithinDescendant(this.topic);
      },
      subTopicId(newValue, oldValue) {
        if (newValue && newValue !== oldValue) {
          this.handleLoadMoreinSubtopic(newValue);
        }
      },
    },
    beforeDestroy() {
      window.removeEventListener('scroll', this.throttledHandleScroll);
    },
    created() {
      this.translator = crossComponentTranslator(LibraryPage);
      window.addEventListener('scroll', this.throttledHandleScroll);
      this.setSearchWithinDescendant(this.topic);
      this.search();
      if (this.subTopicId) {
        this.handleLoadMoreinSubtopic(this.subTopicId);
      }
    },
    methods: {
      ...mapActions('topicsTree', ['loadMoreContents', 'loadMoreTopics']),
      genContentLink,
      handleShowSearchModal(value) {
        this.currentCategory = value;
        this.showSearchModal = true;
        !this.windowIsSmall ? (this.sidePanelIsOpen = false) : '';
      },
      closeCategoryModal() {
        this.currentCategory = null;
      },
      handleCategory(category) {
        this.setCategory(category);
        this.currentCategory = null;
      },
      toggleInfoPanel(content) {
        this.sidePanelContent = content;
      },
      stickyCalculation() {
        let header = document.getElementsByClassName('header')[0];
        let topbar = document.getElementsByClassName('ui-toolbar')[0];
        if (header) {
          let position = header.getBoundingClientRect();
          let topbarPosition = topbar.getBoundingClientRect();
          if (position.bottom >= 64) {
            this.stickyTop = `${position.bottom}px`;
          } else if (position.bottom < 0 && topbarPosition.bottom < 0) {
            this.stickyTop = '0px';
          } else {
            this.stickyTop = '64px';
          }
        } else {
          null;
        }
      },
      handleShowMore(topicId) {
        this.expandedTopics = {
          ...this.expandedTopics,
          [topicId]: true,
        };
      },
      handleLoadMoreinSubtopic(topicId) {
        this.subTopicLoading = topicId;
        this.loadMoreContents(topicId).then(() => {
          this.subTopicLoading = null;
        });
      },
      handleLoadMoreInTopic() {
        this.topicMoreLoading = true;
        this.loadMoreTopics().then(() => {
          this.topicMoreLoading = false;
        });
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
      showMore: {
        message: 'Show more',
        context: 'Clickable link which allows to load more resources.',
      },
      viewAll: {
        message: 'View all',
        context: 'Clickable link which allows to display all resources in a topic.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .page {
    position: relative;
    overflow-x: hidden;
  }

  .header {
    position: relative;
    // z-index: 4;
    width: 100%;
    height: 324px;
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

  .title {
    margin: 12px;
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

  /deep/.card-thumbnail-wrapper {
    max-width: 100%;
    height: 110px;
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

  .more-after-grid {
    margin-bottom: 16px;
  }

  .end-button-block {
    width: 100%;
    margin-top: 16px;
    text-align: center;
  }

</style>
