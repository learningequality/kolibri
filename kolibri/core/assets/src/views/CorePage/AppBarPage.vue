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
      <div aria-live="polite">
        <StorageNotification
          :showBanner="showStorageNotification"
        />
      </div>
    </ScrollingHeader>

    <div class="main-wrapper" :style="wrapperStyles">
      <slot></slot>
    </div>

    <MenuNav
      ref="menuNav"
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

  import LanguageSwitcherModal from 'kolibri.coreVue.components.LanguageSwitcherModal';
  import ScrollingHeader from 'kolibri.coreVue.components.ScrollingHeader';
  import MenuNav from 'kolibri.coreVue.components.MenuNav';
  import { LearnerDeviceStatus } from 'kolibri.coreVue.vuex.constants';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import AppBar from '../AppBar';
  import StorageNotification from '../StorageNotification';
  import useUserSyncStatus from '../../composables/useUserSyncStatus';
  import plugin_data from 'plugin_data';

  export default {
    name: 'AppBarPage',
    components: {
      AppBar,
      LanguageSwitcherModal,
      ScrollingHeader,
      MenuNav,
      StorageNotification,
    },
    mixins: [commonCoreStrings],
    setup() {
      let userDeviceStatus = null;
      if (plugin_data.isSubsetOfUsersDevice) {
        userDeviceStatus = useUserSyncStatus().deviceStatus;
      }
      return {
        userDeviceStatus,
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
      showStorageNotification() {
        return this.userDeviceStatus === LearnerDeviceStatus.INSUFFICIENT_STORAGE;
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
          if (this.navShown) {
            this.$refs.menuNav.focusFirstEl();
          }
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
