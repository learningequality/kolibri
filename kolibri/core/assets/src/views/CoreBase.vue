<template>

  <div class="main-wrapper" @scroll.passive="throttledHandleScroll">

    <div v-if="blockDoubleClicks" class="click-mask"></div>

    <!-- temporary hack, resolves flicker when using other templates -->
    <template v-if="navBarNeeded">

      <ImmersiveToolbar
        v-if="immersivePage"
        :appBarTitle="toolbarTitle || appBarTitle"
        :icon="immersivePageIcon"
        :route="immersivePageRoute"
        :primary="immersivePagePrimary"
        :height="headerHeight"
        @nav-icon-click="$emit('navIconClick')"
      />

      <template v-else>
        <AppBar
          ref="appBar"
          class="app-bar"
          :style="appbarStyles"
          :title="toolbarTitle || appBarTitle"
          :height="headerHeight"
          :navShown="navShown"
          @toggleSideNav="navShown=!navShown"
        >
          <slot slot="totalPointsMenuItem" name="totalPointsMenuItem"></slot>
          <div slot="app-bar-actions" class="app-bar-actions">
            <slot name="app-bar-actions"></slot>
          </div>
          <slot
            v-if="showSubNav"
            slot="sub-nav"
            name="sub-nav"
          >
          </slot>
        </AppBar>
        <SideNav
          :navShown="navShown"
          :headerHeight="headerHeight"
          :width="navWidth"
          @toggleSideNav="navShown=!navShown"
        />
      </template>

    </template>

    <KLinearLoader
      v-if="loading"
      class="loader"
      :style="loaderPositionStyles"
      type="indeterminate"
      :delay="false"
    />

    <div
      v-if="!loading"
      class="content"
      :style="contentStyles"
    >
      <AuthMessage
        v-if="notAuthorized"
        :authorizedRole="authorizedRole"
        :header="authorizationErrorHeader"
        :details="authorizationErrorDetails"
      />
      <AppError v-else-if="error" />
      <slot v-else></slot>
    </div>

    <GlobalSnackbar />

  </div>

</template>


