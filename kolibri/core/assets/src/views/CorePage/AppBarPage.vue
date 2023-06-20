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
        v-if="isLoading"
        type="indeterminate"
        :delay="false"
      />
      <div aria-live="polite">
        <StorageNotification :showBanner="showStorageNotification" />
      </div>
    </ScrollingHeader>

    <div
      class="main-wrapper"
      :style="wrapperStyles"
    >
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

  </div>

</template>


<script>

  import { mapGetters } from 'vuex';
  import { get } from '@vueuse/core';
  import LanguageSwitcherModal from 'kolibri.coreVue.components.LanguageSwitcherModal';
  import ScrollingHeader from 'kolibri.coreVue.components.ScrollingHeader';
  import useKResponsiveWindow from 'kolibri.coreVue.composables.useKResponsiveWindow';
  import SideNav from 'kolibri.coreVue.components.SideNav';
  import { LearnerDeviceStatus } from 'kolibri.coreVue.vuex.constants';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import useUser from 'kolibri.coreVue.composables.useUser';
  import AppBar from '../AppBar';
  import StorageNotification from '../StorageNotification';
  import useUserSyncStatus from '../../composables/useUserSyncStatus';

  export default {
    name: 'AppBarPage',
    components: {
      AppBar,
      LanguageSwitcherModal,
      ScrollingHeader,
      SideNav,
      StorageNotification,
    },
    mixins: [commonCoreStrings],
    setup() {
      let userDeviceStatus = null;
      const { isLearnerOnlyImport } = useUser();
      if (get(isLearnerOnlyImport)) {
        userDeviceStatus = useUserSyncStatus().deviceStatus;
      }
      const { windowBreakpoint, windowIsSmall } = useKResponsiveWindow();
      return {
        userDeviceStatus,
        windowBreakpoint,
        windowIsSmall,
      };
    },
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
        default() {
          return false;
        },
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
      ...mapGetters(['isAppContext', 'isPageLoading']),
      isLoading() {
        return this.isPageLoading || this.loading;
      },
      wrapperStyles() {
        return this.appearanceOverrides
          ? this.appearanceOverrides
          : {
              width: '100%',
              maxWidth: '1064px',
              margin: 'auto',
              backgroundColor: this.$themePalette.grey.v_100,
              paddingLeft: this.paddingLeftRight,
              paddingRight: this.paddingLeftRight,
              paddingTop: this.appBarHeight + this.paddingTop + 'px',
              paddingBottom: '72px',
              marginTop: 0,
            };
      },
      paddingTop() {
        return this.isAppContext ? 0 : 4;
      },
      paddingLeftRight() {
        return this.isAppContext || this.windowIsSmall ? '8px' : '32px';
      },
      showStorageNotification() {
        return this.userDeviceStatus === LearnerDeviceStatus.INSUFFICIENT_STORAGE;
      },
    },
    watch: {
      windowBreakpoint() {
        //Update the the app bar height at every breakpoint
        this.appBarHeight = this.$refs.appBar.$el.scrollHeight || 0;
      },
    },
    mounted() {
      this.$nextTick(() => {
        this.appBarHeight = this.$refs.appBar.$el.scrollHeight || 0;
      });
    },
    methods: {
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

  .android-nav-bottom-bar {
    @extend %dropshadow-4dp;

    position: fixed;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 12;
    height: 48px;
    background-color: white;
  }

</style>
