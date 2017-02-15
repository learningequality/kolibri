<template>

  <div>
    <div
      v-show="navShown"
      class="nav-wrapper"
      :style="wrapperStyle">
      <div class="header"
           :style="{ height: headerHeight + 'px', textAlign: !(mobile | tablet) ? 'center' : 'inherit' }">
        <button
          v-if="mobile | tablet"
          :aria-label="closeNav"
          class="close" @click="toggleNav"
          :style="{ fontSize: headerHeight/2 + 'px' }">
          <ui-icon :icon="mobile ? 'arrow_back' : 'menu'"/>
        </button>
        <img
          class="logo"
          v-else-if="mobile"
          src="../login-modal/icons/kolibri-logo.svg"
          alt=""
          :style="{ width: headerHeight + 'px', height: headerHeight + 'px', marginRight: width/20 + 'px' }">
        <p class="title" :style="{ fontSize: headerHeight/3 + 'px' }">Kolibri</p>
      </div>
      <img
        class="logo"
        v-if="!mobile"
        src="../login-modal/icons/kolibri-logo.svg"
        alt=""
        :style="{ height: width/2.5 + 'px', width: width/2.5 + 'px' }">
      <ui-menu
        class="nav-main"
        :options="menuOptions"
        hasIcons
        @select="navigate"
        role="navigation"
        :aria-label="ariaLabel"
        :style="{ maxWidth: width + 'px' }">
      </ui-menu>
      <div class="footer" :style="{ width: width + 'px' }">
        <img
          class="logo"
          src="../login-modal/icons/kolibri-logo.svg"
          alt=""
          :style="{ width: width/6 + 'px', height: width/6 + 'px', marginLeft: width/20 + 'px', marginRight: width/20 + 'px' }">
        <div class="message-container">
          <p class="message">{{ footerMsg }}</p>
          <p class="message">
            <ui-icon icon="copyright"/>
            2017 Learning Equality
          </p>
        </div>
      </div>

    </div>

    <!-- log-in modal -->
    <login-modal v-if="loginModalVisible"/>

    <div v-if="mobile" class="modal-overlay"
         @keydown.esc="toggleNav"
         @click="toggleNav">
    </div>
  </div>

</template>


