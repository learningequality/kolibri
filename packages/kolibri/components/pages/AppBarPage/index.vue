<template>

  <!-- TODO useScrollPosition to set scrollPosition...
    here or in router, but somewhere -->
  <div class="main">
    <div
      v-if="windowIsSmall"
      ref="swipeZone"
      class="swipe-zone"
    ></div>

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
        v-if="loading"
        type="indeterminate"
        :delay="false"
      />
      <slot name="storageNotif"></slot>
    </ScrollingHeader>

    <div
      id="main"
      class="main-wrapper"
      :style="[wrapperStyles]"
    >
      <slot :pageContentHeight="pageContentHeight"></slot>
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

  import { throttle } from 'frame-throttle';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import { isTouchDevice } from 'kolibri/utils/browserInfo';
  import useUser from 'kolibri/composables/useUser';
  import { ref, getCurrentInstance } from 'vue';
  import { useSwipe } from '@vueuse/core';
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
      const instance = getCurrentInstance();
      const isRtl = ref(instance?.proxy.isRtl);
      const swipeZone = ref(null);
      const navShown = ref(false);

      useSwipe(swipeZone, {
        onSwipeEnd: (e, direction) => {
          if (direction === 'right' && !navShown.value && !isRtl.value) {
            navShown.value = true;
          } else if (direction === 'left' && !navShown.value && isRtl.value) {
            navShown.value = true;
          }
        },
      });
      const { windowHeight, windowIsSmall } = useKResponsiveWindow();
      const { isAppContext } = useUser();
      return {
        windowHeight,
        windowIsSmall,
        isAppContext,
        swipeZone,
        navShown,
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
        appBarHeight: 124,
        lastScrollTop: 0,
        hideAppBars: true,
        throttledHandleScroll: null,
      };
    },
    computed: {
      isAppContextAndTouchDevice() {
        return this.isAppContext && isTouchDevice;
      },
      wrapperStyles() {
        return this.appearanceOverrides
          ? { ...this.paddingTop, ...this.appearanceOverrides }
          : {
            width: '100%',
            maxWidth: '1064px',
            margin: 'auto',
            backgroundColor: this.$themePalette.grey.v_100,
            paddingLeft: this.paddingLeftRight,
            paddingRight: this.paddingLeftRight,
            paddingBottom: '72px',
            marginTop: 0,
            ...this.paddingTop,
          };
      },
      paddingTop() {
        const extraPadding = this.isAppContext ? 0 : 5;
        const totalPadding = this.appBarHeight + extraPadding;
        return {
          paddingTop: `${totalPadding}px`,
        };
      },
      pageContentHeight() {
        const paddingTop = parseInt(this.paddingTop.paddingTop) || 0;
        const paddingBottom = parseInt(this.wrapperStyles.paddingBottom) || 0;

        let height = this.windowHeight - paddingTop - paddingBottom - 1;
        if (this.isAppContextAndTouchDevice) {
          height -= 56; // Account for the Android bottom navigation bar
        }

        return height;
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
    beforeUpdate() {
      // Update appBarHeight after AppBar is rerendered and updated
      this.updateAppBarHeight();
    },
    mounted() {
      this.updateAppBarHeight();
      this.addScrollListener();
      window.addEventListener('resize', this.updateAppBarHeight);
    },
    beforeDestroy() {
      this.removeScrollListener();
      window.removeEventListener('resize', this.updateAppBarHeight);
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
      updateAppBarHeight() {
        // Update the app bar height when window is resized
        this.appBarHeight = this.$refs.appBar.$el.scrollHeight || 124;
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

  .swipe-zone {
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    z-index: 5;
    width: 30px;
    background: red;
    opacity: 0;
  }

</style>
