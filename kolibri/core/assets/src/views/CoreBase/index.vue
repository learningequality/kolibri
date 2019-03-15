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
        @toggleSideNav="navShown = !navShown"
        @showLanguageModal="languageModalShown = true"
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
        v-if="loading && !fullScreen"
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
      <div v-if="debug" class="debug">
        <div>{{ contentComponentName }}</div>
        <div>{{ routePath }}</div>
      </div>

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
    <UpdateNotification
      v-if="!loading && showNotification && !busy"
      :id="mostRecentNotification.id"
      :title="mostRecentNotification.title"
      :msg="mostRecentNotification.msg"
      :linkText="mostRecentNotification.linkText"
      :linkUrl="mostRecentNotification.linkUrl"
      @closeModal="dismissUpdateModal"
    />
    <LanguageSwitcherModal
      v-if="languageModalShown"
      :style="{ color: $coreTextDefault }"
      @close="languageModalShown = false"
    />

  </div>

</template>


<script>

  import { mapState, mapGetters } from 'vuex';
  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  import themeMixin from 'kolibri.coreVue.mixins.themeMixin';
  import AppBar from 'kolibri.coreVue.components.AppBar';
  import SideNav from 'kolibri.coreVue.components.SideNav';
  import AuthMessage from 'kolibri.coreVue.components.AuthMessage';
  import KLinearLoader from 'kolibri.coreVue.components.KLinearLoader';
  import { throttle } from 'frame-throttle';
  import Lockr from 'lockr';
  import { UPDATE_MODAL_DISMISSED } from 'kolibri.coreVue.vuex.constants';
  import { currentLanguage, defaultLanguage } from 'kolibri.utils.i18n';
  import AppError from '../AppError';
  import GlobalSnackbar from '../GlobalSnackbar';
  import ImmersiveToolbar from '../ImmersiveToolbar';
  import UpdateNotification from '../UpdateNotification';
  import LanguageSwitcherModal from '../language-switcher/LanguageSwitcherModal';
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
      LanguageSwitcherModal,
    },
    mixins: [responsiveWindow, themeMixin],
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
        title: this.pageTitle,
      };
    },
    data() {
      return {
        navShown: false,
        scrollPosition: 0,
        unwatchScrollHeight: undefined,
        notificationModalShown: true,
        languageModalShown: false,
      };
    },
    computed: {
      ...mapGetters(['isAdmin', 'isSuperuser']),
      ...mapState({
        error: state => state.core.error,
        loading: state => state.core.loading,
        blockDoubleClicks: state => state.core.blockDoubleClicks,
        busy: state => state.core.signInBusy,
        notifications: state => state.core.notifications,
        startingScroll: state => state.core.scrollPosition,
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
          return { top: 0, bottom: 0 };
        }
        return {
          top: this.fixedAppBar ? `${this.appbarHeight}px` : 0,
          bottom: `${this.marginBottom}px`,
          backgroundColor: this.$coreBgCanvas,
        };
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
          padding: `${this.windowIsSmall ? 16 : 32}px`,
        };
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
        // check if translated message is available for current language
        if (notification.i18n[currentLanguage] !== undefined) {
          languageCode = currentLanguage;
        }
        return {
          id: notification.id,
          title: notification.i18n[languageCode].title,
          msg: notification.i18n[languageCode].msg,
          linkText: notification.i18n[languageCode].link_text,
          linkUrl: notification.link_url,
        };
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
    },
    watch: {
      startingScroll(newVal) {
        // Set a watcher so that if the router sets a new
        // starting scroll position based on the history, then it gets
        // set here.
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
              this.setScroll(newVal);
            });
          });
        } else {
          this.setScroll(newVal);
        }
      },
    },
    mounted() {
      this.setScroll(this.startingScroll);
    },
    methods: {
      handleScroll(e) {
        this.scrollPosition = e.target.scrollTop;
        // Setting this will not affect the page layout,
        // but this will then get properly stored in the
        // browser history.
        try {
          // This property can sometimes be readonly in older browsers
          window.pageYOffset = this.scrollPosition;
        } catch (e) {} // eslint-disable-line no-empty
      },
      dismissUpdateModal() {
        if (this.notifications.length === 0) {
          this.notificationModalShown = false;
          Lockr.set(UPDATE_MODAL_DISMISSED, true);
        }
      },
      setScroll(scrollValue) {
        this.$el.scrollTop = scrollValue;
        try {
          // This property can sometimes be readonly in older browsers
          window.pageYOffset = scrollValue;
        } catch (e) {} // eslint-disable-line no-empty
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
    overflow-x: auto;
    overflow-y: scroll; // has to be scroll, not auto
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
    max-width: 1000px;
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
