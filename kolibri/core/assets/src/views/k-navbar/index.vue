<template>

  <nav class="tabs">
    <ul>
      <!-- Can contain either tab-buttons or tab-links. -->
      <slot/>
    </ul>
  </nav>

</template>


<script>

  /**
    * Used for navigation within a plugin
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
