<template>

  <button
    aria-label="Search"
    class='search-btn'
    @click='toggleSearch'
  >
    <svg src="../search-widget/search.svg"></svg>
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

  @require '~core-theme.styl'

  button
    border: none
    background-color: $core-bg-canvas

    svg
      fill: $core-text-annotation

</style>
