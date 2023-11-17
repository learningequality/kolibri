<template>

  <div
    class="card container drop-shadow"
  >
    <KGrid>
      <KGridItem
        :layout12="{ span: 4 }"
        :layout8="{ span: 2 }"
        class="thumb-area"
        :style="bookMarkBackgroundColor"
      >
        <BookmarkIcon style="margin-top:-15px;margin-left:-30px" />
      </KGridItem>

      <KGridItem
        :layout12="{ span: 8 }"
        :layout8="{ span: 6 }"
        class="text-area"
      >
        <a :style="{ color: $themeTokens.primary }">
          <p style="font-weight:600;">{{ bookmarksLabel$() }}</p>
          <span> {{ numberOfSelectedBookmarks$({ count: numberOfBookMarkedResources }) }}</span>
        </a>
      </KGridItem>
    </KGrid>
  </div>

</template>


<script>

  import { enhancedQuizManagementStrings } from 'kolibri-common/strings/enhancedQuizManagementStrings';
  import { ContentNodeResource } from 'kolibri.resources';
  import BookmarkIcon from './../LessonResourceSelectionPage/LessonContentCard/BookmarkIcon.vue';

  export default {
    name: 'BookMarkedResource',
    components: {
      BookmarkIcon,
    },
    setup() {
      const { numberOfSelectedBookmarks$, bookmarksLabel$ } = enhancedQuizManagementStrings;

      return {
        numberOfSelectedBookmarks$,
        bookmarksLabel$,
      };
    },
    data() {
      return {
        bookmarks: [],
        numberOfBookMarkedResources: null,
      };
    },
    computed: {
      bookMarkBackgroundColor() {
        return {
          backgroundColor: this.$themePalette.grey.v_100,
        };
      },
    },
    created() {
      ContentNodeResource.fetchBookmarks({ params: { limit: 25, available: true } }).then(data => {
        this.bookmarks = data.results ? data.results : [];
        this.numberOfBookMarkedResources = this.bookmarks.length;
      });
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  $footer-height: 36px;
  $h-padding: 24px;
  $v-padding: 16px;

  .drop-shadow {
    @extend %dropshadow-1dp;

    &:hover {
      @extend %dropshadow-8dp;
    }
  }

  .container {
    padding: $v-padding $h-padding;
    margin-top: $h-padding;
  }

  .card {
    position: relative;
    vertical-align: top;
    border-radius: 8px;
    transition: box-shadow $core-time ease;

    &:focus {
      outline-width: 4px;
      outline-offset: 6px;
    }
  }

  .card-link {
    display: block;
    width: 100%;
    text-decoration: none;
  }

  .thumb-area {
    margin-bottom: 16px;
  }

  .text-area {
    margin-bottom: $footer-height;
  }

</style>
