<template>

  <div class="nav-wrapper" :style="{width: `${navWidth}px`}">
    <nav class="sidenav">
      <a class="header" @click="closed = !closed">
        <h1>
          <CoreLogo class="logo" alt="Kolibri" />
          <span v-show="!closed">Design System</span>
        </h1>
      </a>
      <div v-show="!closed" class="nav-links">
        <router-link :to="'/'" exact>
          Home
        </router-link>

        <HorizontalRule />
        <div class="section-heading">
          Patterns
        </div>
        <ul>
          <li v-for="(route, i) in patternRoutes" :key="i">
            <router-link :to="route">
              {{ route.meta.title }}
            </router-link>
          </li>
        </ul>

        <HorizontalRule />
        <div class="section-heading">
          Kolibri Components
        </div>
        <ul>
          <li v-for="(route, i) in componentRoutes" :key="i">
            <router-link :to="route">
              <code>{{ route.meta.componentAPI.name }}</code>
            </router-link>
          </li>
        </ul>

      </div>
    </nav>
    <div v-show="!closed" class="bottom-gradient"></div>
  </div>

</template>


<script>

  import CoreLogo from 'kolibri.coreVue.components.CoreLogo';
  import { patternRoutes, componentRoutes } from '../../routes.js';
  import state from '../../state';
  import HorizontalRule from './HorizontalRule';

  export default {
    name: 'SideNav',
    components: {
      HorizontalRule,
      CoreLogo,
    },
    data() {
      return {
        closed: false,
      };
    },
    computed: {
      navWidth() {
        return state.navWidth;
      },
    },
    watch: {
      closed(val) {
        state.navWidth = val ? 84 : 260;
      },
    },
    created() {
      this.patternRoutes = patternRoutes;
      this.componentRoutes = componentRoutes;
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  .header {
    cursor: pointer;

    h1 {
      margin-bottom: 32px;
      font-size: 20px;
      font-weight: bold;
      color: #918daf;
    }

    .logo {
      position: relative;
      width: 55px;
      margin-right: 8px;
      vertical-align: middle;
    }
  }

  .bottom-gradient {
    position: absolute;
    right: 16px;
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
    z-index: 100;
  }

  .sidenav {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    padding-right: 24px;
    padding-bottom: 150px;
    padding-left: 16px;
    overflow-y: auto;
    background: white;
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

  .nav-links {
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
  }

</style>
