<template>

  <div>
    <div class="side-bar">
      <div class="side-bar-header">
        <slot name="sideBarHeader"></slot>
      </div>

      <div class="side-bar-main">
        <slot name="sideBarMain"></slot>
      </div>
    </div>
  </div>

</template>


<script>

  export default {
    name: 'SideBar',
  };

</script>


<style lang="scss" scoped>

  .side-bar {
    position: relative;
    width: 100%;
    height: 100%;
  }

  .side-bar-header {
    position: absolute;
    top: 0;
    right: 0;
    left: 0;
    overflow: hidden;
  }

  .side-bar-main {
    position: absolute;
    top: 41px;
    right: 0;
    bottom: 0;
    left: 0;
    overflow-y: auto;
    font-size: smaller;
  }

</style>
