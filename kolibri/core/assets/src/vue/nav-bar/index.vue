<template>
  <div v-show="navShown">
    <div
      class='nav-wrapper'
      v-bind:style="wrapperStyle">
      <div class='header'>
        <button v-if="mobile" :aria-label="closeNav" class='close' @click="toggleNav"><ui-icon icon='arrow_back'/></button>
        <img class='logo' v-if="mobile" src="../login-modal/icons/kolibri-logo.svg" alt="">
        <p class='title'>Kolibri</p>
      </div>
      <img class='logo' v-if="!mobile" src="../login-modal/icons/kolibri-logo.svg" alt="">
      <ui-menu
        class='nav-main'
        :options="menuOptions"
        hasIcons
        @select="navigate"
        role="navigation"
        :aria-label="ariaLabel">
      </ui-menu>
      <div class='footer'>
        <img class='logo' src="../login-modal/icons/kolibri-logo.svg" alt="">
        <div class='message-container'>
          <p class='message'>{{ footerMsg }}</p>
          <p class='message'><ui-icon icon='copyright'/> 2017 Learning Equality</p>
        </div>
      </div>
      <!-- log-in modal -->
      <login-modal v-if="loginModalVisible"/>
    </div>
    <div v-if="mobile" class="modal-overlay"
      @keydown.esc="toggleNav"
      @click="toggleNav">
    </div>
</template>


<script>

  const values = require('lodash.values');
  const getters = require('kolibri.coreVue.vuex.getters');
  const TopLevelPageNames = require('kolibri.coreVue.vuex.constants').TopLevelPageNames;
  const UserKinds = require('kolibri.coreVue.vuex.constants').UserKinds;


  module.exports = {
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
      navShownMobile: {
        type: Boolean,
        required: true,
      }
    },
    methods: {
      navigate(option) {
        window.location.href = option.href;
      },
      toggleNav() {
        this.$emit('toggleSideNav');
      },
    },
    computed: {
      wrapperStyle() {
        let styles = {
          minHeight: (this.menuOptions.length - 1)*50 + 173 + 'px',
        };
        return styles;
      },
      navShown() {
        return this.navShownMobile || !this.mobile;
      },
      mobile() {
        return false;
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
      settingsActive() {
        return this.topLevelPageName === TopLevelPageNames.SETTINGS;
      },
      aboutActive() {
        return this.topLevelPageName === TopLevelPageNames.ABOUT;
      },
      menuOptions() {
        let options = [
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
        if (!this.isAdminOrSuperuser) {
          options.push({
            label: this.$tr('profile'),
            disabled: this.profileActive,
            icon: 'account_circle',
            href: '/management',
          });
        }
        options.push(...[
          {
            label: this.$tr('settings'),
            disabled: this.settingsActive,
            icon: 'settings',
          },
          {
            label: this.$tr('about'),
            disabled: this.aboutActive,
            icon: 'error_outline',
          },
          {
            label: this.loggedIn ? this.$tr('logOut') : this.$tr('signIn'),
            icon: 'exit_to_app',
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

  $headerheight = 57px
  $footerheight = 100px

  .nav-wrapper
    top: 0px
    background: $core-bg-light
    font-weight: 300
    position: fixed
    z-index: 1001
    font-size: 1em
    height: 100vh
    width: $nav-width
    overflow: auto
    -webkit-overflow-scrolling: touch
    .logo
      margin: auto
      display: block
      height: 125px
      width: @height

  .nav-main
    background: $core-bg-light
    max-width: $nav-width

  a.active:focus svg
    fill: $core-bg-light

  .header
    overflow: auto
    overflow-y: hidden
    background-color: $core-text-default
    height: $headerheight
    .logo, .title, .close
      float: left
    .title, .close
      color: $core-bg-light
    .close
      font-size: ($headerheight / 2)
      top: 50%
      transform: translateY(-50%)
      position: relative
      margin-right: ($nav-width/20)
      margin-left: ($nav-width/20)
      border: none
    .title
      font-size: ($headerheight / 3)
      font-weight: bold
    .logo
      width: $headerheight
      height: @width
      margin-right: ($nav-width/20)

  .footer
    bottom: 0
    position: absolute
    overflow: auto
    overflow-y: hidden
    background-color: $core-text-default
    height: $footerheight
    width: $nav-width
    .logo, .message-container
      top: 50%
      transform: translateY(-50%)
      position: relative
    .logo
      float: left
      width: ($footerheight/2)
      height: @width
      margin-right: ($nav-width/20)
      margin-left: ($nav-width/20)
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
      margin: 5px 0px
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
