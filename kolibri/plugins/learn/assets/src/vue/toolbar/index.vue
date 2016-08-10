<template>

  <div v-scroll='onScroll' v-bind:class="['toolbar-show', displaytoolbar ? 'toolbar-hide' : '' ]" >
    <breadcrumbs class="breadcrumbs"></breadcrumbs>
    <search-button class='search-btn'></search-button>
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
    vuex: {
      getters: {
        rootTopicId: state => state.rootTopicId,
        topic: state => state.pageState.topic,
        isRoot: (state) => state.pageState.topic.id === state.rootTopicId,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~core-theme.styl'

  .breadcrumbs
    position: relative
    display: table-cell
    vertical-align: middle
    left: 120px
    @media screen and (max-width: $portrait-breakpoint)
      left: 3rem

  .toolbar-show
    position: fixed
    display: table
    left: -20px
    top: 0
    width: 100%
    height: 42px
    background: $core-bg-canvas
    z-index: 100
    transition: top 0.2s ease-in-out

  .toolbar-hide
    position: fixed
    display: table
    left: -20px
    top: -40px

  .search-btn
    position: absolute
    top: 0.6rem
    right: 2rem
    z-index: 1
    @media screen and (max-width: $portrait-breakpoint)
      right: 1rem

</style>
