<template>

  <!-- TODO useScrollPosition to set scrollPosition...
    here or in router, but somewhere -->
  <div class="main">
    <ScrollingHeader :scrollPosition="0">
      <transition mode="out-in">
        <AppBar
          v-if="showAppBarsOnScroll"
          ref="appBar"
          class="app-bar"
          :title="title"
          :showNavigation="showNavigation"
          :showAppNavView="isAppContextAndTouchDevice"
          @toggleSideNav="navShown = !navShown"
        >
          <template #sub-nav>
            <slot name="subNav"></slot>
          </template>
        </AppBar>
      </transition>
      <KLinearLoader
        v-if="isLoading"
        type="indeterminate"
        :delay="false"
      />
      <slot name="storageNotif"></slot>
    </ScrollingHeader>

    <div
      id="main"
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
        :showAppNavView="isAppContextAndTouchDevice"
        @toggleSideNav="navShown = !navShown"
        @shouldFocusFirstEl="findFirstEl()"
      />
    </transition>
  </div>

</template>


<script>

  import { mapGetters } from 'vuex';
  import { throttle } from 'frame-throttle';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import { isTouchDevice } from 'kolibri/utils/browserInfo';
  import useUser from 'kolibri/composables/useUser';
  import ScrollingHeader from '../ScrollingHeader';
  import AppBar from './internal/AppBar';
  import SideNav from './internal/SideNav';

  export default {
    name: 'AppBarPage',
    components: {
      AppBar,
      ScrollingHeader,
      SideNav,
    },
    mixins: [commonCoreStrings],
    setup() {
      const { windowBreakpoint, windowIsSmall } = useKResponsiveWindow();
      const { isAppContext } = useUser();
      return {
        windowBreakpoint,
        windowIsSmall,
        isAppContext,
      };
    },
    props: {
      title: {
        type: String,
        default: '',
      },
      showNavigation: {
        type: Boolean,
        default: true,
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
      ...mapGetters(['isPageLoading']),
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
      showAppBarsOnScroll() {
        let show = true;
        if (this.isAppContextAndTouchDevice) {
          show = this.hideAppBars;
        }
        return show;
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
        //Is user scrolling up?
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

  @import '~kolibri-design-system/lib/styles/definitions';

  .app-bar {
    @extend %dropshadow-2dp;

    width: 100%;
  }

  .android-nav-bottom-bar {
    @extend %dropshadow-1dp;

    position: fixed;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 12;
    height: 48px;
    background-color: white;
  }

</style>
