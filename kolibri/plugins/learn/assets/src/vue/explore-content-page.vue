<template>

  <div>
    <breadcrumbs :crumbs="breadcrumbs.crumbs" :current="breadcrumbs.current"></breadcrumbs>
    <content-page-general
      :pk="pk"
    ></content-page-general>
  </div>

</template>


<script>

  module.exports = {
    components: {
      'breadcrumbs': require('./breadcrumbs'),
      'content-page-general': require('./content-page-general'),
    },
    vuex: {
      getters: {
        // better practice would be to define vuex getter functions globally
        breadcrumbs: (state) => state.breadcrumbs,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~core-theme.styl'

  .rec-grid content-card img
    max-width: 250px
    max-height: 250px
    margin: 0 15px 0 0

  .rec-grid
    display: inline-block

  .obama
    background: pink
    width: 80%
    height: 400px
    text-align: center

</style>