<script>

  const values = require('lodash.values');
  const getters = require('kolibri.coreVue.vuex.getters');
  const actions = require('kolibri.coreVue.vuex.actions');
  const TopLevelPageNames = require('kolibri.coreVue.vuex.constants').TopLevelPageNames;
  const UserKinds = require('kolibri.coreVue.vuex.constants').UserKinds;
  const responsiveWindow = require('kolibri.coreVue.mixins.responsiveWindow');
  const responsiveElement = require('kolibri.coreVue.mixins.responsiveElement');

  module.exports = {
    mixins: [
      responsiveWindow,
      responsiveElement,
    ],
    $trNameSpace: 'navbar',
    $trs: {
      navigationLabel: 'Main user navigation',
      learn: 'Learn',
      explore: 'Explore',
      manage: 'Manage',
      coach: 'Coach',
      signIn: 'Sign in',
      profile: 'Profile',
      logOut: 'Log out',
      settings: 'Settings',
      about: 'About',
      closeNav: 'Close navigation',
      poweredBy: 'Powered by Kolibri {version}',
    },
    props: {
      topLevelPageName: {
        type: String,
        validator(value) {
          if (!value) {
            return true; // Okay if it's undefined
          }
          return values(TopLevelPageNames).includes(value);
        },
      },
      navShown: {
        type: Boolean,
        required: true,
      },
      headerHeight: {
        type: Number,
        required: true,
      },
      width: {
        type: Number,
        required: true,
      },
    },
    methods: {
      navigate(option) {
        if (option.href) {
          window.location.href = option.href;
        } else if (option.action) {
          option.action();
        }
      },
      toggleNav() {
        if (this.mobile | this.tablet) {
          this.$emit('toggleSideNav');
        }
      },
    },
    computed: {
      closeStyle() {
        return {
          fontSize: `${this.headerHeight / 2}px`,
          marginLeft: `${this.width / 20}px`,
          marginRight: `${this.width / 20}px`,

        };
      },
      wrapperStyle() {
        return {
          // Calculate min-height property by taking the number of options (minus the divider)
          // multipying by 50 for each option, adding 173 for the divider and the footer,
          // and finally adding this.width/2.5 for the non-mobile logo if needed.
          minHeight: `${(this.menuOptions.length - 1) * 50 + 173 +
          (!this.mobile ? this.width / 2.5 : 0)}px`,
          width: `${this.width}px`,
        };
      },
      mobile() {
        return this.windowSize.breakpoint < 2;
      },
      tablet() {
        return (this.windowSize.breakpoint > 1) & (this.windowSize.breakpoint < 5);
      },
      footerMsg() {
        return this.$tr('poweredBy', { version: __version }); // eslint-disable-line no-undef
      },
      closeNav() {
        return this.$tr('closeNav');
      },
      ariaLabel() {
        return this.$tr('navigationLabel');
      },
      learnActive() {
        return this.topLevelPageName === TopLevelPageNames.LEARN_LEARN;
      },
      coachActive() {
        return this.topLevelPageName === TopLevelPageNames.COACH;
      },
      manageActive() {
        return this.topLevelPageName === TopLevelPageNames.MANAGE;
      },
      profileActive() {
        return this.topLevelPageName === TopLevelPageNames.PROFILE;
      },
      aboutActive() {
        return this.topLevelPageName === TopLevelPageNames.ABOUT;
      },
      menuOptions() {
        const options = [
          {
            label: this.$tr('learn'),
            disabled: this.learnActive,
            icon: 'school',
            href: '/learn/#/learn',
          },
        ];
        if (this.isCoachAdminOrSuperuser) {
          options.push({
            label: this.$tr('coach'),
            disabled: this.coachActive,
            icon: 'assessment',
            href: '/coach',
          });
        }
        if (this.isAdminOrSuperuser) {
          options.push({
            label: this.$tr('manage'),
            disabled: this.manageActive,
            icon: 'people',
            href: '/management',
          });
        }
        options.push({
          type: 'divider',
        });
        if (this.loggedIn & !this.isAdminOrSuperuser) {
          options.push({
            label: this.$tr('profile'),
            disabled: this.profileActive,
            icon: 'account_circle',
            href: '/management',
          });
        }
        options.push(...[
          {
            label: this.$tr('about'),
            disabled: this.aboutActive,
            icon: 'error_outline',
          },
          {
            label: this.loggedIn ? this.$tr('logOut') : this.$tr('signIn'),
            icon: 'exit_to_app',
            action: this.loggedIn ? this.logout : this.showLoginModal,
          },
        ]);

        return options;
      },
    },
    components: {
      'session-nav-widget': require('kolibri.coreVue.components.sessionNavWidget'),
      'nav-bar-item': require('kolibri.coreVue.components.navBarItem'),
      'login-modal': require('kolibri.coreVue.components.loginModal'),
      'ui-menu': require('keen-ui/src/UiMenu'),
      'ui-icon': require('keen-ui/src/UiIcon'),
    },
    vuex: {
      actions: {
        logout: actions.kolibriLogout,
        showLoginModal: actions.showLoginModal,
      },
      getters: {
        session: state => state.core.session,
        loggedIn: state => state.core.session.kind[0] !== UserKinds.ANONYMOUS,
        isAdminOrSuperuser: getters.isAdminOrSuperuser,
        isCoachAdminOrSuperuser: getters.isCoachAdminOrSuperuser,
        loginModalVisible: state => state.core.loginModalVisible,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'
  @require '~kolibri.styles.navBarItem'

  $footerheight = 100px

  .nav-wrapper
    top: 0
    background: $core-bg-light
    font-weight: 300
    position: fixed
    z-index: 1001
    font-size: 1em
    height: 100vh
    overflow: auto
    -webkit-overflow-scrolling: touch
    box-shadow: 2px 0 0 0 rgba(0, 0, 0, 0.12)
    .logo
      margin: auto
      display: block

  .nav-main
    background: $core-bg-light

  a.active:focus svg
    fill: $core-bg-light

  .header
    overflow: auto
    overflow-y: hidden
    background-color: $core-text-default
    box-shadow: 0 0 2px rgba(0, 0, 0, 0.12), 0 2px 2px rgba(0, 0, 0, 0.2)
    .logo, .close
      float: left
    .title, .close
      color: $core-bg-light
    .close
      top: 50%
      transform: translateY(-50%)
      position: relative
      border: none
    .title
      font-weight: bold

  .footer
    bottom: 0
    position: absolute
    overflow: auto
    overflow-y: hidden
    background-color: $core-text-default
    height: $footerheight
    .logo, .message-container
      top: 50%
      transform: translateY(-50%)
      position: relative
    .logo
      float: left
    .message-container
      .message
        color: $core-bg-light
        font-size: ($footerheight/10)

  .modal-overlay
    position: fixed
    top: 0
    left: 0
    width: 100%
    height: 100%
    background: rgba(0, 0, 0, 0.7)
    transition: opacity 0.3s ease
    background-attachment: fixed
    z-index: 10

</style>


<style lang="stylus">

  @require '~kolibri.styles.definitions'

  // Customize Keen UI Menu option
  .nav-main
    .ui-menu-option
      margin: 5px 0
      &:not(.is-divider)
        font-size: 1.2em
        &.is-disabled
          .ui-menu-option__icon
            color: $core-action-normal
            font-weight: bold
          color: $core-action-normal
          cursor: default
          font-weight: bold
          opacity: 1
        .ui-menu-option__text
          overflow: visible
        .ui-menu-option__icon
          font-size: 1.2em
      &.is_divider
        background-color: $core-text-annotation
    &.ui-menu
      border: none

</style>
