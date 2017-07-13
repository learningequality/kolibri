<template>

  <div>
    <page-header></page-header>
    <sidenav class="sidenav"></sidenav>
    <router-view class="content"></router-view>
  </div>

</template>


<script>

  import FullVue from 'vue/dist/vue.common';
  import VueRouter from 'vue-router';
  import sidenav from './shell/sidenav';
  import pageHeader from './shell/page-header';

  // To illustrate how user-facing text should always be translated, we will
  // set up a fake $tr, and use it in the code example.
  FullVue.prototype.$tr = text => text;

  // Some components (e.g. <tab-link>) need the router.
  FullVue.use(VueRouter);

  export default {
    components: {
      sidenav,
      pageHeader,
    },
  };

</script>


<style lang="stylus">

  @import '../styles/core-theme.styl'
  @import '~vuep/dist/vuep.css'
  @import '~material-design-icons/iconfont/material-icons.css'

  $sidenav-width = 13em

  // Reset some of the styles inherited from the main Kolibri theme.
  // TODO: Remove that inheritance and have a clean slate style-wise.
  html,
  body
    height: auto
    background: white

  html
    overflow: initial

  body
    padding-left: $sidenav-width

  .sidenav
    position: fixed
    top: $page-header-height
    bottom: 0
    left: 0
    right: initial
    overflow-y: auto
    width: $sidenav-width

  .content
    padding: 2em
    padding-top: $page-header-height
    line-height: 1.3em

    h1
      line-height: 1.7em

    h1,
    h2,
    h3
      color: #333

    h2,
    h3
      margin-top: 2em
      margin-bottom: 0.5em

    h4
      margin-bottom: 0.5em

    p
      margin-top: 0
      max-width: 50em

    ul
      margin-top: 0.5em

      li
        margin-bottom: 0.3em

  .vuep
    flex-direction: column-reverse
    margin-top: 1.3em
    height: 1000px

    .vuep-preview,
    .vuep-editor
      width: 100%

    .vuep-preview
      height: 100px
      padding: 10px
      border: none

    .vuep-editor
      height: 100%

  table,
  th,
  td
    border: 1px solid darkgray
    border-collapse: collapse

  th, td
    padding: 0.6em

  th
    background: #e0e0e0
    text-align: left

  // Add some hidden space before all the heading elements with ID, so when we
  // use anchor link to jump to them, they won't be partially obscured by the
  // fixed page header.
  h1, h2, h3, h4
    &[id]:before
      content: ''
      display: block
      visibility: hidden
      height: $page-header-height
      margin-top: (-1 * $page-header-height)

</style>
