<template>

  <core-base>

    <nav id="learn-nav">
      <a v-link="{ path: '/explore', exact: true }">Topic Page</a> |
      <a v-link="{ path: '/recommendations', exact: true }">Recommendation Page</a> |
      <a v-link="{ path: '/content', exact: true }">Content Page</a>
    </nav>

    <!-- see router.js -->
    <router-view></router-view>

  </core-base>

</template>


<script>

  module.exports = {
    components: {
      'core-base': require('core-base'),
    },
    // make this and all child components aware of the store
    store: require('../store'),
  };

</script>


<style lang="stylus" scoped>

  @require '~core-theme.styl'

  #learn-nav
    text-align: center
    font-weight: bold

  // this class is automatically added to links with the v-link directive
  .v-link-active
    cursor: default
    color: $core-text-annotation

</style>


<style lang="stylus">

  @require '~core-theme.styl'

  .card-list
    overflow: hidden
    display: block
    margin-left: -10px

  .card-list .card
    float: left
    margin: 10px

</style>
