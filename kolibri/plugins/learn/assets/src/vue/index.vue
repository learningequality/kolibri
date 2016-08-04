<template>

  <core-base>
    <side-nav class='nav'></side-nav>
    <div class='main'>
      <search-button class='search-btn'></search-button>

      <error-page v-show='error'></error-page>

      <select v-model="currentChannel" v-on:change="switchChannel($event)">
        <option v-for="channel in channels" :value="channel.id">
          {{ channel.name }}
        </option>
      </select>

      <main role="main" class="page-content" v-if='!loading'>
        <explore-page v-if='showExplorePage'></explore-page>
        <content-page v-if='showContentPage'></content-page>
        <learn-page v-if='showLearnPage'></learn-page>
        <scratchpad-page v-if='showScratchpadPage'></scratchpad-page>
      </main>

      <div class='search-pane' v-show='searchOpen' transition='search-slide'>
        <div class='search-shadow'>
          <search-widget
            :show-topics="exploreMode">
          </search-widget>
        </div>
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

  module.exports = {
    components: {
      'core-base': require('core-base'),
      'side-nav': require('./side-nav'),
      'search-widget': require('./search-widget'),
      'search-button': require('./search-widget/search-button'),
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
      channels() {
        // get an array of channels ids and names
        const channels = global.channels;
        return channels;
      },
      currentChannel() {
        // get current channel id
        return this.currentChannelId;
      },
    },
    methods: {
      switchChannel(event) {
        const newChannelId = event.target.value;
        console.log(`Switch to channel with id: ${newChannelId}`);
        this.$router.go(`${newChannelId}`);
      },
    },
    vuex: {
      getters: {
        pageMode: getters.pageMode,
        pageName: state => state.pageName,
        searchOpen: state => state.searchOpen,
        loading: state => state.loading,
        error: state => state.error,
        currentChannelId: state => state.currentChannelId,
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
    padding-left: $left-margin
    padding-right: $right-margin
    padding-bottom: 50px
    @media screen and (max-width: $portrait-breakpoint)
      padding-left: $card-gutter * 2
      padding-right: $card-gutter
      padding-bottom: 100px

  .search-btn
    position: fixed
    top: 1rem
    right: 2rem
    z-index: 1
    @media screen and (max-width: $portrait-breakpoint)
      right: 1rem

  .search-pane
    background-color: $core-bg-canvas
    overflow-y: scroll
    position: fixed
    top: 0
    left: 0
    height: 100%
    width: 100%
    padding-left: $left-margin
    @media screen and (max-width: $portrait-breakpoint)
      padding-left: 0
      margin-left: $card-gutter

  .search-shadow
    padding-right: $right-margin
    box-shadow: 0 0 6px #ddd
    min-height: 100%

  .search-slide-transition
    transition: transform $core-time ease-out

  .search-slide-enter, .search-slide-leave
    transform: translateX(100vw)

  .page-content
    margin: auto
    padding-right: $card-gutter // visible right-margin in line with grid
    width-auto-adjust()

</style>


<style lang="stylus">

  /* WARNING - unscoped styles.
   * control all scrolling from vue.  */
  html
    overflow: hidden

</style>
