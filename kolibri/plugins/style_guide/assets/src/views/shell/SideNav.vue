<template>

  <nav class="sidenav">
    <router-link :to="'/'" class="sidenav-heading">
      Kolibri Style Guide
    </router-link>

    <div>
      <template v-for="section in navMenu">
        <div :key="`${section.sectionName}-heading`" class="section-heading">
          {{ section.sectionName }}
        </div>
        <ul :key="`${section.sectionName}-ul`">
          <li v-for="sectionItem in section.sectionItems" :key="sectionItem.itemName">
            <router-link :to="sectionItem.itemRoute" class="link">
              {{ sectionItem.itemName }}
            </router-link>
          </li>
        </ul>
      </template>
    </div>
  </nav>

</template>


<script>

  import { navMenu } from './nav-menu.js';

  export default {
    name: 'SideNav',
    data() {
      return {
        navMenu,
      };
    },
  };

</script>


<style lang="scss" scoped>

  @import '../../styles/style-guide';

  .sidenav {
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    width: $sidenav-width;
    overflow-y: auto;
    background: #f7f7f7;
    border-right: 1px solid #e0e0e0;
  }

  .sidenav-heading {
    display: block;
    padding: 32px 24px;
    font-size: 1.25em;
    text-decoration: none;
  }

  .section-heading {
    margin-top: 24px;
    margin-right: 24px;
    margin-bottom: 12px;
    margin-left: 24px;
    font-weight: bold;
  }

  ul {
    padding: 0;
    margin: 0;
    list-style-type: none;
  }

  .link {
    display: block;
    padding: 12px 24px;
    text-decoration: none;

    &.router-link-active {
      font-weight: bold;
      background-color: #e0e0e0;
    }
  }

</style>
