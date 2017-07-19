<template>

  <div>
    <sidenav/>
    <router-view class="content"/>
  </div>

</template>


<script>

  import FullVue from 'vue/dist/vue.common';
  import VueRouter from 'vue-router';
  import sidenav from './shell/sidenav';

  // To illustrate how user-facing text should always be translated, we will
  // set up a fake $tr, and use it in the code example.
  FullVue.prototype.$tr = text => text;

  // Some components (e.g. <tab-link>) need the router.
  FullVue.use(VueRouter);

  export default {
    components: {
      sidenav,
    },
  };

</script>


<style lang="stylus">

  @import '../styles/style-guide.styl'
  @import '~vuep/dist/vuep.css'


  // Reset some of the styles inherited from the main Kolibri theme.
  // TODO: Remove that inheritance and have a clean slate style-wise.
  html, body
    height: auto
    background: white
    font-size: 14px
    color: #424242

  html
    overflow: initial

  .content
    margin-left: $sidenav-width
    padding: 2em
    line-height: 1.3em

    h1
      line-height: 1.7em

    h1, h2, h3
      color: #333

    h2, h3
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


    table, th, td
      border: 1px solid darkgray
      border-collapse: collapse

    th, td
      padding: 0.5em

    th
      background: #e0e0e0
      text-align: left

  .vuep
    display: initial
    height: initial

    .vuep-preview, .vuep-editor
      width: 100%

    .vuep-preview
      padding: 0.5em

</style>
