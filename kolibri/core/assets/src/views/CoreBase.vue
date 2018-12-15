<template>

  <div>
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
          class="core-base-app-bar align-to-parent"
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

    <div
      class="app-body"
      :style="contentStyle"
      @scroll="handleScroll"
    >
      <div v-if="blockDoubleClicks" class="click-mask"></div>
      <KLinearLoader
        v-if="loading"
        class="toolbar-loader"
        :style="loaderPositionStyles"
        type="indeterminate"
        :delay="false"
      />

      <div
        v-else
        :style="bodyPadding"
        class="body-wrapper"
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
      bottomMargin: {
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
      appBodyTopGap() {
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
      contentStyle() {
        return {
          top: `${this.appBodyTopGap}px`,
          bottom: `${this.bottomMargin}px`,
        };
      },
      loaderPositionStyles() {
        return {
          top: `${this.appBodyTopGap}px`,
        };
      },
      bodyPadding() {
        return {
          padding: `${this.isMobile ? 16 : 32}px`,
        };
      },
    },
    methods: {
      handleScroll: throttle(e => {
        console.log(Date.now(), '>>>', e);
      }),
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  .align-to-parent {
    position: absolute;
    top: 0;
    left: 0;
  }

  .core-base-app-bar {
    @extend %ui-toolbar-box-shadow;

    width: 100%;
  }

  .app-bar-actions {
    display: inline-block;
  }

  .app-body {
    position: absolute;
    right: 0;
    left: 0;
    overflow-x: hidden;
  }

  .body-wrapper {
    max-width: 1000px;
    margin: auto;
  }

  .toolbar-loader {
    position: fixed;
    right: 0;
    left: 0;
  }

  .click-mask {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 24;
    width: 100%;
    height: 100%;
  }

</style>
