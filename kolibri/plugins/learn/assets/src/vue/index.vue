<template>

  <core-base>
    <main-nav slot="nav"></main-nav>
    <toolbar slot="above"></toolbar>
    <component slot="content" :is="currentPage"></component>
    <div slot="below" class='search-pane' v-show='searchOpen' transition='search-slide'>
      <search-widget
        :show-topics="exploreMode">
      </search-widget>
    </div>

    <!-- this is not used, but necessary for vue-router to function -->
    <router-view></router-view>

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
      'core-base': require('core-base'),
      'toolbar': require('./toolbar'),
      'main-nav': require('./main-nav'),
      'search-widget': require('./search-widget'),
      'search-button': require('./search-widget/search-button'),
      'explore-page': require('./explore-page'),
      'content-page': require('./content-page'),
      'learn-page': require('./learn-page'),
      'scratchpad-page': require('./scratchpad-page'),
      'content-unavailable-page': require('./content-unavailable-page'),
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

  @require '~core-theme.styl'
  @require 'learn.styl'

  .search-pane
    background-color: $core-bg-canvas
    overflow-y: scroll
    position: fixed
    top: 0
    left: 0
    height: 100%
    width: 100%
    padding-left: 74px
    @media screen and (max-width: $portrait-breakpoint)
      padding: 0
      padding-right: 15px

  .search-slide-transition
    transition: transform $core-time ease-out

  .search-slide-enter, .search-slide-leave
    transform: translateX(100vw)

</style>
