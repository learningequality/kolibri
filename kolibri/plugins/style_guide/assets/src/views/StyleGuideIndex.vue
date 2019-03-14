<template>

  <CoreBase fullScreen>
    <SideNav class="nav" />
    <div class="content">
      <KPageContainer>
        <router-view />
      </KPageContainer>
    </div>
  </CoreBase>

</template>


<script>

  import CoreBase from 'kolibri.coreVue.components.CoreBase';
  import KPageContainer from 'kolibri.coreVue.components.KPageContainer';
  import SideNav from './shell/SideNav';

  export default {
    name: 'StyleGuideIndex',
    components: {
      SideNav,
      CoreBase,
      KPageContainer,
    },
  };

</script>


<style lang="scss" scoped>

  $nav-width: 220px;

  .nav {
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    width: $nav-width;
    overflow-y: auto;
  }

  .content {
    min-width: 350px;
    padding-right: 32px;
    margin-top: 24px;
    margin-right: auto;
    margin-left: $nav-width + 32;
  }

</style>


<style lang="scss">

  // NOT SCOPED  - match Prism font family
  code {
    font-family: Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace;
    font-size: smaller;
    white-space: nowrap;
  }

  // Duplicate kolibri colors here.
  // Quick hack that can easily be removed by using external link components where appropriate.
  a {
    color: #996189;
    &:hover {
      color: #72486f;
    }
  }

</style>