<script>

  import { mapState } from 'vuex';
  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  import AppBar from 'kolibri.coreVue.components.AppBar';
  import SideNav from 'kolibri.coreVue.components.SideNav';
  import AuthMessage from 'kolibri.coreVue.components.AuthMessage';
  import { throttle } from 'frame-throttle';
  import KLinearLoader from 'kolibri.coreVue.components.KLinearLoader';
  import debounce from 'lodash/debounce';
  import AppError from './AppError';
  import GlobalSnackbar from './GlobalSnackbar';
  import ImmersiveToolbar from './ImmersiveToolbar';

  export default {
    name: 'CoreBase',
    $trs: {
      kolibriMessage: 'Kolibri',
      kolibriTitleMessage: '{ title } - Kolibri',
      errorPageTitle: 'Error',
    },
    components: {
      AppBar,
      AppError,
      ImmersiveToolbar,
      SideNav,
      AuthMessage,
      GlobalSnackbar,
      KLinearLoader,
    },
    mixins: [responsiveWindow],
    props: {
      appBarTitle: {
        type: String,
        required: false,
        default: '',
      },
      // Prop that determines whether to show nav components
      navBarNeeded: {
        type: Boolean,
        default: true,
      },
      // reserve space at the bottom for floating widgets
      marginBottom: {
        type: Number,
        default: 0,
      },
      // AUTHORIZATION SPECIFIC
      authorized: {
        type: Boolean,
        required: false,
        default: true,
      },
      authorizedRole: {
        type: String,
        required: false,
      },
      authorizationErrorHeader: {
        type: String,
        required: false,
      },
      authorizationErrorDetails: {
        type: String,
        required: false,
      },
      // IMMERSIVE-SPECIFIC
      immersivePage: {
        type: Boolean,
        required: false,
        default: false,
      },
      immersivePageIcon: {
        type: String,
        required: false,
        default: 'close',
      },
      immersivePageRoute: {
        type: Object,
        required: false,
      },
      // determines the color, primary being the classic kolibri appbar color
      immersivePagePrimary: {
        type: Boolean,
        required: false,
      },
      toolbarTitle: {
        type: String,
        required: false,
        default: '',
      },
      // If true, will render the component in the "sub-nav" slot and add 48px
      // to AppBody's top offset.
      showSubNav: {
        type: Boolean,
        default: false,
      },
    },
    metaInfo() {
      return {
        // Use arrow function to bind $tr to this component
        titleTemplate: title => {
          if (this.error) {
            return this.$tr('kolibriTitleMessage', { title: this.$tr('errorPageTitle') });
          }
          if (!title) {
            // If no child component sets title, it reads 'Kolibri'
            return this.$tr('kolibriMessage');
          }
          // If child component sets title, it reads 'Child Title - Kolibri'
          return this.$tr('kolibriTitleMessage', { title });
        },
      };
    },
    data() {
      return {
        navShown: false,
        appbarPos: 'absolute',
        appbarTop: 0,
        scrollBuffer: [0, 0, 0],
        scrollBufferIndex: 0,
      };
    },
    computed: {
      ...mapState({
        error: state => state.core.error,
        loading: state => state.core.loading,
        blockDoubleClicks: state => state.core.blockDoubleClicks,
      }),
      headerHeight() {
        return this.windowIsSmall ? 56 : 64;
      },
      marginTop() {
        if (this.showSubNav) {
          // Adds the height of KNavBar
          return this.headerHeight + 48;
        }
        return this.headerHeight;
      },
      navWidth() {
        return this.headerHeight * 4;
      },
      notAuthorized() {
        // catch "not authorized" error, display AuthMessage
        if (this.error && this.error.code == 403) {
          return true;
        }
        return !this.authorized;
      },
      isMobile() {
        return this.windowIsSmall;
      },
      contentStyles() {
        return {
          marginTop: `${this.marginTop}px`,
          marginBottom: `${this.marginBottom}px`,
          padding: `${this.isMobile ? 16 : 32}px`,
        };
      },
      appbarStyles() {
        return {
          position: this.appbarPos,
          transform: `translateY(${this.appbarTop}px)`,
        };
      },
      loaderPositionStyles() {
        return {
          top: `${this.marginTop}px`,
        };
      },
      // calls handleScroll no more than every 17ms
      throttledHandleScroll() {
        return throttle(this.handleScroll);
      },
      // calls scrollingStopped 500ms after scrolling pauses
      waitForScrollStop() {
        return debounce(this.scrollingStopped, 500);
      },
      // current scroll position
      scroll_0() {
        return this.scrollBuffer[this.scrollBufferIndex];
      },
      // previous scroll position
      scroll_1() {
        return this.scrollBuffer[(this.scrollBufferIndex + 2) % 3];
      },
      // oldest scroll position
      scroll_2() {
        return this.scrollBuffer[(this.scrollBufferIndex + 1) % 3];
      },
    },
    methods: {
      handleScroll(e) {
        this.scrollBufferIndex = (this.scrollBufferIndex + 1) % 3;
        this.$set(this.scrollBuffer, this.scrollBufferIndex, e.target.scrollTop);
        this.waitForScrollStop();

        // padding relative to app bar height
        const wiggleRoom = this.marginTop / 8;

        // currently fixed to the top
        if (this.appbarPos === 'fixed') {
          // scrolling up
          if (this.scroll_0 < this.scroll_1) {
            // nothing to do
            return;
          }
          // switch direction from down to up
          if (this.scroll_0 < this.scroll_1 && this.scroll_1 > this.scroll_2) {
            // app bar will begin scrolling into view
            this.appbarPos = 'absolute';
            this.appbarTop = this.scroll_0 - this.marginTop;
            return;
          }
          // switch direction from up to down
          if (this.scroll_0 > this.scroll_1 && this.scroll_1 < this.scroll_2) {
            // begin scrolling app bar out of view
            this.appbarPos = 'absolute';
            this.appbarTop = this.scroll_0;
            return;
          }
        }

        // currently moving with page
        if (this.appbarPos === 'absolute') {
          // scrolling down
          if (this.scroll_0 > this.scroll_1 && this.appbarTop) {
            // nothing to do
            return;
          }
          // app

          // scrolling up very fast
          if (this.scroll_1 - this.scroll_0 > wiggleRoom) {
            // pin it preemptively to prevent overshoot
            this.appbarPos = 'fixed';
            this.appbarTop = 0;
            return;
          }
          // app bar has come close to all the way down
          if (this.scroll_0 <= this.appbarTop + wiggleRoom) {
            // pin it
            this.appbarPos = 'fixed';
            this.appbarTop = 0;
            return;
          }
        }
      },
      scrollingStopped() {
        const current = this.scroll_0;
        this.$set(this.scrollBuffer, 0, current);
        this.$set(this.scrollBuffer, 1, current);
        this.$set(this.scrollBuffer, 2, current);
        const offset = this.scroll_0 - this.appbarTop;
        // the appbar is partly visible. how rude
        if (offset > 0 && offset < this.marginTop) {
          if (offset > (2 * this.marginTop) / 3) {
            this.appbarPos = 'fixed';
            this.appbarTop = -1 * this.marginTop;
          } else {
            this.appbarPos = 'fixed';
            this.appbarTop = 0;
          }
        }
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  .main-wrapper {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    overflow-x: hidden;
    overflow-y: scroll; // has to be scroll, not auto
    -webkit-overflow-scrolling: touch; // iOS momentum scrolling
  }

  .click-mask {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 24;
    width: 100%;
    height: 100%;
  }

  .app-bar {
    @extend %ui-toolbar-box-shadow;
    @extend %enable-gpu-acceleration;

    right: 0;
    left: 0;

    // transition-timing-function: ease;
    // transition-duration: 0.25s;
    // transition-property: transform;
  }

  .app-bar-actions {
    display: inline-block;
  }

  .loader {
    position: fixed;
    right: 0;
    left: 0;
  }

  .content {
    max-width: 1000px;
    margin-right: auto;
    margin-left: auto;
  }

</style>
