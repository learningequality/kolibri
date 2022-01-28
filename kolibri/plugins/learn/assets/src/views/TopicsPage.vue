<template>

  <div>
    <div v-if="currentChannelIsCustom">
      <CustomContentRenderer :topic="topic" />
    </div>

    <div v-else class="page">
      <!-- Header with thumbail and tagline -->
      <div
        v-if="!windowIsSmall"
        ref="header"
        class="header"
        :style="{
          backgroundColor: $themeTokens.surface,
          borderBottom: `1px solid ${$themeTokens.fineLine}`
        }"
      >
        <KGrid>
          <KGridItem
            class="breadcrumbs"
            :layout4="{ span: 4 }"
            :layout8="{ span: 8 }"
            :layout12="{ span: 12 }"
          >
            <KBreadcrumbs v-if="breadcrumbs.length" :items="breadcrumbs" />
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
        <!-- large screens -->
        <HeaderTabs v-if="!!windowIsLarge">
          <HeaderTab
            v-if="topics.length"
            :text="coreString('folders')"
            :to="foldersLink"
          />
          <HeaderTab
            :text="coreString('searchLabel')"
            :to="topics.length ? searchTabLink : {} "
          />
        </HeaderTabs>
      </div>
      <!-- mobile tabs (different alignment and interactions) -->
      <KGrid
        v-if="windowIsSmall"
        class="mobile-header"
        :style="{ backgroundColor: $themeTokens.surface }"
      >
        <KGridItem
          :layout4="{ span: 3 }"
        >
          <h1 class="mobile-title">
            <TextTruncator
              :text="topic.title"
              :maxHeight="maxDescriptionHeight"
            />
          </h1>
        </KGridItem>
        <KGridItem
          :layout4="{ span: 1 }"
        >
          <img
            :src="topic.thumbnail"
            class="channel-logo"
          >
        </KGridItem>
      </KGrid>

      <main
        class="main-content-grid"
        :style="gridOffset"
      >
        <KBreadcrumbs v-if="breadcrumbs.length && windowIsSmall" :items="breadcrumbs" />
        <div
          class="card-grid"
        >
          <div v-if="!windowIsLarge">
            <KButton
              v-if="topics.length"
              icon="topic"
              class="overlay-toggle-button"
              :text="coreString('folders')"
              :primary="false"
              @click="toggleFolderSearchSidePanel('folder')"
            />
            <KButton
              icon="filter"
              class="overlay-toggle-button"
              :text="filterTranslator.$tr('filter')"
              :primary="false"
              @click="toggleFolderSearchSidePanel('search')"
            />

          </div>
          <!-- default/preview display of nested folder structure, not search -->
          <div v-if="!displayingSearchResults">
            <!-- display for each nested topic/folder  -->
            <div v-for="t in topicsForDisplay" :key="t.id">
              <!-- header link to folder -->
              <h2>
                <KRouterLink
                  :text="t.title"
                  :to="genContentLink(t.id)"
                  class="folder-header-link"
                  :appearanceOverrides="{ color: $themeTokens.text }"
                >
                  <template #iconAfter>
                    <KIcon
                      icon="chevronRight"
                      :style="{ top: '4px' }"
                    />
                  </template>
                </KRouterLink>
              </h2>
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
              {{ more ?
                coreString('overCertainNumberOfSearchResults', { num: results.length }) :
                translator.$tr('results', { results: results.length })
              }}
            </h2>
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
                v-if="!moreLoading"
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
        v-if="!!windowIsLarge"
        v-model="searchTerms"
        :topicsListDisplayed="!desktopSearchActive"
        class="side-panel"
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
        :style="sidePanelStyleOverrides"
        @currentCategory="handleShowSearchModal"
        @loadMoreTopics="handleLoadMoreInTopic"
      />
      <!-- The full screen side panel is used on smaller screens, and toggles as an overlay -->
      <!-- FullScreen is a container component, and then the EmbeddedSidePanel sits within -->
      <FullScreenSidePanel
        v-if="!windowIsLarge && sidePanelIsOpen"
        class="full-screen-side-panel"
        alignment="left"
        :fullScreenSidePanelCloseButton="true"
        :sidePanelOverrideWidth="`${sidePanelOverlayWidth}px`"
        @closePanel="toggleFolderSearchSidePanel"
      >
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
          :topicsListDisplayed="!mobileSearchActive"
          topicPage="True"
          :topics="topics"
          :topicsLoading="topicMoreLoading"
          :more="topicMore"
          :genContentLink="genContentLink"
          :width="`${sidePanelOverlayWidth - 64}px`"
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

    <!-- Side panel for showing the information of selected content with a link to view it -->
    <FullScreenSidePanel
      v-if="sidePanelContent"
      alignment="right"
      @closePanel="sidePanelContent = null"
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

      <BrowseResourceMetadata :content="sidePanelContent" :showLocationsInChannel="true" />
    </FullScreenSidePanel>
  </div>

