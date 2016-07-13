<template>

  <nav id="learn-nav" role="navigation" aria-label="Main user navigation">
    <ul>
      <a v-link="learnLink" :class="learnClass">
        <li>
          <span>
            <svg role="presentation" fill="#000000" height="40" viewbox="0 0 24 24" width="40" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"></path>
              <path d="M0 0h24v24H0z" fill="none"></path>
            </svg>
            Learn
          </span>
        </li>
      </a>
      <a v-link="exploreLink" :class="exploreClass">
        <li>
          <span>
            <svg role="presentation" fill="#000000" height="40" viewbox="0 0 24 24" width="40" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 10.9c-.61 0-1.1.49-1.1 1.1s.49 1.1 1.1 1.1c.61 0 1.1-.49 1.1-1.1s-.49-1.1-1.1-1.1zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm2.19 12.19L6 18l3.81-8.19L18 6l-3.81 8.19z"></path>
              <path d="M0 0h24v24H0z" fill="none"></path>
            </svg>
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

  module.exports = {
    vuex: {
      getters: { pageMode },
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

  a.active
    color: $core-bg-light
    background: $core-action-normal

    svg
      fill: $core-bg-light

  a.active:hover
    svg
      fill: $core-bg-light

</style>
