<template>

  <div class="nav-wrapper" :style="{width: `${navWidth}px`}">
    <nav class="sidenav">

      <h1 class="header">
        <a href="#" class="header-logo" @click="toggle">
          <CoreLogo alt="Kolibri" />
        </a>
        <span v-show="!closed" class="header-text">Design System</span>
      </h1>

      <template v-show="!closed">

        <input
          v-model="filterText"
          class="filter"
          placeholder="filter"
          type="text"
          @keydown.esc="filterText = ''"
        >
        <button
          v-show="filterText"
          class="filter-clear-button"
          @click="filterText = ''"
        >
          <KIcon icon="clear" color="#757575" />
        </button>

        <div class="nav-links">

          <router-link v-show="showHome" :to="'/'" exact>
            {{ homeText }}
          </router-link>

          <NavSectionList v-show="showPatterns" :title="patternsText">
            <li v-for="(route, i) in visiblePatternRoutes" :key="i">
              <router-link :to="route">
                {{ route.meta.title }}
              </router-link>
            </li>
          </NavSectionList>

          <NavSectionList v-show="showComponents" :title="componentsText">
            <li v-for="(route, i) in visibleComponentRoutes" :key="i">
              <router-link :to="route">
                <code>{{ route.meta.componentAPI.name }}</code>
              </router-link>
            </li>
          </NavSectionList>

        </div>
      </template>

    </nav>

    <!-- used to help indicate that there is more to see if one scrolls down -->
    <div v-show="!closed" class="bottom-gradient"></div>
  </div>

</template>


<script>

  import CoreLogo from 'kolibri.coreVue.components.CoreLogo';
  import lockr from 'lockr';
  import { patternRoutes, componentRoutes } from '../../../routes.js';
  import state from '../../../state';
  import NavSectionList from './NavSectionList';
  import { termList, matches } from './filter';

  const NAV_CLOSED_COOKIE = 'nav-closed';

  export default {
    name: 'SideNav',
    components: {
      NavSectionList,
      CoreLogo,
    },
    data() {
      return {
        closed: false,
        filterText: '',
        homeText: 'Home',
        patternsText: 'Patterns',
        componentsText: 'Kolibri components',
      };
    },
    computed: {
      navWidth() {
        return state.navWidth;
      },
      terms() {
        return termList(this.filterText);
      },
      showHome() {
        return matches(this.terms, this.homeText);
      },
      showPatterns() {
        return this.visiblePatternRoutes.length || matches(this.terms, this.patternsText);
      },
      showComponents() {
        return this.visibleComponentRoutes.length || matches(this.terms, this.componentsText);
      },
      visiblePatternRoutes() {
        // show a page if either the page title or the section title matches
        return patternRoutes.filter(route =>
          matches(this.terms, route.meta.title + this.patternsText)
        );
      },
      visibleComponentRoutes() {
        // show a component if either the component name or the section title matches
        return componentRoutes.filter(route =>
          matches(this.terms, route.meta.componentAPI.name + this.componentsText)
        );
      },
    },
    watch: {
      closed(val) {
        state.navWidth = val ? 84 : 260;
      },
    },
    created() {
      this.closed = lockr.get(NAV_CLOSED_COOKIE, false);
      this.patternRoutes = patternRoutes;
      this.componentRoutes = componentRoutes;
    },
    methods: {
      toggle() {
        this.closed = !this.closed;
        lockr.set(NAV_CLOSED_COOKIE, this.closed);
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '../globals';

  .header {
    margin-bottom: 24px;
    font-size: 20px;
    font-weight: bold;
    color: $header-color;
  }

  .header-logo {
    width: 55px;
    height: 45px;
    vertical-align: middle;
  }

  .header-text {
    display: inline-block;
    margin-left: 8px;
  }

  .filter {
    display: block;
    width: 100%;
    padding: 4px 8px;
    font-size: 12px;
    border: 1px solid $border-color;
    border-radius: 4px;
    outline-width: 1px;
    outline-offset: -1px;
    &::placeholder {
      color: $border-color;
    }
  }

  .filter-clear-button {
    position: absolute;
    top: 84px;
    right: 24px;
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

  .nav-links {
    margin-top: 16px;

    a {
      display: block;
      padding: 8px;
      margin-right: -8px;
      margin-bottom: 2px;
      margin-left: -8px;
      color: $link-color;
      text-decoration: none;
      border-radius: 4px;
      outline-offset: 3px;

      &:hover {
        color: $link-hover-color;
        background-color: #efefef;

        code {
          color: $link-hover-color;
        }
      }

      &.router-link-active {
        color: black;
        background-color: $border-color;
      }
    }
  }

</style>
