<template>

  <div class="side-bar" :style="{ backgroundColor: $themePalette.grey.v_100 }">
    <slot></slot>
  </div>

</template>


<script>

  export default {
    name: 'SideBar',
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
