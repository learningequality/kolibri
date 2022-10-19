<template>
  <ul class="bookmarks-wrapper">
    <BookmarkItem
      v-for="(item, index) in outline"
      :item="item"
      :key="index"
      :goToDestination="goToDestination"
    />
  </ul>
</template>
<script>
  import BookmarkItem from './item';

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
    created() {
      console.log("Bookmarks created!");
    },
  }
</script>
<style scoped lang="scss">
  .bookmarks-wrapper {
    padding: 32px 16px;
    margin: 0;
  }
</style>