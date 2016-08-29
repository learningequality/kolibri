<template>

  <div class="toolbar" :class="{ 'toolbar-hide': !shown }" v-show="!searchOpen">
    <breadcrumbs class="breadcrumbs"></breadcrumbs>
    <div class="table-wrapper">
      <div class="row-wrapper">
        <channel-switcher class="switcher"></channel-switcher>
      </div>
    </div>
    <search-button class="search-btn"></search-button>
  </div>

</template>


<script>

  module.exports = {
    props: {
      shown: {
        type: Boolean,
        default: true,
      },
    },
    components: {
      'search-widget': require('../search-widget'),
      'search-button': require('./search-button'),
      'breadcrumbs': require('../breadcrumbs'),
      'channel-switcher': require('./channel-switcher'),
    },
    vuex: {
      getters: {
        searchOpen: state => state.searchOpen,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~core-theme.styl'
  @require '../learn.styl'

  $avoid-scrollbar = -25px

  .toolbar
    position: fixed
    left: $avoid-scrollbar
    top: 0
    width: 100%
    height: $learn-toolbar-height
    background: $core-bg-canvas
    z-index: 100
    transition: top 0.2s ease-in-out
    outline: 1px solid $core-bg-canvas // prevent box outline flicking on Chrome

  .toolbar-hide
    position: fixed
    left: $avoid-scrollbar
    top: -1 * $learn-toolbar-height

  .breadcrumbs
    position: relative
    bottom: 22px
    left: 120px
    @media screen and (max-width: $portrait-breakpoint)
      left: 1.3em

  .table-wrapper
    display: table
    height: $learn-toolbar-height
    position: absolute
    top: 0
    right: 5rem

  .row-wrapper
    display: table-row

  .switcher
    display: table-cell
    vertical-align: middle

  .search-btn
    height: $learn-toolbar-height
    position: absolute
    top: 0
    width: 36px
    right: 2rem

</style>
