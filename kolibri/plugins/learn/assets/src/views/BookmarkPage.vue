<template>

  <div>

    <h3>{{ $tr('bookmarksHeader') }}</h3>

    <p v-if="!bookmarks.length && !loading">
      {{ $tr('noBookmarks') }}
    </p>

    <template v-else>
      <ContentCard
        v-for="(content, index) in bookmarks"
        :key="content.id"
        class="card"
        :isMobile="windowIsSmall"
        :title="content.title"
        :thumbnail="content.thumbnail"
        :kind="content.kind"
        :isLeaf="content.is_leaf"
        :progress="content.progress || 0"
        :numCoachContents="content.num_coach_contents"
        :link="genContentLink(content.id, content.is_leaf)"
        :contentId="content.content_id"
        :subtitle="bookmarkCreated(content.bookmark.created)"
      >
        <template #actions>
          <KIconButton
            icon="info"
            :tooltip="infoText"
            :ariaLabel="infoText"
            @click="showResourcePanel(content)"
          />
          <KIconButton
            icon="clear"
            :tooltip="removeText"
            :ariaLabel="removeText"
            @click="removeBookmark(content, index)"
          />
        </template>
      </ContentCard>

      <KButton
        v-if="more && !loading"
        :text="coreString('viewMoreAction')"
        @click="loadMore"
      />
      <KCircularLoader
        v-else-if="loading"
        :delay="false"
      />

    </template>
  </div>

</template>


<script>

  import { mapActions } from 'vuex';
  import client from 'kolibri.client';
  import urls from 'kolibri.urls';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import { ContentNodeResource } from 'kolibri.resources';
  import { now } from 'kolibri.utils.serverClock';
  import { PageNames } from '../constants';
  import ContentCard from './ContentCard';

  export default {
    name: 'BookmarkPage',
    metaInfo() {
      return {
        title: this.coreString('bookmarksLabel'),
      };
    },
    components: {
      ContentCard,
    },
    mixins: [commonCoreStrings, responsiveWindowMixin],
    data() {
      return {
        loading: true,
        bookmarks: [],
        more: null,
        resourcePanelNode: null,
        now: now(),
      };
    },
    computed: {
      infoText() {
        return this.coreString('viewInformation');
      },
      removeText() {
        return this.coreString('removeFromBookmarks');
      },
    },
    created() {
      ContentNodeResource.fetchBookmarks({ params: { limit: 25 } }).then(data => {
        this.more = data.more;
        this.bookmarks = data.results;
        this.loading = false;
      });
    },
    mounted() {
      this.timer = setInterval(() => {
        this.now = now();
      }, 10000);
    },
    beforeDestroy() {
      clearInterval(this.timer);
    },
    methods: {
      ...mapActions(['createSnackbar']),
      genContentLink(contentId, isLeaf) {
        const params = { id: contentId };
        if (!isLeaf) {
          return this.$router.getRoute(PageNames.TOPICS_TOPIC, params);
        }
        return this.$router.getRoute(PageNames.TOPICS_CONTENT, params, this.$route.query);
      },
      loadMore() {
        if (!this.loading) {
          this.loading = true;
          ContentNodeResource.fetchBookmarks({ params: this.more }).then(data => {
            this.more = data.more;
            this.bookmarks.push(...data.results);
            this.loading = false;
          });
        }
      },
      removeBookmark(bookmark, index) {
        client({
          method: 'delete',
          url: urls['kolibri:core:bookmarks_delete_by_node_id'](bookmark.id),
        }).then(() => {
          this.bookmarks.pop(index);
          this.createSnackbar(this.$tr('removedNotification'));
        });
      },
      showResourcePanel(bookmark) {
        this.resourcePanelNode = bookmark;
      },
      bookmarkCreated(date) {
        const time = this.$formatRelative(date, { now: this.now });
        return this.coreString('bookmarkedTimeAgoLabel', { time });
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
        context: 'Message indicating that a resource has been removed from the Bookmarks page.',
      },
      noBookmarks: {
        message: 'You have no bookmarked resources',
        context: "Status message in the 'Bookmarks' page when user did not bookmark any resources.",
      },
    },
  };

</script>


<style lang="scss" scoped>

  .card {
    margin: 5px;
  }

</style>
