<template>

  <ul class="bookmarks-wrapper">
    <BookmarkItem
      v-for="(item, index) in outline"
      :key="index"
      :item="item"
      :goToDestination="goToDestination"
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
    },
  };

</script>


<style scoped lang="scss">

  .bookmarks-wrapper {
    padding: 32px 16px;
    margin: 0;
  }

</style>
