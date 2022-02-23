<template>

  <div
    ref="mainWrapper"
    class="main-wrapper"
    :style="mainWrapperStyles"
  >

    <div v-if="blockDoubleClicks" class="click-mask"></div>

    <ScrollingHeader
      :scrollPosition="scrollPosition"
      :alwaysVisible="fixedAppBar"
      :mainWrapperScrollHeight="mainWrapperScrollHeight"
      :isHidden.sync="headerIsHidden"
      :skipNextUpdate.sync="headerSkipNextUpdate"
    >
      <ImmersiveToolbar
        v-if="immersivePage && !fullScreen"
        :appBarTitle="toolbarTitle || appBarTitle"
        :icon="immersivePageIcon"
        :route="immersivePageRoute"
        :isFullscreen="!immersivePagePrimary"
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
        @toggleSideNav="navShown = !navShown"
        @showLanguageModal="languageModalShown = true"
      >
        <template #totalPointsMenuItem>
          <slot name="totalPointsMenuItem"></slot>
        </template>
        <template #app-bar-actions>
          <div class="app-bar-actions">
            <slot name="app-bar-actions"></slot>
          </div>
        </template>
        <template v-if="showSubNav" #sub-nav>
          <slot name="sub-nav"></slot>
        </template>
      </AppBar>
      <KLinearLoader
        v-if="loading && !fullScreen"
        class="loader"
        :style="{ top: `${appbarHeight}px` }"
        type="indeterminate"
        :delay="false"
      />
    </ScrollingHeader>

    <SideNav
      ref="sideNav"
      :navShown="navShown"
      :headerHeight="headerHeight"
      :width="navWidth"
      @toggleSideNav="navShown = !navShown"
      @shouldFocusFirstEl="findFirstEl()"
    />

    <div
      v-if="!loading"
      :class="fullScreen ? 'scrolling-pane' : 'content'"
      :style="contentStyles"
    >
      <CoreBanner v-if="coreBannerComponent && showDemoBanner">
        <template #default="props">
          <component :is="coreBannerComponent" :bannerClosed="props.bannerClosed" />
        </template>
      </CoreBanner>

      <div v-if="debug" class="debug">
        <div>{{ contentComponentName }}</div>
        <div>{{ routePath }}</div>
      </div>

      <KPageContainer v-if="notAuthorized">
        <AuthMessage
          :authorizedRole="authorizedRole"
          :header="authorizationErrorHeader"
          :details="authorizationErrorDetails"
        />
      </KPageContainer>
      <KPageContainer v-else-if="error">
        <AppError />
      </KPageContainer>

      <div
        v-else
        id="main"
        role="main"
        tabindex="-1"
        class="main"
        :style="mainStyles"
      >
        <slot></slot>
      </div>
    </div>

    <GlobalSnackbar />
    <UpdateNotification
      v-if="!loading && showNotification && mostRecentNotification"
      :id="mostRecentNotification.id"
      :title="mostRecentNotification.title"
      :msg="mostRecentNotification.msg"
      :linkText="mostRecentNotification.linkText"
      :linkUrl="mostRecentNotification.linkUrl"
      @submit="dismissUpdateModal"
    />
    <LanguageSwitcherModal
      v-if="languageModalShown"
      :style="{ color: $themeTokens.text }"
      @cancel="languageModalShown = false"
    />

  </div>

</template>


