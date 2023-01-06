<template>

  <!-- TODO useScrollPosition to set scrollPosition...
    here or in router, but somewhere -->
  <div class="main">
    <ScrollingHeader :scrollPosition="0">
      <AppBar
        ref="appBar"
        class="app-bar"
        :title="title"
        @toggleSideNav="navShown = !navShown"
        @showLanguageModal="languageModalShown = true"
      >
        <template #sub-nav>
          <slot name="subNav"></slot>
        </template>
      </AppBar>
      <KLinearLoader
        v-if="loading"
        type="indeterminate"
        :delay="false"
      />
    </ScrollingHeader>

    <div class="main-wrapper" :style="wrapperStyles">
      <slot></slot>
    </div>

    <SideNav
      ref="sideNav"
      :navShown="navShown"
      @toggleSideNav="navShown = !navShown"
      @shouldFocusFirstEl="findFirstEl()"
    />

    <LanguageSwitcherModal
      v-if="languageModalShown"
      ref="languageSwitcherModal"
      :style="{ color: $themeTokens.text }"
      @cancel="languageModalShown = false"
    />

    <AppBottomBar
      v-if="isAppContext"
      class="bottom-bar"
      :navigationLinks="links"
    />

  </div>

</template>


<script>

  import { mapGetters } from 'vuex';
  import LanguageSwitcherModal from 'kolibri.coreVue.components.LanguageSwitcherModal';
  import ScrollingHeader from 'kolibri.coreVue.components.ScrollingHeader';
  import SideNav from 'kolibri.coreVue.components.SideNav';
  import AppBottomBar from 'kolibri.coreVue.components.AppBottomBar';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import urls from 'kolibri.urls';
  import generateSideNavRoute from '../../../../../plugins/learn/assets/src/appNavigationRoutes';
  import AppBar from '../AppBar';
  import { PageNames } from './../../../../../plugins/learn/assets/src/constants';
  import commonLearnStrings from './../../../../../plugins/learn/assets/src/views/commonLearnStrings';

  export default {
    name: 'AppBarPage',
    components: { AppBar, AppBottomBar, LanguageSwitcherModal, ScrollingHeader, SideNav },
    mixins: [commonCoreStrings, commonLearnStrings],
    props: {
      title: {
        type: String,
        default: null,
      },
      appearanceOverrides: {
        type: Object,
        required: false,
        default: null,
      },
      loading: {
        type: Boolean,
        default: null,
      },
    },
    data() {
      return {
        appBarHeight: 0,
        languageModalShown: false,
        navShown: false,
      };
    },
    computed: {
      ...mapGetters(['isAppContext']),
      url() {
        return urls['kolibri:kolibri.plugins.learn:learn']();
      },
      wrapperStyles() {
        return this.appearanceOverrides
          ? this.appearanceOverrides
          : {
              width: '100%',
              maxWidth: '1064px',
              margin: 'auto',
              backgroundColor: this.$themePalette.grey.v_100,
              paddingLeft: '32px',
              paddingRight: '32px',
              paddingTop: this.appBarHeight + 32 + 'px',
              paddingBottom: '72px',
              marginTop: 0,
            };
      },
      links() {
        const links = [
          {
            condition: this.isUserLoggedIn,
            title: this.coreString('homeLabel'),
            link: this.generateBottomBarRoute(PageNames.HOME),
            icon: 'dashboard',
            color: this.$themeTokens.primary,
          },
          {
            condition: this.canAccessUnassignedContent,
            title: this.learnString('libraryLabel'),
            link: this.generateBottomBarRoute(PageNames.LIBRARY),
            icon: 'library',
            color: this.$themeTokens.primary,
          },
          {
            condition: this.isUserLoggedIn && this.canAccessUnassignedContent,
            title: this.coreString('bookmarksLabel'),
            link: this.generateBottomBarRoute(PageNames.BOOKMARKS),
            icon: 'bookmark',
            color: this.$themeTokens.primary,
          },
        ];
        return links;
      },
    },
    mounted() {
      this.$nextTick(() => {
        this.appBarHeight = this.$refs.appBar.$el.scrollHeight || 0;
      });
    },
    methods: {
      generateBottomBarRoute(route) {
        return generateSideNavRoute(this.url, route);
      },
      findFirstEl() {
        this.$nextTick(() => {
          this.$refs.sideNav.focusFirstEl();
        });
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  .app-bar {
    @extend %dropshadow-8dp;

    width: 100%;
  }

</style>
