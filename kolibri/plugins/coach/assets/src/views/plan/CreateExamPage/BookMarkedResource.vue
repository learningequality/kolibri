<template>

  <div
    class="card container drop-shadow"
  >
    <KRouterLink
      :to="to"
      style="width:100%"
    >
      <KGrid>
        <KGridItem
          :layout12="{ span: 4 }"
          :layout8="{ span: 2 }"
          class="thumb-area"
          style="{ margin:auto }"
          :style="bookMarkBackgroundColor"
        >
          <BookmarkIcon />
        </KGridItem>

        <KGridItem
          :layout12="{ span: 8 }"
          :layout8="{ span: 6 }"
          class="text-area"
        >
          <a :style="{ color: $themeTokens.primary }">
            <p style="font-weight:600;">{{ bookmarksLabel$() }}</p>
            <span> {{ numberOfSelectedBookmarks$({ count: bookMarkedResoures }) }}</span>
          </a>
        </KGridItem>
      </KGrid>

    </KRouterLink>
  </div>

</template>


<script>

  import { enhancedQuizManagementStrings } from 'kolibri-common/strings/enhancedQuizManagementStrings';
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
    props: {
      bookMarkedResoures: {
        type: Number,
        required: true,
      },
      to:{
        type:Object,
        required:true,
      }
    },
    computed: {
      bookMarkBackgroundColor() {
        return {
          backgroundColor: this.$themePalette.grey.v_100,
        };
      },
    },
    mounted(){
      console.log(this.$route.params);
    }
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
    border-radius: 2px;
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

  .text-area {
    margin-bottom: $footer-height;
  }

</style>
