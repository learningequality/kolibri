<template>

  <div>
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
        <a :href="nestedObject.route" class="link" :styles="menuPluginStyles">
          {{ nestedObject.text }}
        </a>
      </div>
    </div>
  </div>

</template>


<script>

  import CoreMenuOption from 'kolibri.coreVue.components.CoreMenuOption';
  import navComponents from 'kolibri.utils.navComponents';
  import urls from 'kolibri.urls';
  import { mapGetters } from 'vuex';
  import { PageNames as LearnPageNames } from '../constants';
  import generateSideNavRoute from '../appNavigationRoutes.js';
  import commonLearnStrings from './commonLearnStrings';

  const component = {
    name: 'LearnSideNavEntry',
    mixins: [commonLearnStrings],
    components: {
      CoreMenuOption,
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
            text: 'homeLabel',
            route: this.generateSideNavRoute(LearnPageNames.HOME),
          },
          library: {
            text: 'libraryLabel',
            route: this.generateSideNavRoute(LearnPageNames.LIBRARY),
          },
          bookmarks: {
            text: 'bookmarksLabel',
            route: this.generateSideNavRoute(LearnPageNames.BOOKMARKS),
          },
        };
      },
      menuPluginStyles() {
        return {
          color: this.$themeTokens.text,
          width: '99%',
          height: '48px',
          textAlign: 'left',
          padding: '0px 4px',
          border: 'none',
          textTransform: 'capitalize',
          fontWeight: 'normal',
          ':hover': this.menuPluginActiveStyles,
        };
      },
      menuPluginActiveStyles() {
        return {
          backgroundColor: this.$themeBrand.primary.v_50,
          color: this.$themeBrand.primary,
          fontWeight: 'bold',
          padding: '0px 4px',
          borderRadius: '4px',
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
    },
    priority: 10,
  };

  navComponents.register(component);

  export default component;

</script>


<style lang="scss" scoped>

  .link-container {
    height: 44px;
  }

  .link {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    height: 44px;
    margin-left: 40px;
    font-size: 12px;
    text-decoration: none;
  }

</style>
