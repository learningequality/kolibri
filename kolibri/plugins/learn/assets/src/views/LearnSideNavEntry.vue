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
            :class="$computedClass(optionStyle)"
            @click="visibleSubMenu = false"
          >
            {{ nestedObject.text }}
          </a>
        </div>
      </div>
    </div>
  </div>
  <div v-else class="bottom-bar">
    <span v-for="(link, key) in learnRoutes" :key="key">
      <a v-if="link.condition || isUserLoggedIn" :href="link.route" tabindex="-1">
        <KIconButton
          :icon="link.icon"
          :color="$themeTokens.primary"
          :ariaLabel="link.text"
          @click="visibleSubMenu = false"
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
    },
    data() {
      return {
        visibleSubMenu: false,
      };
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
            text: this.coreString('libraryLabel'),
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
      generateNavRoute(route) {
        return generateNavRoute(this.url, route, baseRoutes);
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
