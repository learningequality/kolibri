<template>

  <core-base class="learn-page">

    <nav id="learn-nav">
      <ul>
        <a
          v-link="{ name: $options.PageNames.LEARN_ROOT }"
          :class='{active: pageMode === $options.PageModes.LEARN}'
        >
          <li><span>
          <svg fill="#000000" height="40" viewbox="0 0 24 24" width="40" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"></path>
            <path d="M0 0h24v24H0z" fill="none"></path>
          </svg>
          Learn
          </span></li>
        </a>
        <a
          v-link="{ name: $options.PageNames.EXPLORE_ROOT }"
          :class='{active: pageMode === $options.PageModes.EXPLORE}'
        >
          <li><span>
          <svg fill="#000000" height="40" viewbox="0 0 24 24" width="40" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 10.9c-.61 0-1.1.49-1.1 1.1s.49 1.1 1.1 1.1c.61 0 1.1-.49 1.1-1.1s-.49-1.1-1.1-1.1zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm2.19 12.19L6 18l3.81-8.19L18 6l-3.81 8.19z"></path>
            <path d="M0 0h24v24H0z" fill="none"></path>
          </svg>
          Explore
          </span></li>
        </a>
      </ul>
    </nav>

    <!-- accounts for margin offset by navbar -->
    <div>

      <div class="page-content" v-if="!loading && !error">
        <explore-page v-if='showExplorePage'></explore-page>
        <content-page v-if='showContentPage'></content-page>
        <learn-page v-if='showLearnPage'></learn-page>
        <scratchpad-page v-if='showScratchpadPage'></scratchpad-page>
      </div>

      <div v-else class="page-error">
        <error-page></error-page>
      </div>

      <!-- this is not used, but necessary for vue-router to function -->
      <router-view></router-view>

    </div>

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
        return this.pageName === PageNames.EXPLORE_CONTENT;
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
  @require 'learn'

  // Navbar styling
  $nav-element-height = 150px
  $font-size = 1em

  #learn-nav
    position: fixed
    top: 0
    left: 0
    width: $nav-bar-width
    height: 100%
    background: $core-bg-light
    text-align: center
    font-size: $font-size
    font-weight: 300
    overflow: hidden
    z-index: 1

  ul
    margin: 0
    padding: 0
    list-style-type: none

  a:hover
    svg
      fill: $core-action-dark

  a
    display: block
    margin: 0
    padding: 0

  li
    display: table
    height: $nav-element-height

  span
    display: table-cell
    vertical-align: middle

  svg
    fill: $core-action-normal

  // this class is automatically added to links with the v-link directive
  a.active
    color: $core-bg-light
    background: $core-action-normal

    svg
      fill: $core-bg-light

  a.active:hover
    svg
      fill: $core-bg-light

  // Page wrapper styling
  div
    margin-left: $nav-bar-width

  .page-content
  .page-error
    margin: auto
    width-auto-adjust()

</style>


<style lang="stylus"></style>
