<template>

  <core-base class="learn-page">

    <side-nav></side-nav>

    <main role="main" class="page-content" v-if='!loading'>
      <explore-page v-if='showExplorePage'></explore-page>
      <content-page v-if='showContentPage'></content-page>
      <learn-page v-if='showLearnPage'></learn-page>
      <scratchpad-page v-if='showScratchpadPage'></scratchpad-page>
      <error-page v-if='error'></error-page>
    </main>

    <!-- this is not used, but necessary for vue-router to function -->
    <router-view></router-view>

  </core-base>

</template>


<script>

  const getters = require('../state/getters');
  const constants = require('../state/constants');
  const store = require('../state/store');
  const PageNames = constants.PageNames;

  module.exports = {
    mixins: [constants], // makes constants available in $options
    components: {
      'core-base': require('core-base'),
      'side-nav': require('./side-nav'),
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
        loading: state => state.loading,
        error: state => state.error,
      },
    },
    store, // make this and all child components aware of the store
  };

</script>


<style lang="stylus" scoped>

  @require '~core-theme.styl'
  @require 'learn.styl'

  // accounts for margin offset by navbar
  .page-content
    margin-left: $nav-bar-width + $nav-bar-padding
    margin-right: auto
    width-auto-adjust()

</style>


<style lang="stylus"></style>
