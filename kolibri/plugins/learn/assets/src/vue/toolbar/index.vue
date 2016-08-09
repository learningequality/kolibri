<template>

  <div v-bind:class="['toolbar-show', displayToolBar ? 'toolbar-hide' : '' ]" >
    <search-button v-on:scrolling="handleScroll" class='search-btn'></search-button>
  </div>

</template>


<script>

  module.exports = {

    data: () => ({
      currScrollTop: 0,
      delta: 5,
      lastScrollTop: 0,
      displayToolBar: false,
    }),
    components: {
      'search-widget': require('../search-widget'),
      'search-button': require('../search-widget/search-button'),
      'breadcrumbs': require('../breadcrumbs'),
    },
    methods: {
      handleScroll(position) {
        this.position = position;
        this.currScrollTop = position.scrollTop;

        if (Math.abs(this.lastScrollTop - this.currScrollTop) <= this.delta) {
          return;
        }

        if (this.currScrollTop > this.lastScrollTop) {
          this.displayToolBar = true;
        } else {
          this.displayToolBar = false;
        }
        this.lastScrollTop = this.currScrollTop;
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~core-theme.styl'

  .toolbar-show
    position: fixed
    left: 0
    top: 0
    width: 100%
    height: 46px
    background: $core-bg-canvas
    z-index: 100
    transition: top 0.2s ease-in-out

  .toolbar-hide
    position: fixed
    left: 0
    top: -40px
    width: 100%
    height: 46px
    background: $core-bg-canvas
    z-index: 100
    transition: top 0.2s ease-in-out

  .search-btn
    position: absolute
    top: 0.4rem
    right: 2rem
    z-index: 1
    @media screen and (max-width: $portrait-breakpoint)
      right: 1rem

</style>
