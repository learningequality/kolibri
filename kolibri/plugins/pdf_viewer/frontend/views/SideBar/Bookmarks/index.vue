<template>

  <ul
    class="bookmarks-wrapper"
    :aria-label="$tr('bookmarksSection')"
  >
    <BookmarkItem
      v-for="(item, index) in outline"
      :key="index"
      :item="item"
      :goToDestination="goToDestination"
      :focusDestPage="focusDestPage"
    />
  </ul>

</template>


<script>

  import BookmarkItem from './BookmarkItem';

  export default {
    name: 'Bookmarks',
    components: {
      BookmarkItem,
    },
    props: {
      outline: {
        type: Array,
        required: true,
      },
      goToDestination: {
        type: Function,
        required: true,
      },
      focusDestPage: {
        type: Function,
        required: true,
      },
    },
    $trs: {
      bookmarksSection:
        'Bookmarks section. You can switch between the pdf document and bookmarks section pressing shift + enter.',
    },
  };

</script>


<style lang="scss" scoped>

  .bookmarks-wrapper {
    padding: 32px 16px;
    margin: 0;
  }

</style>
