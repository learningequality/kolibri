<template>

  <div class="subpage-container" :class="{ 'side-margin': withSideMargin }">
    <div class="wrapper">
      <slot></slot>
    </div>
  </div>

</template>


<script>

  export default {
    name: 'subpageContainer',
    props: {
      // set to true to match margins of core-base
      withSideMargin: {
        type: Boolean,
        default: false,
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  .side-margin {
    margin-right: 2em;
    // to match .content-container in core-base
    margin-left: 2em;
  }

  .subpage-container {
    padding: 1em 2em;
    padding-bottom: 3em;
    margin-top: 2em;
    overflow-x: auto;
    background-color: $core-bg-light;
    border-radius: 4px;
  }

  .wrapper {
    min-width: 600px;
  }

</style>
