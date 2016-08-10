<template>

  <div v-scroll='onScroll' v-bind:class="['toolbar-show', displaytoolbar ? 'toolbar-hide' : '' ]" >
    <breadcrumbs class="breadcrumbs"></breadcrumbs>
    <search-button class='search-btn'></search-button>
  </div>

</template>


<script>

  module.exports = {

    props: {
      displaytoolbar: {
        type: Boolean,
        required: true,
      },
    },
    components: {
      'search-widget': require('../search-widget'),
      'search-button': require('../search-widget/search-button'),
      'breadcrumbs': require('../breadcrumbs'),
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
  .breadcrumbs
    left: 200px
    position: relative
  .search-btn
    position: absolute
    top: 0.4rem
    right: 2rem
    z-index: 1
    @media screen and (max-width: $portrait-breakpoint)
      right: 1rem

</style>
