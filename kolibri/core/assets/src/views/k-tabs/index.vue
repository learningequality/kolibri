<template>

  <nav class="tabs">
    <ul>
      <slot/>
    </ul>
  </nav>

</template>


<script>

  export default {
    name: 'k-tabs',
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
