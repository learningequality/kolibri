<template>

  <div>
    <sidenav/>
    <router-view/>
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

  // NOT SCOPED

  // Reset some of the styles inherited from the main Kolibri theme.
  // TODO: Remove that inheritance and have a clean slate style-wise.
  html, body
    height: auto
    background: white
    font-size: 14px
    color: #424242

  html
    overflow: initial

</style>
