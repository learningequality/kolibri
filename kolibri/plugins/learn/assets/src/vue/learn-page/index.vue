<template>

  <div>
    <page-header title='Learn'>
      <svg slot='icon' role="presentation" fill="#996189" height="24" viewbox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"></path>
        <path d="M0 0h24v24H0z" fill="none"></path>
      </svg>
    </page-header>
    <expandable-content-grid :contents="recommendations"></expandable-content-grid>
  </div>

</template>


<script>

  module.exports = {
    components: {
      'page-header': require('../page-header'),
      'expandable-content-grid': require('../expandable-content-grid'),
    },
    vuex: {
      getters: {
        recommendations: state => state.pageState.recommendations,
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
