<template>

  <div>
    <SideNav />
    <div :style="{ marginLeft: `${navWidth}px` }" class="content">
      <transition name="fade">
        <router-view />
      </transition>
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
    padding-left: 32px;
    border-left: 1px solid #dedede;
  }

  .fade-enter-active,
  .fade-leave-active {
    transition: opacity 0.1s;
  }
  .fade-enter,
  .fade-leave-to {
    opacity: 0;
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

    svg {
      fill: #368d74;
      transition: fill 0.25s ease;
    }

    &:hover {
      color: #26614d;
      svg {
        fill: #26614d;
      }
    }
  }

  *::selection {
    background: #f0e7ed;
  }

  body {
    background-color: white;
  }

</style>
