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
      :genContentLink="genContentLink"
      :cardViewStyle="windowIsSmall ? 'card' : 'list'"
      numCols="1"
      :footerIcons="footerIcons"
      @removeFromBookmarks="removeFromBookmarks"
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
  </div>

</template>


<script>

  import { mapActions } from 'vuex';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import { ContentNodeResource } from 'kolibri.resources';
  import genContentLink from '../utils/genContentLink';
  import client from 'kolibri.client';
  import urls from 'kolibri.urls';
  import { normalizeContentNode } from '../modules/coreLearn/utils.js';
  import HybridLearningCardGrid from './HybridLearningCardGrid';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import { ContentNodeResource } from 'kolibri.resources';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import { ContentNodeResource } from 'kolibri.resources';
  import client from 'kolibri.client';
  import urls from 'kolibri.urls';
  import { PageNames } from '../constants';
  import { normalizeContentNode } from '../modules/coreLearn/utils.js';

  export default {
    name: 'BookmarkPage',
    metaInfo() {
      return {
        title: this.coreString('bookmarksLabel'),
      };
    },
    components: {
      HybridLearningCardGrid,
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
        return { info: 'viewInformation', close: 'removeFromBookmarks' };
      },
    },
    created() {
      ContentNodeResource.fetchBookmarks({ params: { limit: 25 } }).then(data => {
        this.more = data.more;
        this.bookmarks = data.results ? data.results.map(normalizeContentNode) : [];
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
