<template>

  <div class="side-bar">
    <slot></slot>
  </div>

</template>


<script>

  export default {
    name: 'SideBar',
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';
  @import './EpubStyles';

  .side-bar {
    z-index: 6;
    width: 250px;
    padding: 16px;
    overflow-y: auto;
    word-wrap: break-word;
    background-color: $core-bg-canvas;
    box-shadow: $epub-box-shadow;
  }

</style>
