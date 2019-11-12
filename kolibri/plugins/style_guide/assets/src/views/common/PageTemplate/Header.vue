<template>

  <div
    class="header"
    :class="{ fixed: scrolled }"
    :style="style"
  >
    <h1 class="header-text">
      <slot></slot>
      <a href="#" @click.native="scrollToTop">
        <file-svg class="icon-link" src="../SectionLink/link.svg" />
        <span class="visuallyhidden">link to current page</span>
      </a>
    </h1>
    <ul v-if="sections.length" class="nav">
      <li v-for="(section, i) in sections" :key="i" class="nav-item">
        <!-- eslint-disable --><!-- Don't let this wrap -->
        <router-link :to="section.anchor">{{ section.title }}</router-link>
        <!-- eslint-enable -->
      </li>
    </ul>
  </div>

</template>


<script>

  import { throttle } from 'frame-throttle';
  import responsiveElementMixin from 'kolibri.coreVue.mixins.responsiveElementMixin';
  import state from '../../../state';

  export default {
    name: 'Header',
    mixins: [responsiveElementMixin],
    props: {
      sections: {
        type: Array,
        required: true,
      },
    },
    data() {
      return {
        scrolled: false,
      };
    },
    computed: {
      throttledHandleScroll() {
        return throttle(this.handleScroll);
      },
      style() {
        return {
          left: `${this.navWidth}px`,
          // Pos fixed inline style necessary for responsive-element compatibility
          position: 'fixed',
        };
      },
      navWidth() {
        return state.navWidth;
      },
    },
    watch: {
      elementHeight() {
        this.$emit('heightChange', this.elementHeight);
      },
    },
    mounted() {
      window.addEventListener('scroll', this.throttledHandleScroll);
    },
    beforeDestroy() {
      window.removeEventListener('scroll', this.throttledHandleScroll);
    },
    methods: {
      handleScroll() {
        this.scrolled = window.scrollY > 15;
      },
      scrollToTop() {
        window.scrollTo(0, 0);
      },
    },
  };

</script>


<style lang="scss" scoped>

  .header {
    position: fixed;
    top: 0;
    right: 0;
    z-index: 999999;
    padding-top: 16px;
    padding-bottom: 16px;
    padding-left: 32px;
    background-color: white;
    border-bottom: 1px solid white;
    border-left: 1px solid #dedede;
    transition: border 0.25s ease;
  }

  .header.fixed {
    border-bottom: 1px solid #dedede;
  }

  @media print {
    .header {
      position: absolute !important;
      border-bottom-width: 0;
    }
  }

  .nav {
    padding: 0;
    margin: 0;
    margin-top: 8px;
    list-style: none;
  }

  .nav-item {
    display: inline-block;
  }

  .nav-item:not(:last-child) {
    padding-right: 8px;
    margin-right: 8px;
    border-right: 1px solid #dedede;
  }

  .header-text {
    margin: 0;
  }

  .icon-link {
    width: 14px;
    height: 14px;
    margin-right: 8px;
    margin-left: 8px;
  }

</style>
