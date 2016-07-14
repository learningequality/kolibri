<template>

  <expandable-content-grid
    title="Recommended"
    :contents="recommendations"
  ></expandable-content-grid>

</template>


<script>

  module.exports = {
    components: {
      'expandable-content-grid': require('../expandable-content-grid'),
    },
    vuex: {
      getters: {
        recommendations: state => state.pageState.recommendations,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  .button-wrapper
    text-align: center

</style>
