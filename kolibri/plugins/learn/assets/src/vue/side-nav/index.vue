<template>

  <div class="nav-spacer"></div>
  <nav class="side-nav" role="navigation" aria-label="Main user navigation">
    <ul>
      <a v-link="learnLink" @click='closeSearch' :class="learnClass">
        <li>
          <span>
            <svg role="presentation" height="40" width="40" viewbox="0 0 24 24" src="../icons/learn.svg"></svg>
            Learn
          </span>
        </li>
      </a>
      <a v-link="exploreLink" @click='closeSearch' :class="exploreClass">
        <li>
          <span>
            <svg role="presentation" height="40" width="40" viewbox="0 0 24 24" src="../icons/explore.svg"></svg>
            Explore
          </span>
        </li>
      </a>
    </ul>
  </nav>

</template>


<script>

  const pageMode = require('../../state/getters').pageMode;
  const constants = require('../../state/constants');
  const actions = require('../../actions');

  module.exports = {
    vuex: {
      getters: {
        pageMode,
        searchOpen: state => state.searchOpen,
      },
      actions: {
        // TODO - this logic should really be triggered purely by the vue router.
        // however since the URL doesn't change when the user is on the root,
        // this is currently to close the search pane.
        closeSearch(store) {
          if (this.searchOpen) {
            actions.toggleSearch(store);
          }
        },
      },
    },
    computed: {
      learnLink() {
        return { name: constants.PageNames.LEARN_ROOT };
      },
      learnClass() {
        return { active: this.pageMode === constants.PageModes.LEARN };
      },
      exploreLink() {
        return { name: constants.PageNames.EXPLORE_ROOT };
      },
      exploreClass() {
        return { active: this.pageMode === constants.PageModes.EXPLORE };
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~core-theme.styl'
  @require '../learn'

  $nav-element-height = 150px
  $font-size = 1em

  .side-nav
    background: $core-bg-light
    text-align: center
    font-size: $font-size
    font-weight: 300
    overflow: hidden
    position: fixed
    z-index: 2
    @media screen and (orientation: landscape)
      height: 100%
      top: 0
      left: 0
      width: $nav-bar-width
    @media screen and (orientation: portrait)
      bottom: 0
      width: 100%
      height: auto
      display: table
      font-size: 10px

  .nav-spacer
    height: 0
    @media screen and (orientation: portrait)
      height: 40px

  ul
    margin: 0
    padding: 0
    list-style-type: none
    box-sizing: border-box
    overflow: hidden
    @media screen and (orientation: portrait)
      display: table-row

  li
    display: inline-block
    height: $nav-element-height
    @media screen and (orientation: portrait)
      height: auto
      width: 60px

  span
    display: table-cell
    vertical-align: middle
    position: relative
    transform: translateY(50%)
    @media screen and (orientation: portrait)
      transform: none
      width: 0
      padding-top: 2px

  a
    display: inline-block
    margin: 0
    padding: 0
    @media screen and (orientation: portrait)
      display: table-cell

  a.active
    color: $core-bg-light
    background: $core-action-normal

  svg
    fill: $core-action-normal
    transition: fill $core-time ease-out
    @media screen and (orientation: portrait)
      height: 30px
      margin-bottom: -2px

  a:hover svg
    fill: $core-action-dark

  a.active svg
    fill: $core-bg-light

  a.active:hover svg
    fill: $core-bg-light

</style>
