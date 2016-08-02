<template>

  <div class='link-wrapper'>
    <a class='link' v-link="vlink" @click='closeSearch' :class="{active: active}">
      <div class='content'>
        <slot></slot>
      </div>
    </a>
  </div>

</template>


<script>

  const actions = require('../../actions');

  module.exports = {
    props: {
      vlink: {
        type: Object,
        required: true,
      },
      active: {
        type: Boolean,
        default: false,
      },
    },
    vuex: {
      getters: {
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
  };

</script>


<style lang="stylus" scoped>

  @require '~core-theme.styl'
  @require '../learn'

  .nav-main
    @media screen and (max-width: $portrait-breakpoint)
      display: table-row

  .link-wrapper
    @media screen and (min-width: $portrait-breakpoint + 1)
      display: table-row
    @media screen and (max-width: $portrait-breakpoint)
      display: table-cell

  .link
    margin: 0
    padding: 6px
    vertical-align: middle
    text-align: center
    @media screen and (min-width: $portrait-breakpoint + 1)
      display: table-cell
      height: 150px
    @media screen and (max-width: $portrait-breakpoint)
      display: block

  .link.active
    color: $core-bg-light
    background: $core-action-normal

  .content
    display: inline-block

</style>