</template>


<script>

  import { mapActions, mapState } from 'vuex';
  import isEqual from 'lodash/isEqual';
  import KBreadcrumbs from 'kolibri-design-system/lib/KBreadcrumbs';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import TextTruncator from 'kolibri.coreVue.components.TextTruncator';
  import FilterTextbox from 'kolibri.coreVue.components.FilterTextbox';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { crossComponentTranslator } from 'kolibri.utils.i18n';
  import FullScreenSidePanel from 'kolibri.coreVue.components.FullScreenSidePanel';
  import { throttle } from 'frame-throttle';
  import { PageNames } from '../constants';
  import { normalizeContentNode } from '../modules/coreLearn/utils.js';
  import useSearch from '../composables/useSearch';
  import genContentLink from '../utils/genContentLink';
  import HeaderTabs from '../../../../coach/assets/src/views/common/HeaderTabs';
  import HeaderTab from '../../../../coach/assets/src/views/common/HeaderTabs/HeaderTab';
  import HybridLearningCardGrid from './HybridLearningCardGrid';
  import EmbeddedSidePanel from './EmbeddedSidePanel';
  import BrowseResourceMetadata from './BrowseResourceMetadata';
  import LearningActivityChip from './LearningActivityChip';
  import CustomContentRenderer from './ChannelRenderer/CustomContentRenderer';
  import CardThumbnail from './ContentCard/CardThumbnail';
  import CategorySearchModal from './CategorySearchModal';
  import SearchChips from './SearchChips';
  import LibraryPage from './LibraryPage';
  import plugin_data from 'plugin_data';

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
      KBreadcrumbs,
      CardThumbnail,
      HybridLearningCardGrid,
      CustomContentRenderer,
      CategorySearchModal,
      EmbeddedSidePanel,
      FullScreenSidePanel,
      LearningActivityChip,
      BrowseResourceMetadata,
      SearchChips,
      TextTruncator,
      HeaderTab,
      HeaderTabs,
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
        sidePanelStyleOverrides: {},
        currentViewStyle: 'card',
        currentCategory: null,
        showSearchModal: false,
        sidePanelIsOpen: false,
        sidePanelContent: null,
        expandedTopics: {},
        subTopicLoading: null,
        topicMoreLoading: false,
        mobileSearchActive: false,
      };
    },
    computed: {
      ...mapState('topicsTree', ['channel', 'contents', 'isRoot', 'topic']),
      childrenToDisplay() {
        return Math.max(this.numCols, 3);
      },
      breadcrumbs() {
        if (!this.topic || !this.topic.ancestors) {
          return [];
        }
        return [
          ...this.topic.ancestors.map(({ title, id }, index) => ({
            // Use the channel name just in case the root node does not have a title.
            text: index === 0 ? this.channelTitle : title,
            link: {
              name: PageNames.TOPICS_TOPIC,
              params: { id },
            },
          })),
          { text: this.topic.ancestors.length ? this.topic.title : this.channelTitle },
        ];
      },
      foldersLink() {
        if (this.topic) {
          return {
            name: PageNames.TOPICS_TOPIC,
            id: this.topic.id,
          };
        }
        return {};
      },
      searchTabLink() {
        // navigates the main page to the search view
        if (this.topic) {
          const query = { ...this.$route.query };
          delete query.dropdown;
          return {
            name: PageNames.TOPICS_TOPIC_SEARCH,
            id: this.topic.id,
            query: query,
          };
        }
        return {};
      },
      desktopSearchActive() {
        return this.$route.name === PageNames.TOPICS_TOPIC_SEARCH;
      },
      channelTitle() {
        return this.channel.name;
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
            if (this.subTopicId || this.topics.length === 1) {
              // If we are in a subtopic display, we should only be displaying this topic
              // so don't bother checking if the ids match.
              // Alternatively, if there is only one topic, we should display all of its children.
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
      sidePanelWidth() {
        if (!this.windowIsLarge) {
          return 0;
        } else if (this.windowBreakpoint < 4) {
          return 234;
        } else {
          return 346;
        }
      },
      gridOffset() {
        return this.isRtl
          ? { marginRight: `${this.sidePanelWidth + 24}px` }
          : { marginLeft: `${this.sidePanelWidth + 24}px` };
      },
      sidePanelOverlayWidth() {
        return 300;
      },
      numCols() {
        if (this.windowBreakpoint > 1 && this.windowBreakpoint < 2) {
          return 2;
        } else if (this.windowBreakpoint >= 2 && this.windowBreakpoint <= 4) {
          return 3;
        } else if (this.windowBreakpoint > 4) {
          return 4;
        } else return null;
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
      searchTerms(newVal, oldVal) {
        if (!isEqual(newVal, oldVal)) {
          if (!isEqual(this.searchTabLink, this.$route)) {
            this.$router.push({ ...this.searchTabLink }).catch(() => {});
          }
          this.sidePanelIsOpen = false;
        }
      },
    },
    beforeDestroy() {
      window.removeEventListener('scroll', this.throttledHandleScroll);
    },
    created() {
      this.translator = crossComponentTranslator(LibraryPage);
      this.filterTranslator = crossComponentTranslator(FilterTextbox);
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
      toggleFolderSearchSidePanel(option) {
        option == 'search' ? (this.mobileSearchActive = true) : (this.mobileSearchActive = false);
        this.sidePanelIsOpen = !this.sidePanelIsOpen;
      },
      // Stick the side panel to top. That can be on the very top of the viewport
      // or right under the 'Browse channel' toolbar, depending on whether the toolbar
      // is visible or no (the toolbar hides on smaller resolutions when scrolling
      // down and appears again when scrolling up).
      // Takes effect only when the side panel is not displayed full-screen.
      stickyCalculation() {
        const header = this.$refs.header;
        const topbar = document.querySelector('.scrolling-header');
        const headerBottom = header ? header.getBoundingClientRect().bottom : 0;
        const topbarBottom = topbar ? topbar.getBoundingClientRect().bottom : 0;

        if (headerBottom < Math.max(topbarBottom, 0)) {
          this.sidePanelStyleOverrides = {
            position: 'fixed',
            top: `${Math.max(0, headerBottom, topbarBottom)}px`,
            height: '100%',
          };
        } else {
          this.sidePanelStyleOverrides = {};
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

  $header-height: 324px;

  .page {
    position: relative;
    overflow-x: hidden;
  }

  .header {
    position: relative;
    width: 100%;
    height: $header-height;
    padding-top: 32px;
    padding-bottom: 48px;
    padding-left: 32px;
  }

  .folder-header-link {
    /deep/ .link-text {
      text-decoration: none !important;
    }
  }

  .title {
    margin: 12px;
  }

  .tab-block {
    position: absolute;
    bottom: 0;
    margin-bottom: 0;
  }

  .side-panel {
    position: absolute;
    top: $header-height;
    height: calc(100% - #{$header-height});
    padding-top: 16px;
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

  .overlay-toggle-button {
    margin: 16px 16px 16px 0;
  }

  .full-screen-side-panel {
    position: fixed;
    top: 0;
    bottom: 0;
    z-index: 12;
    width: 100vw;
  }

  .mobile-header {
    position: relative;
    height: 100%;
  }

  .mobile-title {
    height: 100%;
    padding-right: 16px;
    padding-left: 16px;
    margin-top: 16px;
    font-size: 18px;
  }

  .channel-logo {
    position: absolute;
    top: 16px;
    right: 16px;
    max-height: 40px;
  }

  .more-after-grid {
    margin-bottom: 16px;
  }

  .end-button-block {
    width: 100%;
    margin-top: 16px;
    text-align: center;
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
