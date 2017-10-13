<template>

  <nav class="tabs">
    <ul>
      <!-- Contains k-navbar-link components -->
      <slot/>
    </ul>
  </nav>

</template>


<script>

  /**
    * Used for navigation between sub-pages of a top-level Kolibri section
    */

  export default {
    name: 'kNavbar',
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
