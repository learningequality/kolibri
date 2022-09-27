<template>
  <ul
    class="bookmarks-wrapper"
    :style="{
      backgroundColor: this.$themePalette.grey.v_100,
      borderRight: `solid 1px ${this.$themeTokens.fineLine}`,
    }"
  >
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
    }
  }
</script>
<style scoped lang="scss">
  .bookmarks-wrapper {
    height: 100%;
    z-index: 2;
    position: relative;
    top: 40px;
    padding: 16px;
    margin: 0;
  }
</style>