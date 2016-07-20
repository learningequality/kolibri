<template>

  <nav class="main" role="navigation" aria-label="Main user navigation">
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

  .main
    background: $core-bg-light
    text-align: center
    font-size: $font-size
    font-weight: 300
    overflow: hidden

  ul
    margin: 0
    padding: 0
    list-style-type: none

  li
    display: table
    height: $nav-element-height

  span
    display: table-cell
    vertical-align: middle

  a
    display: block
    margin: 0
    padding: 0

  a.active
    color: $core-bg-light
    background: $core-action-normal

  svg
    fill: $core-action-normal
    transition: fill $core-time ease-out

  a:hover svg
    fill: $core-action-dark

  a.active svg
    fill: $core-bg-light

  a.active:hover svg
    fill: $core-bg-light

</style>
