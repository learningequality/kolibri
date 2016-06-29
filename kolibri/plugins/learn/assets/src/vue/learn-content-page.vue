<template>

  <div>
    <a v-link="{ path: '/learn', exact: true }">Home</a>
    <content-page-general
      :pk="pk"
    ></content-page-general>
  </div>

</template>


<script>

  module.exports = {
    components: {
      'content-page-general': require('./content-page-general'),
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
