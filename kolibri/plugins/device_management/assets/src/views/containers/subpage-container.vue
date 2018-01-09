<template>

  <div class="subpage-container" :class="{ 'side-margin': withSideMargin }">
    <div class="wrapper">
      <slot></slot>
    </div>
  </div>

</template>


<script>

  export default {
    props: {
      // set to true to match margins of core-base
      withSideMargin: {
        type: Boolean,
        default: false,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .side-margin
    // to match .content-container in core-base
    margin-left: 2em
    margin-right: 2em

  .subpage-container
    padding: 1em 2em
    padding-bottom: 3em
    margin-top: 2em
    border-radius: 4px
    background-color: $core-bg-light
    overflow-x: auto

  .wrapper
    min-width: 600px

</style>