<script>

  import { mapState, mapGetters } from 'vuex';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import AppBar from 'kolibri.coreVue.components.AppBar';
  import SideNav from 'kolibri.coreVue.components.SideNav';
  import AuthMessage from 'kolibri.coreVue.components.AuthMessage';
  import { throttle } from 'frame-throttle';
  import Lockr from 'lockr';
  import { UPDATE_MODAL_DISMISSED } from 'kolibri.coreVue.vuex.constants';
  import { currentLanguage, defaultLanguage } from 'kolibri.utils.i18n';
  import coreBannerContent from 'kolibri.utils.coreBannerContent';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import AppError from '../AppError';
  import GlobalSnackbar from '../GlobalSnackbar';
  import ImmersiveToolbar from '../ImmersiveToolbar';
  import UpdateNotification from '../UpdateNotification';
  import LanguageSwitcherModal from '../language-switcher/LanguageSwitcherModal';
  import CoreBanner from '../CoreBanner';
  import ScrollingHeader from './ScrollingHeader';

  const scrollPositions = {
    _scrollPositions: {},
    getScrollPosition() {
      // Use key set by Vue Router on the history state.
      const key = (window.history.state || {}).key;
      const defaultPos = { x: 0, y: 0 };
      if (key && this._scrollPositions[key]) {
        return this._scrollPositions[key];
      }
      return defaultPos;
    },
    setScrollPosition({ x, y }) {
      const key = (window.history.state || {}).key;
      // Only set if we have a vue router key on the state,
      // otherwise we don't do anything.
      if (key) {
        this._scrollPositions[window.history.state.key] = { x, y };
      }
    },
  };

  export default {
    name: 'CoreBase',
    metaInfo() {
      return {
        // Use arrow function to bind $tr to this component
        titleTemplate: title => {
          if (this.error) {
            return this.$tr('kolibriTitleMessage', { title: this.$tr('errorPageTitle') });
          }
          if (!title) {
            // If no child component sets title, it reads 'Kolibri'
            return this.coreString('kolibriLabel');
          }
          // If child component sets title, it reads 'Child Title - Kolibri'
          return this.$tr('kolibriTitleMessage', { title });
        },
        title: this.pageTitle,
      };
    },
    components: {
      AppBar,
      AppError,
      CoreBanner,
      ImmersiveToolbar,
      SideNav,
      AuthMessage,
      GlobalSnackbar,
      ScrollingHeader,
      UpdateNotification,
      LanguageSwitcherModal,
    },
    mixins: [responsiveWindowMixin, commonCoreStrings],
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
      // Prop that determines if the page contains an embedded sidebar
      hasSidebar: {
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
        default: null,
      },
      authorizationErrorHeader: {
        type: String,
        default: null,
      },
      authorizationErrorDetails: {
        type: String,
        default: null,
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
        default: null,
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
      // Alternative to using metaInfo in a top level component to set the
      // title of the HTML Document
      pageTitle: {
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
      debug: {
        type: Boolean,
        default: false,
      },
      maxMainWidth: {
        type: Number,
        required: false,
        default: 1000,
      },
      showDemoBanner: {
        type: Boolean,
        default: false,
        required: false,
      },
    },
    data() {
      return {
        navShown: false,
        scrollPosition: 0,
        unwatchScrollHeight: undefined,
        notificationModalShown: true,
        languageModalShown: false,
        headerIsHidden: false,
        headerSkipNextUpdate: false,
        mainWrapperScrollHeight: 0,
      };
    },
    computed: {
      ...mapGetters(['isAdmin', 'isSuperuser']),
      ...mapState({
        error: state => state.core.error,
        loading: state => state.core.loading,
        blockDoubleClicks: state => state.core.blockDoubleClicks,
        notifications: state => state.core.notifications,
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
        if (
          this.error &&
          this.error.response &&
          this.error.response.status &&
          this.error.response.status == 403
        ) {
          return true;
        }
        return !this.authorized;
      },
      mainWrapperStyles() {
        if (this.$isPrint) {
          return {};
        }

        return {
          backgroundColor: this.$themePalette.grey.v_100,
          paddingTop: `${this.appbarHeight}px`,
          paddingBottom: `${this.marginBottom}px`,
        };
      },
      contentStyles() {
        if (this.fullScreen || this.$isPrint || this.hasSidebar) {
          return {
            marginTop: '0px',
            marginBottom: '0px',
            padding: '0px',
          };
        }
        return {
          top: this.fixedAppBar ? `${this.appbarHeight}px` : 0,
          padding: `32px ${this.windowIsSmall ? 16 : 32}px`,
        };
      },
      mainStyles() {
        let styles = {
          marginLeft: 'auto',
          marginRight: 'auto',
        };
        if (!this.fullScreen) {
          styles['maxWidth'] = this.maxMainWidth + 'px';
        }
        if (this.hasSidebar) {
          styles = {
            marginLeft: '0',
            marginRight: '0',
          };
        }
        return styles;
      },
      fixedAppBar() {
        return this.windowIsLarge && !this.windowIsShort;
      },
      // calls handleScroll no more than every 17ms
      throttledHandleScroll() {
        return throttle(this.handleScroll);
      },
      showNotification() {
        if (
          (this.isAdmin || this.isSuperuser) &&
          !Lockr.get(UPDATE_MODAL_DISMISSED) &&
          this.notificationModalShown &&
          this.notifications.length !== 0
        ) {
          return true;
        }
        return false;
      },
      mostRecentNotification() {
        let languageCode = defaultLanguage.id;
        // notifications should already be ordered by timestamp
        const notification = this.notifications[0];
        if (notification) {
          // check if translated message is available for current language
          if (notification.i18n[currentLanguage] !== undefined) {
            languageCode = currentLanguage;
          }
          // i18n data structure generated by nutritionfacts_i18n.py
          return {
            id: notification.id,
            title: notification.i18n[languageCode].title,
            msg: notification.i18n[languageCode].msg,
            linkText: notification.i18n[languageCode].link_text,
            linkUrl: notification.link_url,
          };
        }
        return null;
      },
      contentComponentName() {
        return this.$slots.default[0].context.$options.name;
      },
      routePath() {
        if (this.$router.getRouteDefinition(this.contentComponentName)) {
          return this.$router.getRouteDefinition(this.contentComponentName).path;
        }
        return '';
      },
      coreBannerComponent() {
        return coreBannerContent[0];
      },
    },
    watch: {
      $route() {
        // If there's a scrollTo parameter, it will be handled by
        // the vue-router via `scrollBehavior`.
        if (this.$route.params.scrollTo) {
          // Show the header by default when navigating with a scrollTo parameter.
          this.showHeader();
          return;
        }
        // Set a watcher so that if the router sets a new
        // route, we update our scroll position based on the ones
        // we have tracked in the scrollPosition object above.
        if (this.unwatchScrollHeight) {
          this.unwatchScrollHeight();
        }
        if (this.loading) {
          // Don't set scroll position until the main content
          // of coreBase is shown in the DOM.
          // Create a watcher to monitor changes in loading
          // to try to set the scrollHeight after the contents
          // have loaded.
          this.unwatchScrollHeight = this.$watch('loading', () => {
            this.unwatchScrollHeight();
            this.$nextTick(() => {
              // Set the scroll in next tick for safety, to ensure
              // that the child components have finished mounting
              this.setScroll();
            });
          });
        } else {
          this.setScroll();
        }
      },
      windowWidth() {
        if (this.fixedAppBar && this.headerIsHidden) {
          this.headerIsHidden = false;
        }
        this.updateScrollHeight();
      },
    },
    beforeRouteUpdate() {
      this.recordScroll();
    },
    beforeRouteLeave() {
      this.recordScroll();
    },
    mounted() {
      window.addEventListener('scroll', this.throttledHandleScroll, { passive: true });
      this.setScroll();
    },
    beforeDestroy() {
      window.removeEventListener('scroll', this.throttledHandleScroll);
    },
    methods: {
      handleScroll() {
        this.scrollPosition = window.pageYOffset;
        this.recordScroll();
      },
      recordScroll() {
        scrollPositions.setScrollPosition({ y: window.pageYOffset });
      },
      dismissUpdateModal() {
        if (this.notifications.length === 0) {
          this.notificationModalShown = false;
          Lockr.set(UPDATE_MODAL_DISMISSED, true);
        }
      },
      updateScrollHeight() {
        this.mainWrapperScrollHeight = Math.max(
          this.$refs.mainWrapper.offsetHeight,
          this.$refs.mainWrapper.scrollHeight
        );
      },
      updateHeaderHidden(isHidden) {
        // This provides a mechanism to tell the `ScrollingHeader` component to
        // ignore scroll changes triggered here in `CoreBase` e.g. during usage of
        // the forward/back buttons.

        this.headerSkipNextUpdate = true;
        this.headerIsHidden = isHidden;
      },
      showHeader() {
        this.updateHeaderHidden(false);
      },
      setScroll() {
        this.updateScrollHeight();
        window.scrollTo(0, scrollPositions.getScrollPosition().y);
        this.scrollPosition = window.pageYOffset;
        // If recorded scroll is applied, immediately un-hide the header
        if (this.scrollPosition > 0) {
          this.$nextTick().then(this.showHeader);
        }
      },
      findFirstEl() {
        this.$nextTick(() => {
          this.$refs.sideNav.focusFirstEl();
        });
      },
    },
    $trs: {
      kolibriTitleMessage: {
        message: '{ title } - Kolibri',
        context: 'DO NOT TRANSLATE\nCopy the source string.',
      },
      errorPageTitle: {
        message: 'Error',
        context:
          "When Kolibri throws an error, this is the text that's used as the title of the error page. The description of the error follows below.",
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  .main-wrapper {
    display: inline-block;
    width: 100%;

    @media print {
      /* Without this, things won't print correctly
         *  - Firefox: Tables will get cutoff
         *  - Chrome: Table header won't repeat correctly on each page
         */
      display: block;
    }
  }

  .main {
    height: 100%;
  }

  // When focused by SkipNavigationLink, don't outline non-buttons/links
  /deep/ [tabindex='-1'] {
    outline-style: none !important;
  }

  .scrolling-pane {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    overflow-x: auto;
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
    @extend %dropshadow-4dp;

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
    margin-right: auto;
    margin-bottom: 128px;
    margin-left: auto;
  }

  .debug {
    font-family: monospace;
    font-size: large;
    font-weight: bold;
    line-height: 2em;
  }

</style>
