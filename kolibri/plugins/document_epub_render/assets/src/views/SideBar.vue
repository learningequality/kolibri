<template>

  <div class="side-bar" :style="{ backgroundColor: $themePalette.grey.v_100 }">
    <slot></slot>
  </div>

</template>


<script>

  import KThemeMixin from 'kolibri-components/src/mixins/KThemeMixin';

  export default {
    name: 'SideBar',
    mixins: [KThemeMixin],
  };

</script>


<style lang="scss" scoped>

  @import './EpubStyles';

  .side-bar {
    z-index: 3;
    width: 250px;
    padding: 16px;
    overflow-y: auto;
    word-wrap: break-word;
  }

</style>
