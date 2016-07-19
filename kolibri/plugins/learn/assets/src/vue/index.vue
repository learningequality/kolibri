<template>

  <core-base>

    <div class='main'>

      <error-page class='error' v-show='error'></error-page>
      <side-nav class='nav'></side-nav>

      <main role="main" class="page-content" v-if='!loading'>
        <button class='search-btn' :class="{ active: searchOpen }" @click='toggleSearch'>
          <svg height="24" viewbox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"></path>
            <path d="M0 0h24v24H0z" fill="none"></path>
          </svg>
        </button>

        <explore-page v-if='showExplorePage'></explore-page>
        <content-page v-if='showContentPage'></content-page>
        <learn-page v-if='showLearnPage'></learn-page>
        <scratchpad-page v-if='showScratchpadPage'></scratchpad-page>
      </main>

      <div v-show='searchOpen' class="pane-offset" transition='slide'>
        <search-widget
          class='search-pane'
          :show-topics="exploreMode">
        </search-widget>
      </div>
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
  const actions = require('../actions');

  module.exports = {
    components: {
      'core-base': require('core-base'),
      'side-nav': require('./side-nav'),
      'search-widget': require('./search-widget'),
      'explore-page': require('./explore-page'),
      'content-page': require('./content-page'),
      'learn-page': require('./learn-page'),
      'scratchpad-page': require('./scratchpad-page'),
      'error-page': require('./error-page'),
    },
    computed: {
      showExplorePage() {
        return this.pageName === PageNames.EXPLORE_ROOT || this.pageName === PageNames.EXPLORE_TOPIC;
      },
      showContentPage() {
        return this.pageName === PageNames.EXPLORE_CONTENT ||
          this.pageName === PageNames.LEARN_CONTENT;
      },
      showLearnPage() {
        return this.pageName === PageNames.LEARN_ROOT;
      },
      showScratchpadPage() {
        return this.pageName === PageNames.SCRATCHPAD;
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
        loading: state => state.loading,
        error: state => state.error,
      },
      actions: {
        toggleSearch: actions.toggleSearch,
      },
    },
    store, // make this and all child components aware of the store
  };

</script>


<style lang="stylus" scoped>

  @require '~core-theme.styl'
  @require 'learn.styl'

  .main
    position: fixed // must be fixed for ie10
    overflow-y: scroll
    height: 100%
    width: 100%

  .nav
    position: fixed
    top: 0
    left: 0
    width: $nav-bar-width
    height: 100%
    z-index: 2

  .search-btn
    // position search button to always be in the right-hand margin
    $offset = $nav-bar-width + $nav-bar-padding + ($right-margin / 3)
    left: $card-width + $offset
    for $n-cols in $n-cols-array
      $grid-width = grid-width($n-cols)
      @media (min-width: breakpoint($grid-width))
        left: $grid-width + $offset

    position: fixed
    top: 1rem
    z-index: 1
    border: none

    height: 36px
    width: 36px

    svg
      fill: $core-action-normal
    &.active
      background-color: $core-action-normal
      svg
        fill: #FFFFFF

  .pane-offset
    padding-left: $nav-bar-width + ($nav-bar-padding / 2)
    position: fixed
    top: 0
    left: 0
    height: 100%
    width:100%

  .search-pane
    overflow-y: scroll
    height: 100%
    width: 100%
    padding-left: ($nav-bar-padding / 2)
    box-shadow: 0 0 6px #ddd

  .slide-transition
    transition: transform $core-time ease-out

  .slide-enter, .slide-leave
    transform: translateX(100vw)

  .page-content
    margin-left: $nav-bar-width + $nav-bar-padding
    margin-right: $right-margin
    margin-bottom: 50px
    width-auto-adjust()

  .error
    margin-left: $nav-bar-width + $nav-bar-padding
    margin-right: $right-margin

</style>


<style lang="stylus">

  /* WARNING - unscoped styles.
   * control all scrolling from vue.  */
  html
    overflow: hidden

</style>
