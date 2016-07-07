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

    <div class="page-wrapper">
      <explore-page v-if='showExplorePage'></explore-page>
      <content-page v-if='showContentPage'></content-page>
      <learn-page v-if='showLearnPage'></learn-page>
      <scratchpad-page v-if='showScratchpadPage'></scratchpad-page>
    </div>

    <!-- this is not used, but necessary for vue-router to function -->
    <router-view></router-view>

  </core-base>

</template>


<script>

  const constants = require('../constants');
  const PageNames = constants.PageNames;

  module.exports = {
    mixins: [constants], // makes constants available in $options
    components: {
      'core-base': require('core-base'),
      'explore-page': require('./explore-page'),
      'content-page': require('./content-page'),
      'learn-page': require('./learn-page'),
      'scratchpad-page': require('./scratchpad-page'),
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
        pageMode: state => state.pageMode,
        pageName: state => state.pageName,
      },
    },
    // make this and all child components aware of the store
    store: require('../store'),
  };

</script>


<style lang="stylus" scoped>

  @require '~core-theme.styl'

  // Navbar styling
  $nav-bar-width = 80
  $nav-element-height = 150
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

  a.v-link-active:hover
    svg
      fill: $core-bg-light

  // Page wrapper styling
  .page-wrapper
    margin-left: $nav-bar-width

</style>


<style lang="stylus">

  // these styles are namespaced because they're not scoped
  .learn-page
    .card-list
      overflow: hidden
      display: block
      margin-left: -10px

    .card-list .card
      float: left
      margin: 10px

</style>
