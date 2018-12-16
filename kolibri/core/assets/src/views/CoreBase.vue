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
  import logger from 'kolibri.lib.logging';
  import AppError from './AppError';
  import GlobalSnackbar from './GlobalSnackbar';
  import ImmersiveToolbar from './ImmersiveToolbar';

  const logging = logger.getLogger(__filename);

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
        // whether app bar is moving with content or pinned to the page
        barPinned: true,
        // vertical offset of the app
        barTranslation: 0,
        // the most recent and previous scroll positions, respectively
        scrollBuffer: [0, 0],
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
      appBarHeight() {
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
          marginTop: `${this.appBarHeight}px`,
          marginBottom: `${this.marginBottom}px`,
          padding: `${this.isMobile ? 16 : 32}px`,
        };
      },
      appbarStyles() {
        return {
          position: this.barPinned ? 'fixed' : 'absolute',
          transform: `translateY(${this.barTranslation}px)`,
        };
      },
      loaderPositionStyles() {
        return {
          top: `${this.appBarHeight}px`,
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
      // current content scroll position
      contentPos() {
        return this.scrollBuffer[0];
      },
      // previous content scroll position
      contentPosPrev() {
        return this.scrollBuffer[1];
      },
      // difference between previous and current position
      scrollDelta() {
        return this.contentPos - this.contentPosPrev;
      },
      // position of app bar relative to browser viewport
      barPos() {
        if (this.barPinned) {
          return this.barTranslation;
        }
        return this.barTranslation - this.contentPos;
      },
      negBarHeight() {
        return 0 - this.appBarHeight;
      },
    },
    methods: {
      handleScroll(e) {
        this.scrollBuffer = [e.target.scrollTop, this.contentPos];
        this.waitForScrollStop();

        // IF: scrolling upward, bar visibly pinned
        if (this.scrollDelta < 0 && this.barPinned && this.barTranslation === 0) {
          logging.debug('scrolling upward, bar visibly pinned');
          // THEN: bar stays visibly pinned
          return;
        }

        // IF: scrolling downward, bar visibly pinned
        else if (this.scrollDelta > 0 && this.barPinned && this.barTranslation === 0) {
          logging.debug('scrolling downward, bar visibly pinned');
          // THEN: attach at content position so it can scroll offscreen
          this.barPinned = false;
          this.barTranslation = this.contentPos;
          return;
        }

        // IF: scrolling upward, bar invisibly pinned
        else if (
          this.scrollDelta < 0 &&
          this.barPinned &&
          this.barTranslation === this.negBarHeight
        ) {
          logging.debug('scrolling upward, bar invisibly pinned');
          // THEN: attach at content position
          this.barPinned = false;
          this.barTranslation = this.contentPos - this.appBarHeight;
          return;
        }

        // IF: scrolling downward, bar invisibly pinned
        else if (
          this.scrollDelta > 0 &&
          this.barPinned &&
          this.barTranslation === this.negBarHeight
        ) {
          logging.debug('scrolling downward, bar invisibly pinned');
          // THEN: bar stays invisibly pinned
          return;
        }

        // IF: scrolling downward, attached to content
        else if (this.scrollDelta > 0 && !this.barPinned) {
          logging.debug('scrolling downward, attached to content');
          // IF: bar is fully offscreen
          if (this.barPos <= this.negBarHeight) {
            logging.debug('bar is fully offscreen');
            // THEN: pin bar offscreen
            this.barPinned = true;
            this.barTranslation = this.negBarHeight;
            return;
          }
          // IF: bar is partially offscreen
          else if (this.negBarHeight < this.barPos && this.barPos < 0) {
            logging.debug('bar is partially offscreen');
            // THEN: stay attached to content at current position
            return;
          }
          // IF: if bar somehow got too low (barPos > 0)
          else {
            logging.debug('if bar somehow got too low (barPos > 0)');
            // THEN: re-attach at content position
            this.barTranslation = this.contentPos;
            return;
          }
        }

        // IF: scrolling upward, attached to content
        else if (this.scrollDelta < 0 && !this.barPinned) {
          logging.debug('scrolling upward, attached to content');
          // IF: bar is at least partially offscreen
          if (this.negBarHeight <= this.barPos && this.barPos < 0) {
            logging.debug('bar is at least partially offscreen');
            // IF: scrolling quickly relative to app bar height and distance remaining
            if (2 * this.scrollDelta < this.barPos) {
              logging.debug('scrolling quickly relative to app bar height');
              // THEN: pin bar visibly
              this.barPinned = true;
              this.barTranslation = 0;
              return;
            } else {
              logging.debug('scrolling slowly relative to app bar height');
              // THEN: stay attached to content at bar position
              return;
            }
          }
          // IF: bar is too low, e.g. due to momentum or overshoot
          else if (this.barPos >= 0) {
            logging.debug('bar is too low, e.g. due to momentum or overshoot');
            // THEN: pin bar visibly
            this.barPinned = true;
            this.barTranslation = 0;
            return;
          }
          // IF: bar is too high (barPos < negBarHeight)
          else {
            logging.debug('bar is too high (barPos < negBarHeight)');
            // THEN: re-attach at content position
            this.barPinned = false;
            this.barTranslation = this.contentPos;
            return;
          }
        }

        // report if logic above is flawed or incomplete
        logging.warn(`Unhandled scrolling state:`);
        logging.warn(`\tScroll buffer: ${this.scrollBuffer}`);
        logging.warn(`\tAppbar height: ${this.appBarHeight}`);
        logging.warn(`\tAppbar translation: ${this.barTranslation}`);
        logging.warn(`\tIs pinned: ${this.barPinned}`);
      },
      scrollingStopped() {
        this.scrollBuffer = [this.contentPos, this.contentPos];
        logging.debug('scrolling stopped');

        // IF: the bar is already pinned
        if (this.barPinned) {
          logging.debug('already pinned: do nothing');
          // THEN: do nothing
          return;
        }

        // IF: the bar is attached to the content, and the content is near the top
        if (!this.barPinned && this.contentPos < this.appBarHeight) {
          logging.debug('close to top: do nothing');
          // THEN: keep the bar attached to the content to prevent a blank space
          return;
        }

        // IF: the bar is attached to the content
        if (!this.barPinned) {
          // IF: bar is at least half visible
          if (this.barPos > this.negBarHeight / 2) {
            // THEN: pin bar visibly
            this.barPinned = true;
            this.barTranslation = 0;
            return;
          }
          // IF: bar is less than half visible
          else {
            // THEN: pin bar offscreen
            this.barPinned = true;
            this.barTranslation = this.negBarHeight;
            return;
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
