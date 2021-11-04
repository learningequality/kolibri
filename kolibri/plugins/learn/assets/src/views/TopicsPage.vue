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
            :layout4="{ span: 4 }"
            :layout8="{ span: 8 }"
            :layout12="{ span: 12 }"
          >
            <h3 class="title">
              {{ topic.title }}
            </h3>
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
            {{ topic.description }}
          </KGridItem>
        </KGrid>
        <!-- Nested tabs within the header, for toggling sidebar options -->
        <!-- larger screens -->
        <div class="tabs">
          <KRouterLink
            v-if="topics.length"
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
              v-if="topics.length"
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
          <KGrid v-if="!showFoldersDropdown && !displayingSearchResults">
            <KGridItem
              class="breadcrumbs"
              :layout4="{ span: 4 }"
              :layout8="{ span: 8 }"
              :layout12="{ span: 12 }"
            >
              <slot name="breadcrumbs"></slot>
            </KGridItem>
          </KGrid>

          <div v-if="(windowIsMedium && searchActive)">
            <!-- TO DO Marcella swap out new icon after KDS update -->
            <KButton
              icon="channel"
              class="filter-overlay-toggle-button"
              :text="coreString('searchLabel')"
              :primary="false"
              @click="$router.push(searchLink)"
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
                cardViewStyle="card"
                @toggleInfoPanel="toggleInfoPanel"
              />
            </div>
            <!-- search results -->
            <HybridLearningCardGrid
              v-if="resources.length"
              :contents="trimmedTopicsList(resources)"
              :numCols="numCols"
              :genContentLink="genContentLink"
              cardViewStyle="card"
              @toggleInfoPanel="toggleInfoPanel"
            />
          </div>
          <div v-else-if="!searchLoading" class="results-title">
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
            <!-- results display -->
            <HybridLearningCardGrid
              v-if="results.length"
              :numCols="numCols"
              :cardViewStyle="currentViewStyle"
              :genContentLink="genContentLink"
              :contents="results"
              @toggleInfoPanel="toggleInfoPanel"
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
      <!-- Side Panels for filtering and searching  -->

      <!-- Embedded Side panel is on larger views, and exists next to content -->
      <EmbeddedSidePanel
        v-if="!!windowIsLarge || (windowIsMedium && !searchActive)"
        v-model="searchTerms"
        :topicsListDisplayed="!searchActive"
        topicPage="True"
        :topics="topics"
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
      />
      <!-- The full screen side panel is used on smaller screens, and toggles as an overlay -->
      <!-- FullScreen is a container component, and then the EmbeddedSidePanel sits within -->
      <FullScreenSidePanel
        v-if="!windowIsLarge && sidePanelIsOpen"
        alignment="left"
        class="full-screen-side-panel"
        :closeButtonHidden="true"
        :sidePanelOverrideWidth="`${sidePanelOverlayWidth + 64}px`"
        @closePanel="$router.push(searchLink)"
      >
        <KIconButton
          v-if="windowIsSmall && !currentCategory"
          class="overlay-close-button"
          icon="close"
          :ariaLabel="coreString('closeAction')"
          :color="$themeTokens.text"
          :tooltip="coreString('closeAction')"
          @click="$router.push(searchLink)"
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
          :showChannels="false"
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
    <FullScreenSidePanel
      v-if="sidePanelContent"
      @closePanel="sidePanelContent = null"
    >
      <BrowseResourceMetadata :content="sidePanelContent" :showLocationsInChannel="true" />
    </FullScreenSidePanel>
  </div>

</template>


<script>

  import { mapState } from 'vuex';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
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
        stickyTop: '364px',
        currentViewStyle: 'card',
        currentCategory: null,
        showSearchModal: false,
        sidePanelContent: null,
      };
    },
    computed: {
      ...mapState('topicsTree', ['channel', 'contents', 'isRoot', 'topic']),
      showFoldersDropdown() {
        return this.$route.query.dropdown === 'true';
      },
      sidePanelIsOpen() {
        return this.$route.query.searchPanel === 'true';
      },
      foldersLink() {
        if (this.topic) {
          const query = {};
          if (this.windowIsSmall || this.windowIsMedium) {
            query.dropdown = String(
              this.$route.name === PageNames.TOPICS_TOPIC ? !this.showFoldersDropdown : true
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
            query.searchPanel = String(
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
      searchActive() {
        return this.$route.name === PageNames.TOPICS_TOPIC_SEARCH;
      },
      channelTitle() {
        return this.channel.title;
      },
      resources() {
        return this.contents.filter(content => content.kind !== ContentNodeKinds.TOPIC);
      },
      topics() {
        return this.contents.filter(content => content.kind === ContentNodeKinds.TOPIC);
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
      // calls handleScroll no more than every 17ms
      throttledHandleScroll() {
        return throttle(this.stickyCalculation);
      },
    },
    watch: {
      topic() {
        this.setSearchWithinDescendant(this.topic);
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
    },
    methods: {
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
      trimmedTopicsList(contents) {
        // if more folders, display limited preview
        if (this.topics.length > 0) {
          return contents
            .slice(0, !this.windowIsLarge ? mobileCarouselLimit : carouselLimit)
            .map(normalizeContentNode);
          // if we have reached the end of the folder, show all contents
        } else {
          return contents.map(normalizeContentNode);
        }
      },
      updateFolder(id) {
        this.$router.push(genContentLink(id));
      },
      toggleInfoPanel(content) {
        this.sidePanelContent = content;
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
