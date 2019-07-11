<template>

  <div
    class="header"
    :class="{ fixed: scrolled}"
    :style="{ left: `${navWidth}px` }"
  >
    <h1>
      {{ title }}
    </h1>
    <ul>
      <li v-for="(section, i) in sections" :key="i">
        <!-- eslint-disable --><!-- Don't let this wrap -->
        <router-link :to="'#'+section.anchor">{{ section.title }}</router-link>
        <!-- eslint-enable -->
      </li>
    </ul>
  </div>

</template>


<script>

  import { throttle } from 'frame-throttle';
  import navWidth from '../../navWidth';

  export default {
    name: 'Header',
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
    position: relative;
    position: fixed;
    top: 0;
    right: 0;
    z-index: 999999;
    padding-bottom: 8px;
    padding-left: 32px;
    background-color: white;
    border-bottom: 1px solid white;
    border-left: 1px solid #dedede;
    transition: border 0.25s ease;
  }

  .header.fixed {
    border-bottom: 1px solid #dedede;
  }

  ul {
    padding: 0;
    margin: 0;
    list-style: none;
  }

  li {
    display: inline-block;
  }

  li + li {
    padding-left: 8px;
    margin-left: 8px;
    border-left: 1px solid #dedede;
  }

  h1 {
    margin-top: 16px;
  }

</style>
