<template>

  <CoreBase fullScreen>
    <SideNav />
    <router-view class="content" />
  </CoreBase>

</template>


<script>

  import FullVue from 'vue/dist/vue.common';
  import VueRouter from 'vue-router';
  import CoreBase from 'kolibri.coreVue.components.CoreBase';
  import SideNav from './shell/SideNav';

  // To illustrate how user-facing text should always be translated, we will
  // set up a fake $tr, and use it in the code example.
  FullVue.prototype.$tr = text => text;

  // Some components (e.g. <KNavbarLink>) need the router.
  FullVue.use(VueRouter);

  export default {
    name: 'StyleGuideIndex',
    components: {
      SideNav,
      CoreBase,
    },
  };

</script>


<style lang="scss" scoped>

  @import '../styles/style-guide';

  .content {
    max-width: 50em;
    margin-top: 24px;
    margin-right: auto;
    margin-left: $sidenav-width + 32;
  }

</style>


<style lang="scss">

  // NOT SCOPED

  // Reset some of the styles inherited from the main Kolibri theme.
  // TODO: Remove that inheritance and have a clean slate style-wise.
  html,
  body {
    height: auto;
    font-size: 14px;
    color: #424242;
    background: white;
  }

  html {
    overflow: initial;
  }

  code {
    padding: 4px;
    font-size: smaller;
    color: #268bd2;
    white-space: nowrap;
    background: rgba(253, 246, 227, 0.5);
  }

  @import '~vuep/dist/vuep.css';
  @import '~kolibri.styles.definitions';

  .vuep {
    // TODO: vuep pullutes the font-family
    @include font-family-noto;

    display: initial;
    height: initial;

    .vuep-preview,
    .vuep-editor {
      width: 100%;
    }

    .vuep-preview {
      padding: 8px;
    }
  }

</style>
