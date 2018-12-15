<template>

  <div class="main-wrapper" @scroll="throttledHandleScroll">

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
        isScrolling: false,
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
      throttledHandleScroll() {
        return throttle(this.handleScroll);
      },
      waitForScrollStop() {
        return debounce(this.scrollingStopped, 500);
      },
      scrollCurrent() {
        return this.scrollBuffer[this.scrollBufferIndex];
      },
      scrollPrevious() {
        return this.scrollBuffer[(this.scrollBufferIndex + 2) % 3];
      },
      scrollOldest() {
        return this.scrollBuffer[(this.scrollBufferIndex + 1) % 3];
      },
    },
    methods: {
      handleScroll(e) {
        this.scrollBufferIndex = (this.scrollBufferIndex + 1) % 3;
        this.$set(this.scrollBuffer, this.scrollBufferIndex, e.target.scrollTop);

        // switch direction from down to up: allow the app bar to begin scrolling into view
        if (this.scrollCurrent < this.scrollPrevious && this.scrollPrevious >= this.scrollOldest) {
          console.log('A');
          this.appbarPos = 'absolute';
          this.appbarTop = this.scrollCurrent - this.marginTop;
        }
        // scroll up until app bar comes into view: pin it to the top of the viewport
        if (this.scrollCurrent <= this.appbarTop) {
          console.log('B');
          this.appbarPos = 'fixed';
          this.appbarTop = 0;
        }
        // switch direction from up to down: begin scrolling app bar out of view
        if (this.scrollCurrent > this.scrollPrevious && this.scrollPrevious <= this.scrollOldest) {
          console.log('C');
          if (this.appbarPos === 'fixed') {
            this.appbarPos = 'absolute';
            this.appbarTop = this.scrollCurrent;
          }
        }

        this.isScrolling = true;
        this.waitForScrollStop();
      },
      scrollingStopped() {
        const current = this.scrollCurrent;
        this.$set(this.scrollBuffer, 0, current);
        this.$set(this.scrollBuffer, 1, current);
        this.$set(this.scrollBuffer, 2, current);
        this.isScrolling = false;
        const offset = this.scrollCurrent - this.appbarTop;
        // the appbar is partly visible. how rude
        if (offset > 0 && offset < this.marginTop) {
          if (offset > this.marginTop / 2) {
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
