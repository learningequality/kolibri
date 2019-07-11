<template>

  <div class="content">
    <SideNav />
    <div :style="{ marginLeft: `${navWidth+32}px` }">
      <router-view />
    </div>
  </div>

</template>


<script>

  import SideNav from './shell/SideNav';
  import navWidth from './navWidth';

  export default {
    name: 'StyleGuideIndex',
    components: {
      SideNav,
    },
    created() {
      this.navWidth = navWidth;
    },
  };

</script>


<style lang="scss" scoped>

  .content {
    background-color: white;
  }

</style>


<style lang="scss">

  /* NOT SCOPED */

  // match Prism font family
  code {
    font-family: Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace;
    font-size: smaller;
    white-space: nowrap;
  }

  a {
    color: #368d74;
    transition: all 0.25s ease;
    &:hover {
      color: #26614d;
    }
  }

  *::selection {
    background: #f0e7ed;
  }

</style>
