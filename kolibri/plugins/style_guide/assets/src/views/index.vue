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


<style lang="stylus">

  @import '~vuep/dist/vuep.css'

  $sidenav-width = 10em

  // Reset some of the styles inherited from the main Kolibri theme.
  // TODO: Remove that inheritance and have a clean slate style-wise.
  html,
  body
    height: auto

  html
    overflow: initial

  body
    padding-left: $sidenav-width

  .sidenav
    position: fixed
    top: 0
    bottom: 0
    left: 0
    right: initial
    overflow-y: auto
    width: $sidenav-width

  .vuep
    flex-direction: column-reverse

    .vuep-preview,
    .vuep-editor
      width: 100%

    .vuep-editor
      height: 50em

</style>
