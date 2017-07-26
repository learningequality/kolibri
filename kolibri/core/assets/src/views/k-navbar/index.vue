<template>

  <nav class="tabs">
    <ul>
      <!-- Pass in 'tab-link' components -->
      <slot/>
    </ul>
  </nav>

</template>


<script>

  export default {
    name: 'k-navbar',
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .tabs
    white-space: nowrap
    overflow-x: auto
    overflow-y: hidden

  ul
    margin: 0
    padding: 0

</style>
