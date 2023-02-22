<template>

  <div v-if="mainDisplay">
    <CoreMenuOption
      ref="firstMenu"
      :label="learnString('learnLabel')"
      :iconAfter="iconAfter"
      icon="learn"
      :link="isAppContext ? null : url"
      @select="visibleSubMenu = !visibleSubMenu"
    />

    <div v-if="isAppContext && visibleSubMenu">
      <div v-for="(nestedObject, key) in learnRoutes" :key="key">
        <div v-if="nestedObject.condition" class="link-container">
          <a
            :href="nestedObject.route"
            class="link"
            :class="$computedClass(subpathStyles(nestedObject.route))"
            @click="handleNav(nestedObject.route)"
          >
            {{ nestedObject.text }}
          </a>
        </div>
      </div>
    </div>
  </div>
  <div v-else class="bottom-bar" :style="{ backgroundColor: $themeTokens.textInverted }">
    <span v-for="(link, key) in learnRoutes" :key="key">
      <a
        v-if="link.condition || isUserLoggedIn"
        :href="link.route"
        tabindex="-1"
        class="nav-menu-item"
        :style="{ textDecoration: 'none' }"
        @click="handleNav(link.route)"
      >
        <div :style="isActiveLink(link.route) ? bottomMenuActiveStyles : bottomMenuInactiveStyles">
          <KIconButton
            :icon="link.icon"
            :color="$themeTokens.primary"
            :ariaLabel="link.text"
          />
        </div>
        <p
          v-if="isActiveLink(link.route)"
          class="nav-menu-label"
          :style="{ color: $themeTokens.primary }"
        >
          {{ link.text }}
        </p>
      </a>
    </span>
    <span class="nav-menu-item" :style="bottomMenuInactiveStyles">
      <KIconButton
        icon="menu"
        :ariaLabel="coreString('menuLabel')"
        :color="$themeTokens.primary"
        @click="toggleAndroidMenu"
      />
      <p :style="{ color: $themeTokens.primary }">{{ coreString('menuLabel') }}</p>
    </span>
  </div>

</template>


<script>

  import CoreMenuOption from 'kolibri.coreVue.components.CoreMenuOption';
  import navComponents from 'kolibri.utils.navComponents';
  import urls from 'kolibri.urls';
  import { mapGetters } from 'vuex';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { PageNames as LearnPageNames } from '../constants';
  import { generateNavRoute } from '../../../../../core/assets/src/utils/generateNavRoutes';
  import baseRoutes from '../routes/baseRoutes';
  import commonLearnStrings from './commonLearnStrings';

  const component = {
    name: 'LearnSideNavEntry',
    mixins: [commonLearnStrings, commonCoreStrings],
    components: {
      CoreMenuOption,
    },
    props: {
      mainDisplay: {
        type: Boolean,
        default: true,
        required: false,
      },
      navigationIsOpen: {
        type: Boolean,
        default: false,
        required: false,
      },
    },
    data() {
      return {
        visibleSubMenu: false,
      };
    },
    mounted() {
      this.submenuShouldBeOpen();
    },
    computed: {
      ...mapGetters(['isAppContext', 'isUserLoggedIn']),
      url() {
        return urls['kolibri:kolibri.plugins.learn:learn']();
      },
      learnRoutes() {
        return {
          home: {
            condition: this.isUserLoggedIn,
            text: this.coreString('homeLabel'),
            icon: 'dashboard',
            route: this.generateNavRoute(LearnPageNames.HOME),
          },
          library: {
            condition: Boolean(true),
            text: this.learnString('libraryLabel'),
            icon: 'library',
            route: this.generateNavRoute(LearnPageNames.LIBRARY),
          },
          bookmarks: {
            condition: this.isUserLoggedIn,
            text: this.coreString('bookmarksLabel'),
            icon: 'bookmark',
            route: this.generateNavRoute(LearnPageNames.BOOKMARKS),
          },
        };
      },
      bottomMenuActiveStyles() {
        return {
          borderTop: `4px solid ${this.$themeTokens.primary}`,
        };
      },
      bottomMenuInactiveStyles() {
        return {
          borderTop: `4px solid ${this.$themeTokens.textInverted}`,
        };
      },
      iconAfter() {
        if (this.isAppContext) {
          return this.visibleSubMenu ? 'chevronUp' : 'chevronDown';
        }
      },
    },
    methods: {
      generateNavRoute(route) {
        return generateNavRoute(this.url, route, baseRoutes);
      },
      toggleAndroidMenu() {
        this.$emit('toggleAndroidMenu');
      },
      isActiveLink(route) {
        return (
          route.includes(this.$router.currentRoute.path) &&
          this.$router.currentRoute.name != 'PROFILE'
        );
      },
      submenuShouldBeOpen() {
        // which plugin are we currently in?
        this.visibleSubMenu = window.location.pathname.includes(this.url);
      },
      subpathStyles(route) {
        if (this.isActiveLink(route)) {
          return {
            color: this.$themeTokens.primaryDark,
            fontWeight: 'bold',
            textDecoration: 'none',
          };
        }
        return {
          color: this.$themeTokens.text,
          textDecoration: 'none',
          ':hover': {
            color: this.$themeTokens.primaryDark,
            fontWeight: 'bold',
          },
          ':focus': this.$coreOutline,
        };
      },
      handleNav(route) {
        if (this.isActiveLink(route) && this.navigationIsOpen) {
          this.$emit('toggleAndroidMenu');
        }
      },
    },
    priority: 10,
  };

  navComponents.register(component);

  export default component;

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  .link-container {
    height: 44px;
  }

  .link {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    height: 44px;
    margin: 0 40px;
    font-size: 12px;
    text-decoration: none;
  }

  .bottom-bar {
    @extend %dropshadow-4dp;

    position: fixed;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 12;
    display: flex;
    align-items: flex-start;
    justify-content: space-around;
    height: 50px;
  }

  .nav-menu-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100px;
  }

  button {
    margin-top: -6px;
  }

  p {
    margin: 0;
    margin-top: -8px;
    font-size: 12px;
    text-align: center;
  }

</style>
