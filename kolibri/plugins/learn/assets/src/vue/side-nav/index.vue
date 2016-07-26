<template>

  <nav role="navigation" aria-label="Main user navigation">
    <a v-link="learnLink" @click='closeSearch' :class="learnClass">
      <div class='content'>
        <svg role="presentation" height="40" width="40" viewbox="0 0 24 24" src="../icons/learn.svg"></svg>
        <label>Learn</label>
      </div>
    </a>
    <a v-link="exploreLink" @click='closeSearch' :class="exploreClass">
      <div class='content'>
        <svg role="presentation" height="40" width="40" viewbox="0 0 24 24" src="../icons/explore.svg"></svg>
        <label>Explore</label>
      </div>
    </a>
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

  $font-size = 1em
  $nav-size = $left-margin - $card-gutter * 0.5
  $portrait-scale = 0.8

  nav
    background: $core-bg-light
    font-weight: 300
    overflow: hidden
    position: fixed
    z-index: 2
    @media screen and (min-width: $portrait-breakpoint + 1)
      font-size: 1em
      height: 100%
      top: 0
      left: 0
      width: $nav-size px
    @media screen and (max-width: $portrait-breakpoint)
      font-size: $font-size * $portrait-scale
      height: $nav-size * $portrait-scale px
      bottom: 0
      width: 100%

  .content
    align(all)

  a
    margin: 0
    padding: 0
    position: relative
    @media screen and (min-width: $portrait-breakpoint + 1)
      height: 150px
      display: block
    @media screen and (max-width: $portrait-breakpoint)
      height: 100%
      column(1/2)
      padding-bottom: 4px

  a.active
    color: $core-bg-light
    background: $core-action-normal

  label
    display: block
    text-align: center

  svg
    display: block
    margin: auto
    fill: $core-action-normal
    transition: fill $core-time ease-out
    @media screen and (max-width: $portrait-breakpoint)
      height: 30px

  a:hover svg
    fill: $core-action-dark

  a.active svg
    fill: $core-bg-light

  a.active:hover svg
    fill: $core-bg-light

</style>
