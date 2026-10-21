<template>

  <LearnAppBarPage
    :appBarTitle="learnString('learnLabel')"
    :loading="pageLoading"
  >
    <div role="main">
      <h1>
        {{ $tr('bookmarksHeader') }}
      </h1>
      <div
        v-if="!bookmarks.length && !loading"
        class="empty-state"
        role="status"
      >
        <KIcon
          icon="bookmarkEmpty"
          class="empty-state-icon"
          :color="$themeTokens.textDisabled"
        />
        <h2>{{ $tr('noBookmarksTitle') }}</h2>
        <p>{{ $tr('noBookmarks') }}</p>
      </div>

      <div
        v-else-if="bookmarks.length"
        class="bookmark-grid"
        :class="{ 'bookmark-grid-mobile': windowIsSmall }"
      >
        <CardList
          v-for="contentNode in bookmarks"
          :key="contentNode.id"
          :contentNode="contentNode"
          class="card-grid-item"
          :isMobile="windowIsSmall"
          :to="genContentLinkBackLinkCurrentPage(contentNode.id, contentNode.is_leaf)"
          :createdDate="contentNode.bookmark ? contentNode.bookmark.created : null"
        >
          <template #footer>
            <HybridLearningFooter
              :contentNode="contentNode"
              :bookmarked="true"
              @toggleInfoPanel="toggleInfoPanel(contentNode)"
              @removeFromBookmarks="removeFromBookmarks(contentNode.bookmark)"
            />
          </template>
        </CardList>
      </div>

      <KButton
        v-if="more && !loading"
        data-testid="load-more-button"
        :text="coreString('viewMoreAction')"
        @click="loadMore"
      />
      <KCircularLoader
        v-else-if="loading"
        :delay="false"
      />
    </div>

    <!-- Side panel for showing the information of selected content with a link to view it -->
    <SidePanelModal
      v-if="sidePanelContent"
      class="fix-pos"
      alignment="right"
      closeButtonIconType="close"
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
          :class="
            $computedClass({
              '::after': {
                content: '',
                flex: 'auto',
              },
            })
          "
        >
          <LearningActivityChip
            class="chip"
            :kind="activity"
          />
        </div>
      </template>

      <BrowseResourceMetadata
        ref="resourcePanel"
        :content="sidePanelContent"
        :showLocationsInChannel="true"
        :canDownloadExternally="canDownloadExternally"
      />
    </SidePanelModal>
  </LearnAppBarPage>

</template>


<script>

  import commonCoreStrings, { coreStrings } from 'kolibri/uiText/commonCoreStrings';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import ContentNodeResource from 'kolibri-common/apiResources/ContentNodeResource';
  import BookmarksResource from 'kolibri-common/apiResources/BookmarksResource';
  import LearningActivityChip from 'kolibri-common/components/ResourceDisplayAndSearch/LearningActivityChip.vue';
  import useSnackbar from 'kolibri/composables/useSnackbar';
  import usePageTitle from 'kolibri/composables/usePageTitle';
  import SidePanelModal from 'kolibri-common/components/SidePanelModal';
  import { pageLoading } from 'kolibri-common/composables/usePageLoading';
  import useContentNodeProgress from '../composables/useContentNodeProgress';
  import useContentLink from '../composables/useContentLink';
  import useCoreLearn from '../composables/useCoreLearn';
  import commonLearnStrings from './commonLearnStrings';
  import LearnAppBarPage from './LearnAppBarPage';
  import CardList from './CardList';
  import HybridLearningFooter from './HybridLearningContentCard/HybridLearningFooter';

  import BrowseResourceMetadata from './BrowseResourceMetadata';

  export default {
    name: 'BookmarkPage',
    components: {
      BrowseResourceMetadata,
      SidePanelModal,
      LearningActivityChip,
      CardList,
      LearnAppBarPage,
      HybridLearningFooter,
    },
    mixins: [commonCoreStrings, commonLearnStrings],
    setup() {
      usePageTitle(coreStrings.bookmarksLabel$, { hasVisibleHeading: true });
      const { canDownloadExternally } = useCoreLearn();
      const { fetchContentNodeProgress } = useContentNodeProgress();
      const { genContentLinkBackLinkCurrentPage } = useContentLink();
      const { windowIsSmall } = useKResponsiveWindow();
      const { createSnackbar } = useSnackbar();
      return {
        canDownloadExternally,
        fetchContentNodeProgress,
        genContentLinkBackLinkCurrentPage,
        pageLoading,
        windowIsSmall,
        createSnackbar,
      };
    },
    data() {
      return {
        loading: true,
        bookmarks: [],
        more: null,
        sidePanelContent: null,
      };
    },
    created() {
      ContentNodeResource.fetchBookmarks({ params: { limit: 25, available: true } }).then(data => {
        this.more = data.more;
        this.bookmarks = data.results ? data.results : [];
        this.loading = false;
        this.fetchContentNodeProgress({ ids: this.bookmarks.map(b => b.id) });
      });
    },
    methods: {
      loadMore() {
        if (!this.loading) {
          this.loading = true;
          ContentNodeResource.fetchBookmarks({ params: this.more }).then(data => {
            this.more = data.more;
            this.bookmarks.push(...data.results);
            this.loading = false;
            this.fetchContentNodeProgress({ ids: data.results.map(b => b.id) });
          });
        }
      },
      removeFromBookmarks(bookmark) {
        if (bookmark) {
          BookmarksResource.delete(bookmark.id).then(() => {
            this.bookmarks = this.bookmarks.filter(bm => bm.bookmark.id !== bookmark.id);
            this.createSnackbar(this.$tr('removedNotification'));
          });
        }
      },
      toggleInfoPanel(content) {
        this.sidePanelContent = content;
      },
      findFirstEl() {
        this.$refs.resourcePanel.focusFirstEl();
      },
    },
    $trs: {
      bookmarksHeader: {
        message: 'Bookmarked resources',
        context:
          "Header on the 'Bookmarks' page with the list of the resources user previously saved.",
      },
      removedNotification: {
        message: 'Removed from bookmarks',
        context:
          'Notification indicating that a resource has been removed from the Bookmarks page.',
      },
      noBookmarks: {
        message: 'Explore learning resources and select Save to bookmarks to add them here.',
        context:
          "Instructions shown on the 'Bookmarks' page when the learner has not saved any resources.",
      },
      noBookmarksTitle: {
        message: 'Your bookmarks will appear here',
        context: "Heading shown on the 'Bookmarks' page when the learner has no saved resources.",
      },
    },
  };

</script>


<style lang="scss" scoped>

  .fix-pos {
    position: fixed;
    z-index: 4;
  }

  .bookmark-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
    margin-top: 16px;
  }

  .bookmark-grid-mobile {
    grid-template-columns: minmax(0, 1fr);
  }

  .bookmark-grid .card-grid-item {
    margin-top: 0;
  }

  .empty-state {
    max-width: 560px;
    padding: 32px 24px;
    margin: 32px auto;
    text-align: center;
    color: var(--tokens-text);
    background-color: var(--tokens-surface);
    border-radius: 8px;
  }

  .empty-state-icon {
    width: 32px;
    height: 32px;
  }

  .empty-state h2 {
    margin: 12px 0 8px;
    font-size: 20px;
  }

  .empty-state p {
    margin: 0;
    color: var(--tokens-textDisabled);
  }

  .side-panel-chips {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-start;
    margin-top: 8px;
    margin-left: -8px;
  }

  .chip {
    margin-bottom: 8px;
    margin-left: 8px;
  }

</style>
