<template>

  <core-base class="learn-page">

    <!-- see router.js -->
    <router-view></router-view>

    <nav id="learn-nav">
      <a v-link="{ path: '/learn', exact: true }">Learn</a> |
      <a v-link="{ path: '/learn/content', exact: true }">Learn Content</a> |
      <a v-link="{ path: '/explore', exact: true }">Explore</a> |
      <a v-link="{ path: '/explore/content', exact: true }">Explore Content</a>
    </nav>

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
    padding: 10% 0

  // this class is automatically added to links with the v-link directive
  .v-link-active
    cursor: default
    color: $core-text-annotation

</style>


<style lang="stylus">

  // these styles are namespaced because they're not scoped
  .learn-page
    .card-list
      overflow: hidden
      display: block
      margin-left: -10px

    .card-list .card
      float: left
      margin: 10px

</style>
