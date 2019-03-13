<template>

  <CoreBase fullScreen>
    <SideNav />
    <router-view class="content" />
  </CoreBase>

</template>


<script>

  import CoreBase from 'kolibri.coreVue.components.CoreBase';
  import SideNav from './shell/SideNav';

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
    margin-top: 24px;
    margin-right: auto;
    margin-left: $sidenav-width + 32;
  }

</style>


<style lang="scss">

  // NOT SCOPED  - match Prism font family
  code {
    font-family: Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace;
    font-size: smaller;
    white-space: nowrap;
  }

</style>
