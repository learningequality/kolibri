<template>

  <button
    aria-label="Search"
    class="search-btn"
    @click="toggleSearch"
  >
    <mat-svg category="action" name="search"/>
  </button>

</template>


<script>

  const actions = require('../../actions');

  module.exports = {
    vuex: {
      actions: {
        toggleSearch: actions.toggleSearch,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.coreTheme'

  button
    border: none
    background-color: $core-bg-canvas

    svg
      fill: $core-text-annotation

</style>
