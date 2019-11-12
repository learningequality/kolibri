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

  import state from '../state';
  import SideNav from './common/SideNav';

  export default {
    name: 'StyleGuideIndex',
    components: {
      SideNav,
    },
    computed: {
      navWidth() {
        return state.navWidth;
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import './common/globals';

  .content {
    padding-left: 32px;
    border-left: 1px solid $border-color;
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

  @import './common/globals';

  // match Prism font family
  code {
    font-family: $code-font-stack;
    color: $code-color;
    white-space: nowrap;
  }

  a code {
    color: $link-color;
    &:hover {
      color: $link-hover-color;
    }
  }

  a {
    display: inline-block; // prevents trailing spaces
    color: $link-color;
    transition: $basic-transition;

    svg {
      fill: $link-color;
      transition: $basic-transition;
    }

    &:hover {
      color: $link-hover-color;
      svg {
        fill: $link-hover-color;
      }
    }
  }

  *:focus {
    outline-color: #757575;
  }

  *::selection {
    background: $selection-color;
  }

  body {
    background-color: white;
  }

</style>
