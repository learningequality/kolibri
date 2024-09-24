<template>

  <LearnAppBarPage :appBarTitle="learnString('learnLabel')">
    <div role="main">
      <h1>
        {{ $tr('bookmarksHeader') }}
      </h1>
      <p v-if="!bookmarks.length && !loading">
        {{ $tr('noBookmarks') }}
      </p>

      <CardList
        v-for="contentNode in bookmarks"
        v-else
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

      <KButton
        v-if="more && !loading"
        data-test="load-more-button"
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
            style="margin-bottom: 8px; margin-left: 8px"
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

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import { ContentNodeResource } from 'kolibri.resources';
  import client from 'kolibri.client';
  import urls from 'kolibri.urls';
  import LearningActivityChip from 'kolibri-common/components/ResourceDisplayAndSearch/LearningActivityChip.vue';
  import useSnackbar from 'kolibri.coreVue.composables.useSnackbar';
  import SidePanelModal from 'kolibri-common/components/SidePanelModal';
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
    metaInfo() {
      return {
        title: this.coreString('bookmarksLabel'),
      };
    },
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
      const { canDownloadExternally } = useCoreLearn();
      const { fetchContentNodeProgress } = useContentNodeProgress();
      const { genContentLinkBackLinkCurrentPage } = useContentLink();
      const { windowIsSmall } = useKResponsiveWindow();
      const { createSnackbar } = useSnackbar();
      return {
        canDownloadExternally,
        fetchContentNodeProgress,
        genContentLinkBackLinkCurrentPage,
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
          client({
            method: 'delete',
            url: urls['kolibri:core:bookmarks_detail'](bookmark.id),
          }).then(() => {
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
        message: 'You have no bookmarked resources',
        context: "Status message in the 'Bookmarks' page when user did not bookmark any resources.",
      },
    },
  };

</script>


<style scoped lang="scss">

  .fix-pos {
    position: fixed;
    z-index: 4;
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
