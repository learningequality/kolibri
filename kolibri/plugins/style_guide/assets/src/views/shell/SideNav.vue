<template>

  <div class="nav-wrapper" :style="{width: `${navWidth}px`}">
    <nav class="sidenav">
      <h1>
        <CoreLogo slot="icon" class="logo" alt="Kolibri" />
        Design System
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
    <div class="bottom-gradient"></div>
  </div>

</template>


<script>

  import CoreLogo from 'kolibri.coreVue.components.CoreLogo';
  import { navMenu } from '../../routes.js';
  import navWidth from '../navWidth';
  import KHorizontalRule from './KHorizontalRule';

  export default {
    name: 'SideNav',
    components: {
      KHorizontalRule,
      CoreLogo,
    },
    created() {
      this.navMenu = navMenu;
      this.navWidth = navWidth;
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  h1 {
    margin-bottom: 32px;
    font-size: 20px;
    font-weight: bold;
    color: #918daf;
  }

  .logo {
    position: relative;
    width: 55px;
    margin-right: 4px;
    vertical-align: middle;
  }

  .bottom-gradient {
    position: absolute;
    right: 0;
    bottom: 0;
    left: 0;
    height: 100px;
    pointer-events: none;
    background-image: linear-gradient(to bottom, transparent, white);
  }

  .nav-wrapper {
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
  }

  .sidenav {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    padding-right: 16px;
    padding-bottom: 150px;
    padding-left: 16px;
    overflow-y: auto;
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
    color: #368d74;
    text-decoration: none;
    border-radius: 4px;
    outline-offset: 3px;

    &:hover {
      color: #26614d;
      background-color: #efefef;
    }

    &.router-link-active {
      color: black;
      background-color: #dedede;
    }
  }

</style>
