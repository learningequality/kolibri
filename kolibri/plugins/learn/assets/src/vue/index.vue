<template>

  <core-base @scroll="handleScroll">
    <toolbar slot="above" :shown="showToolbar"/>

    <component class="content" slot="content" :is="currentPage"/>

    <div slot="below" class="search-pane" v-show="searchOpen" transition="search-slide">
      <search-widget :showTopics="exploreMode"/>
    </div>

    <!-- this is not used, but necessary for vue-router to function -->
    <router-view/>

  </core-base>

</template>


<script>

  const constants = require('../state/constants');
  const PageNames = constants.PageNames;
  const PageModes = constants.PageModes;
  const getters = require('../state/getters');
  const store = require('../state/store');

  module.exports = {
    components: {
      'toolbar': require('./toolbar'),
      'search-widget': require('./search-widget'),
      'explore-page': require('./explore-page'),
      'content-page': require('./content-page'),
      'learn-page': require('./learn-page'),
      'scratchpad-page': require('./scratchpad-page'),
      'content-unavailable-page': require('./content-unavailable-page'),
    },
    data: () => ({
      currScrollTop: 0,
      lastScrollTop: 0,
      delta: 5,
      showToolbar: true,
    }),
    methods: {
      // hide and show the toolbar based on scrolling
      handleScroll(position) {
        this.position = position;
        this.currScrollTop = position.scrollTop;
        if (Math.abs(this.lastScrollTop - this.currScrollTop) <= this.delta) {
          return;
        }
        this.showToolbar = this.currScrollTop < this.lastScrollTop;
        this.lastScrollTop = this.currScrollTop;
      },
    },
    computed: {
      currentPage() {
        if (this.pageName === PageNames.EXPLORE_CHANNEL ||
          this.pageName === PageNames.EXPLORE_TOPIC) {
          return 'explore-page';
        }
        if (this.pageName === PageNames.EXPLORE_CONTENT ||
          this.pageName === PageNames.LEARN_CONTENT) {
          return 'content-page';
        }
        if (this.pageName === PageNames.LEARN_CHANNEL) {
          return 'learn-page';
        }
        if (this.pageName === PageNames.SCRATCHPAD) {
          return 'scratchpad-page';
        }
        if (this.pageName === PageNames.CONTENT_UNAVAILABLE) {
          return 'content-unavailable-page';
        }
        return null;
      },
      exploreMode() {
        return this.pageMode === PageModes.EXPLORE;
      },
    },
    vuex: {
      getters: {
        pageMode: getters.pageMode,
        pageName: state => state.pageName,
        searchOpen: state => state.searchOpen,
      },
    },
    store, // make this and all child components aware of the store
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.coreTheme'
  @require 'learn.styl'

  .search-pane
    background-color: $core-bg-canvas
    overflow-y: scroll
    position: fixed
    top: 0
    left: 0
    height: 100%
    width: 100%
    @media screen and (min-width: $portrait-breakpoint + 1)
      padding-left: $nav-width

  .content
    width-auto-adjust()
    margin: auto

  .search-slide-transition
    transition: transform $core-time ease-out

  .search-slide-enter, .search-slide-leave
    transform: translateX(100vw)

</style>
