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

  .side-bar {
    z-index: 4;
    width: 250px;
    padding: 16px;
    overflow-y: auto;
    font-size: smaller;
    word-wrap: break-word;
    background-color: $core-bg-canvas;
    box-shadow: 0 3px 1px -2px rgba(0, 0, 0, 0.2), 0 2px 2px 0 rgba(0, 0, 0, 0.14),
      0 1px 5px 0 rgba(0, 0, 0, 0.12);
  }

</style>
