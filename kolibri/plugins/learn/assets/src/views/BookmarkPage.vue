<template>

  <div>
    <h1>
      {{ $tr('bookmarksHeader') }}
    </h1>
    <p v-if="!bookmarks.length && !loading">
      {{ $tr('noBookmarks') }}
    </p>

    <HybridLearningCardGrid
      v-if="bookmarks.length"
      :contents="bookmarks"
      :currentPage="currentPage"
      :genContentLink="genContentLink"
      :cardViewStyle="windowIsSmall ? 'card' : 'list'"
      :footerIcons="footerIcons"
      @removeFromBookmarks="removeFromBookmarks"
      @toggleInfoPanel="toggleInfoPanel"
    />

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

    <!-- Side panel for showing the information of selected content with a link to view it -->
    <FullScreenSidePanel
      v-if="sidePanelContent"
      alignment="right"
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

  import { mapActions } from 'vuex';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import FullScreenSidePanel from 'kolibri.coreVue.components.FullScreenSidePanel';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import { ContentNodeResource } from 'kolibri.resources';
  import client from 'kolibri.client';
  import urls from 'kolibri.urls';
  import genContentLink from '../utils/genContentLink';
  import { PageNames } from '../constants';
  import { normalizeContentNode } from '../modules/coreLearn/utils.js';
  import useContentNodeProgress from '../composables/useContentNodeProgress';
  import LearningActivityChip from './LearningActivityChip';
  import HybridLearningCardGrid from './HybridLearningCardGrid';
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
      FullScreenSidePanel,
      LearningActivityChip,
      HybridLearningCardGrid,
    },
    mixins: [commonCoreStrings, responsiveWindowMixin],
    setup() {
      const { fetchContentNodeProgress } = useContentNodeProgress();
      return { fetchContentNodeProgress };
    },
    data() {
      return {
        loading: true,
        bookmarks: [],
        more: null,
        sidePanelContent: null,
      };
    },
    computed: {
      footerIcons() {
        return { infoOutline: 'viewInformation', close: 'removeFromBookmarks' };
      },
      currentPage() {
        return PageNames.BOOKMARKS;
      },
    },
    created() {
      ContentNodeResource.fetchBookmarks({ params: { limit: 25, available: true } }).then(data => {
        this.more = data.more;
        this.bookmarks = data.results ? data.results.map(normalizeContentNode) : [];
        this.loading = false;
        this.fetchContentNodeProgress({ ids: this.bookmarks.map(b => b.id) });
      });
    },
    methods: {
      ...mapActions(['createSnackbar']),
      genContentLink,
      loadMore() {
        if (!this.loading) {
          this.loading = true;
          ContentNodeResource.fetchBookmarks({ params: this.more }).then(data => {
            this.more = data.more;
            this.bookmarks.push(...data.results.map(normalizeContentNode));
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
