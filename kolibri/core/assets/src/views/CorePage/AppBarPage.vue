<template>
  <div class="main">
    <ScrollingHeader :scrollPosition="0">
      <transition mode="out-in">
        <AppBar
          v-if="showAppBarsOnScroll"
          ref="appBar"
          class="app-bar"
          :title="title"
          @toggleSideNav="navShown = !navShown"
        >
          <template #sub-nav>
            <slot name="subNav"></slot>
          </template>
          <template v-if="navComponents.length > 0">
            <div class="nav-items">
              <router-link
                v-for="component in navComponents"
                :key="component.id"
                :to="component.path"
              >
                {{ component.label }}
              </router-link>
            </div>
          </template>
        </AppBar>
      </transition>
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

    <transition mode="out-in">
      <SideNav
        v-if="showAppBarsOnScroll"
        ref="sideNav"
        :navShown="navShown"
        @toggleSideNav="navShown = !navShown"
        @shouldFocusFirstEl="findFirstEl()"
      />
    </transition>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';
import ScrollingHeader from 'kolibri.coreVue.components.ScrollingHeader';
import useKResponsiveWindow from 'kolibri.coreVue.composables.useKResponsiveWindow';
import SideNav from 'kolibri.coreVue.components.SideNav';
import { LearnerDeviceStatus } from 'kolibri.coreVue.vuex.constants';
import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
import { isTouchDevice } from 'kolibri.utils.browserInfo';
import AppBar from '../AppBar';
import StorageNotification from '../StorageNotification';
import useUserSyncStatus from '../../composables/useUserSyncStatus';
import navComponents from '../../utils/navComponents';

export default {
  name: 'AppBarPage',
  components: {
    AppBar,
    ScrollingHeader,
    SideNav,
    StorageNotification,
  },
  mixins: [commonCoreStrings],
  setup() {
    const userDeviceStatus = useUserSyncStatus().deviceStatus;
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
      navShown: false,
      lastScrollTop: 0,
      hideAppBars: true,
      throttledHandleScroll: null,
    };
  },
  computed: {
    ...mapGetters(['isAppContext', 'isPageLoading']),
    isAppContextAndTouchDevice() {
      return this.isAppContext && isTouchDevice;
    },
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
    showAppBarsOnScroll() {
      let show = true;
      if (this.isAppContextAndTouchDevice) {
        show = this.hideAppBars;
      }
      return show;
    },
    // Dynamically generate the navComponents based on registered components
    navComponents() {
      // Filter only those components that should be displayed in the main navigation
      return navComponents.filter((component) => component.section === 'main');
    },
  },
  watch: {
    windowBreakpoint() {
      //Update the app bar height at every breakpoint
      this.appBarHeight = this.$refs.appBar.$el.scrollHeight || 0;
    },
  },
  mounted() {
    this.$nextTick(() => {
      this.appBarHeight = this.$refs.appBar.$el.scrollHeight || 0;
    });
    this.addScrollListener();
  },
  beforeUnmount() {
    this.removeScrollListener();
  },
  methods: {
    addScrollListener() {
      if (this.isAppContextAndTouchDevice) {
        this.throttledHandleScroll = throttle(this.handleScroll);
        window.addEventListener('scroll', this.throttledHandleScroll);
      }
    },
    findFirstEl() {
      this.$nextTick(() => {
        this.$refs.sideNav.focusFirstEl();
      });
    },
    handleScroll() {
      const scrollTop = window.scrollY;
      //Is the user scrolling up?
      if (scrollTop > this.lastScrollTop) {
        this.hideAppBars = false;
      } else {
        this.hideAppBars = true;
      }
      this.lastScrollTop = scrollTop;
    },
    removeScrollListener() {
      if (this.isAppContextAndTouchDevice) {
        window.removeEventListener('scroll', this.throttledHandleScroll);
        this.throttledHandleScroll.cancel();
        this.throttledHandleScroll = null;
      }
    },
  },
};
</script>

<style lang="scss" scoped>
// Add your specific styles if needed
</style>
