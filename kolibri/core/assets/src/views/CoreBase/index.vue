<template>

  <div
    class="main-wrapper"
    :style="mainWrapperStyles"
    :class="fullScreen ? '' : 'scrolling-pane'"
    @scroll.passive="throttledHandleScroll"
  >

    <div v-if="blockDoubleClicks" class="click-mask"></div>

    <ScrollingHeader
      :height="appbarHeight"
      :scrollPosition="scrollPosition"
      :alwaysVisible="fixedAppBar"
    >
      <ImmersiveToolbar
        v-if="immersivePage && !fullScreen"
        :appBarTitle="toolbarTitle || appBarTitle"
        :icon="immersivePageIcon"
        :route="immersivePageRoute"
        :primary="immersivePagePrimary"
        :height="headerHeight"
        @nav-icon-click="$emit('navIconClick')"
      />
      <AppBar
        v-else-if="!immersivePage && !fullScreen"
        ref="appBar"
        class="app-bar"
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
      <KLinearLoader
        v-if="loading"
        class="loader"
        :style="{top: `${appbarHeight}px`}"
        type="indeterminate"
        :delay="false"
      />
    </ScrollingHeader>

    <SideNav
      :navShown="navShown"
      :headerHeight="headerHeight"
      :width="navWidth"
      @toggleSideNav="navShown=!navShown"
    />

    <div
      v-if="!loading"
      :class="fullScreen ? 'scrolling-pane' : 'content'"
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
    <UpdateNotification />

  </div>

</template>


<script>

  import { mapState } from 'vuex';
  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  import AppBar from 'kolibri.coreVue.components.AppBar';
  import SideNav from 'kolibri.coreVue.components.SideNav';
  import AuthMessage from 'kolibri.coreVue.components.AuthMessage';
  import KLinearLoader from 'kolibri.coreVue.components.KLinearLoader';
  import { throttle } from 'frame-throttle';
  import AppError from '../AppError';
  import GlobalSnackbar from '../GlobalSnackbar';
  import ImmersiveToolbar from '../ImmersiveToolbar';
  import UpdateNotification from '../UpdateNotification';
  import ScrollingHeader from './ScrollingHeader';

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
      ScrollingHeader,
      UpdateNotification,
    },
    mixins: [responsiveWindow],
    props: {
      appBarTitle: {
        type: String,
        required: false,
        default: '',
      },
      // Prop that determines whether to show nav components and provide margins
      fullScreen: {
        type: Boolean,
        default: false,
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
      // generally a 'back' or 'close' icon
      immersivePageIcon: {
        type: String,
        required: false,
        default: 'close',
      },
      // link to where the 'back' button should go
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
        scrollPosition: 0,
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
      appbarHeight() {
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
      mainWrapperStyles() {
        if (this.fullScreen) {
          return { top: 0 };
        }
        return { top: this.fixedAppBar ? `${this.appbarHeight}px` : 0 };
      },
      contentStyles() {
        if (this.fullScreen) {
          return {
            marginTop: '0px',
            marginBottom: '0px',
            padding: '0px',
          };
        }
        return {
          marginTop: `${this.fixedAppBar ? 0 : this.appbarHeight}px`,
          marginBottom: `${this.marginBottom + 128}px`,
          padding: `${this.windowIsSmall ? 16 : 32}px`,
        };
      },
      fixedAppBar() {
        return this.windowIsLarge || this.immersivePage;
      },
      // calls handleScroll no more than every 17ms
      throttledHandleScroll() {
        return throttle(this.handleScroll);
      },
    },
    methods: {
      handleScroll(e) {
        this.scrollPosition = e.target.scrollTop;
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  .scrolling-pane {
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

    width: 100%;
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
