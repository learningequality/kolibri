<template>

  <div class="header" :style="{ left: `${navWidth}px` }">
    <h1>
      {{ title }}
    </h1>
    <ul>
      <li v-for="(section, i) in sections">
        <!-- eslint-disable --><!-- Don't let this wrap -->
        <router-link :to="'#'+section.anchor">{{ section.title }}</router-link>
        <!-- eslint-enable -->
      </li>
    </ul>
  </div>

</template>


<script>

  import navWidth from '../../navWidth';
  import { navMenu } from '../../../routes.js';

  export default {
    name: 'PageTemplate',
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
    created() {
      this.navWidth = navWidth;
    },
  };

</script>


<style lang="scss" scoped>

  .header {
    position: fixed;
    top: 0;
    right: 0;
    z-index: 999999;
    min-height: 108px;
    padding-bottom: 8px;
    padding-left: 32px;
    background-color: white;
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
