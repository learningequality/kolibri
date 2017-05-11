<template>

  <nav class="tabs">
    <ul>
      <slot name="items"/>
    </ul>
  </nav>

</template>


<script>

  module.exports = {};

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .tabs
    background-color: white
    white-space: nowrap
    overflow-x: auto
    overflow-y: hidden

  ul
    margin: 0
    padding: 0

</style>
