<template>

  <div v-bind:class="['toolbar', displayToolbar ? 'toolbar-hide' : '']" v-show='!searchOpen'>
    <breadcrumbs class="breadcrumbs"></breadcrumbs>
    <channel-switcher></channel-switcher>
    <search-button @scrolling="handleScroll" class="search-btn"></search-button>
  </div>

</template>


<script>

  module.exports = {
    data: () => ({
      currScrollTop: 0,
      lastScrollTop: 0,
      delta: 5,
      displayToolbar: false,
    }),
    components: {
      'search-widget': require('../search-widget'),
      'search-button': require('../search-widget/search-button'),
      'breadcrumbs': require('../breadcrumbs'),
      'channel-switcher': require('./channel-switcher'),
    },
    methods: {
      handleScroll(position) {
        this.position = position;
        this.currScrollTop = position.scrollTop;
        if (Math.abs(this.lastScrollTop - this.currScrollTop) <= this.delta) {
          return;
        }
        this.displayToolbar = this.currScrollTop > this.lastScrollTop;
        this.lastScrollTop = this.currScrollTop;
      },
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

  .toolbar
    position: fixed
    left: -15px
    top: 0
    width: 100%
    height: $learn-toolbar-height
    background: $core-bg-canvas
    z-index: 100
    transition: top 0.2s ease-in-out
    outline: 1px solid $core-bg-canvas // prevent box outline flicking on Chrome

  .toolbar-hide
    position: fixed
    left: -15px
    top: -40px

  .breadcrumbs
    position: relative
    bottom: 22px
    left: 120px
    @media screen and (max-width: $portrait-breakpoint)
      left: 1.3em

  .search-btn
    position: absolute
    top: 0.1rem
    right: 1.2rem
    margin-right: 1em
    z-index: 1
    @media screen and (max-width: $portrait-breakpoint)
      margin-right: -1em

</style>
