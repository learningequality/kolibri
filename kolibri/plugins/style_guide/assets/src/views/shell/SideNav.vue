<template>

  <nav class="sidenav">
    <h1>
      Kolibri Style Guide
    </h1>
    <router-link :to="'/'" exact>
      Home
    </router-link>

    <div v-for="(section, i) in navMenu" :key="i" class="section">
      <KHorizontalRule :parentMargin="16" class="hr" />

      <div class="section-heading">
        {{ section.sectionName }}
      </div>
      <ul>
        <li v-for="(sectionItem, j) in section.sectionItems" :key="j">
          <router-link :to="sectionItem.itemRoute">
            {{ sectionItem.itemName }}
          </router-link>
        </li>
      </ul>
    </div>
  </nav>

</template>


<script>

  import { navMenu } from '../../routes.js';
  import KHorizontalRule from './KHorizontalRule';

  export default {
    name: 'SideNav',
    components: {
      KHorizontalRule,
    },
    data() {
      return {
        navMenu,
      };
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  h1 {
    margin-bottom: 32px;
    font-weight: normal;
  }

  .sidenav {
    @extend %dropshadow-4dp;

    padding-right: 16px;
    padding-left: 16px;
    background: white;
    border-right: 1px solid #dedede;
  }

  .hr {
    margin-top: 16px;
    margin-bottom: 16px;
  }

  .section-heading {
    margin-bottom: 8px;
    font-size: smaller;
    color: #777777;
  }

  ul {
    padding: 0;
    margin: 0;
    list-style-type: none;
  }

  a {
    display: block;
    padding: 8px;
    margin-right: -8px;
    margin-bottom: 2px;
    margin-left: -8px;
    color: #3a3a3a;
    text-decoration: none;
    border-radius: 4px;
    outline-offset: 3px;

    &:hover {
      color: #3a3a3a;
      background-color: #efefef;
    }

    &.router-link-active {
      background-color: #dedede;
    }
  }

</style>
