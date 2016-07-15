<template>

  <core-base>

    <div class='main'>

      <error-page class='error' v-show='error'></error-page>

      <main role="main" class="page-content" v-if='!loading'>
        <explore-page v-if='showExplorePage'></explore-page>
        <content-page v-if='showContentPage'></content-page>
        <learn-page v-if='showLearnPage'></learn-page>
        <scratchpad-page v-if='showScratchpadPage'></scratchpad-page>
      </main>

      <search-widget class='search-pane' v-show='searchOpen'></search-widget>

      <button class='search-btn' @click='toggleSearch'>
        {{ searchOpen ? '0' : '1' }}
      </button>

      <side-nav class='nav'></side-nav>

    </div>

    <!-- this is not used, but necessary for vue-router to function -->
    <router-view></router-view>

  </core-base>

</template>


<script>

  const PageNames = require('../state/constants').PageNames;
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
    overflow-y: scroll
    position: relative
    height: 100%
    width: 100%

  .nav
    position: fixed
    top: 0
    left: 0
    width: $nav-bar-width
    height: 100%

  .search-btn
    position: fixed
    top: 2em
    right: 2em

  .search-pane
    overflow-y: scroll
    position: fixed
    top: 0
    left: 0
    padding-left: $nav-bar-width + $nav-bar-padding
    height: 100%
    width: 100%

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
