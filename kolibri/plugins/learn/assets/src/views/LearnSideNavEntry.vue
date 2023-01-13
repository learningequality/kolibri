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
      <div v-for="(nestedObject, key) in routes" :key="key" class="link-container">
        <a :href="nestedObject.route" class="link" :class="$computedClass(optionStyle)">
          {{ nestedObject.text }}
        </a>
      </div>
    </div>
  </div>
  <div v-else class="bottom-bar">
    <span v-for="(link, key) in routes" :key="key">
      <a :href="link.route" tabindex="-1">
        <KIconButton
          :icon="link.icon"
          :color="$themeTokens.primary"
          :ariaLabel="link.text"
        />
      </a>
    </span>
    <KIconButton
      icon="menu"
      :color="$themeTokens.primary"
      @click="toggleAndroidMenu"
    />
  </div>

</template>


<script>

  import CoreMenuOption from 'kolibri.coreVue.components.CoreMenuOption';
  import navComponents from 'kolibri.utils.navComponents';
  import urls from 'kolibri.urls';
  import { mapGetters } from 'vuex';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { PageNames as LearnPageNames } from '../constants';
  import generateSideNavRoute from '../appNavigationRoutes.js';
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
    },
    data() {
      return {
        visibleSubMenu: false,
      };
    },
    computed: {
      ...mapGetters(['isAppContext']),
      url() {
        return urls['kolibri:kolibri.plugins.learn:learn']();
      },
      routes() {
        return {
          home: {
            text: this.coreString('homeLabel'),
            icon: 'dashboard',
            route: this.generateSideNavRoute(LearnPageNames.HOME),
          },
          library: {
            text: this.coreString('libraryLabel'),
            icon: 'library',
            route: this.generateSideNavRoute(LearnPageNames.LIBRARY),
          },
          bookmarks: {
            text: this.coreString('bookmarksLabel'),
            icon: 'bookmark',
            route: this.generateSideNavRoute(LearnPageNames.BOOKMARKS),
          },
        };
      },
      optionStyle() {
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
      iconAfter() {
        if (this.isAppContext) {
          return this.visibleSubMenu ? 'chevronUp' : 'chevronDown';
        }
      },
    },
    methods: {
      generateSideNavRoute(route) {
        return generateSideNavRoute(this.url, route);
      },
      toggleAndroidMenu() {
        this.$emit('toggleAndroidMenu');
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
    height: 48px;
    background-color: white;
  }

</style>
