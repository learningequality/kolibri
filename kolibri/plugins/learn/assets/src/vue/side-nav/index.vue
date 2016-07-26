<template>

  <nav role="navigation" aria-label="Main user navigation">
    <div class="nav-row">
      <a v-link="learnLink" @click='closeSearch' :class="learnClass">
        <div class='content'>
          <svg role="presentation" height="40" width="40" viewbox="0 0 24 24" src="../icons/learn.svg"></svg>
          Learn
        </div>
      </a>
      <a v-link="exploreLink" @click='closeSearch' :class="exploreClass">
        <div class='content'>
          <svg role="presentation" height="40" width="40" viewbox="0 0 24 24" src="../icons/explore.svg"></svg>
          Explore
        </div>
      </a>
    </div>
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
  @require 'jeet'

  $nav-element-height = 150px
  $font-size = 1em

  nav
    background: $core-bg-light
    font-size: $font-size
    font-weight: 300
    overflow: hidden
    position: fixed
    z-index: 2
    @media screen and (min-width: $portrait-breakpoint + 1)
      height: 100%
      top: 0
      left: 0
      width: $left-margin - $card-gutter * 0.5
    @media screen and (max-width: $portrait-breakpoint)
      bottom: 0
      width: 100%
      height: auto
      display: table
      font-size: 10px

  .nav-row
    @media screen and (max-width: $portrait-breakpoint)
      display: table-row

  .nav-spacer
    height: 0
    @media screen and (max-width: $portrait-breakpoint)
      height: 40px

  a
    text-align: center
    position: relative
    height: $nav-element-height
    display: block
    margin: 0
    padding: 0
    @media screen and (max-width: $portrait-breakpoint)
      display: table-cell
      height: auto
      padding-bottom: 4px

  .content
    align(vertical)
    @media screen and (max-width: $portrait-breakpoint)
      left: 50%
      transform: translateX(-50%)
      width: 50px
      position: relative

  a.active
    color: $core-bg-light
    background: $core-action-normal

  svg
    fill: $core-action-normal
    transition: fill $core-time ease-out
    @media screen and (max-width: $portrait-breakpoint)
      height: 30px
      margin-bottom: -2px
      margin-top: 2px

  a:hover svg
    fill: $core-action-dark

  a.active svg
    fill: $core-bg-light

  a.active:hover svg
    fill: $core-bg-light

</style>
