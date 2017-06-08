<template>

  <div>

    <sidenav class="sidenav"></sidenav>
    <router-view class="content"></router-view>

  </div>

</template>


<script>

  module.exports = {
    components: {
      sidenav: require('./shell/sidenav'),
    }
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  $sidenav-width = 10em
  $component-table-width = 25em

  .component-table
    width: 100%  

  page-section()
    position: absolute
    top: 0
    bottom: 0
    left: 0
    right: 0
    overflow-y: auto

  .sidenav
    page-section()
    right: initial
    width: $sidenav-width

  .content
    page-section()
    left: $sidenav-width

</style>
