<template>

  <div>

    <p v-if="!bookmarks.length && !loading" class="no-bookmarks">
      {{ $tr('noBookmarks') }}
    </p>


    <template v-else>
      <h1 class="bookmarks-header">
        {{ $tr('bookmarksHeader') }}
      </h1>
      <ContentCardGroupGrid
        v-if="bookmarks.length"
        :contents="bookmarks"
        :genContentLink="genContentLink"
        :cardViewStyle="windowIsSmall ? 'card' : 'list'"
        numCols="1"
        :footerIcons="footerIcons"
      />

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

  // import { mapActions } from 'vuex';
  // import client from 'kolibri.client';
  // import urls from 'kolibri.urls';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import { ContentNodeResource } from 'kolibri.resources';
  import genContentLink from '../utils/genContentLink';
  import { normalizeContentNode } from '../modules/coreLearn/utils.js';
  import ContentCardGroupGrid from './ContentCardGroupGrid';

  export default {
    name: 'BookmarkPage',
    metaInfo() {
      return {
        title: this.coreString('bookmarksLabel'),
      };
    },
    components: {
      ContentCardGroupGrid,
    },
    mixins: [commonCoreStrings, responsiveWindowMixin],
    data() {
      return {
        loading: true,
        bookmarks: [],
        more: null,
      };
    },
    computed: {
      footerIcons() {
        return { close: 'removeFromBookmarks', info: 'viewInformation' };
      },
    },
    created() {
      ContentNodeResource.fetchBookmarks({ params: { limit: 25 } }).then(data => {
        this.more = data.more;
        this.bookmarks = data.results.map(normalizeContentNode);
        this.loading = false;
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
          });
        }
      },
      // removeBookmark(bookmark, index) {
      //   client({
      //     method: 'delete',
      //     url: urls['kolibri:core:bookmarks_delete_by_node_id'](bookmark.id),
      //   }).then(() => {
      //     this.bookmarks.pop(index);
      //     this.createSnackbar(this.$tr('removedNotification'));
      //   });
      // },
    },
    $trs: {
      bookmarksHeader: {
        message: 'Bookmarked resources',
        context:
          "Header on the 'Bookmarks' page with the list of the resources user previously saved.",
      },
      // removedNotification: {
      //   message: 'Removed from bookmarks',
      //   context: 'Message indicating that a resource has been removed from the Bookmarks page.',
      // },
      noBookmarks: {
        message: 'You have no bookmarked resources',
        context: "Status message in the 'Bookmarks' page when user did not bookmark any resources.",
      },
    },
  };

</script>


<style lang="scss" scoped>

  .no-bookmarks {
    width: 100%;
    height: 100%;
    padding-top: 170px;
    text-align: center;
  }

  .bookmarks-header {
    margin-bottom: 34px;
    font-size: 24px;
    font-style: normal;
    font-weight: normal;
    line-height: 33px;
  }

</style>
