<template>

  <div
    class="header"
    :class="{ fixed: scrolled}"
    :style="{ left: `${navWidth}px` }"
  >
    <h1 class="header-text">
      {{ title }}
    </h1>
    <ul v-if="sections.length" class="nav">
      <li v-for="(section, i) in sections" :key="i" class="nav-item">
        <!-- eslint-disable --><!-- Don't let this wrap -->
        <router-link :to="'#'+section.anchor">{{ section.title }}</router-link>
        <!-- eslint-enable -->
      </li>
    </ul>
  </div>

</template>


<script>

  import { throttle } from 'frame-throttle';
  import ResponsiveElement from 'kolibri.coreVue.mixins.responsiveElement';
  import navWidth from '../../navWidth';

  export default {
    name: 'Header',
    mixins: [ResponsiveElement],
    props: {
      sections: {
        type: Array,
        required: true,
      },
      title: {
        type: String,
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
    },
    watch: {
      elementHeight() {
        this.$emit('heightChange', this.elementHeight);
      },
    },
    created() {
      this.navWidth = navWidth;
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

</style>
