<template>

  <div>
    <div
      v-show="navShown"
      class="nav-wrapper"
      :style="wrapperStyle">
      <div class="header"
           :style="{ height: headerHeight + 'px', paddingTop: mobile ? '4px' : '8px', width: width + 'px' }">
        <ui-icon-button
          @click="toggleNav"
          type="secondary"
          color="white"
          size="large"
          icon="keyboard_arrow_left"
          :aria-label="closeNav"/>
        <logo
          class="header-logo"/>
        <span class="title">Kolibri</span>
      </div>
      <div class="scrollable-nav" :style="{ width: width + 'px', paddingTop: `${headerHeight + 16}px` }">
        <ui-menu
          class="nav-main"
          :options="menuOptions"
          hasIcons
          @select="navigate"
          role="navigation"
          :aria-label="ariaLabel"
          :style="{ width: width + 'px' }">
        </ui-menu>
      </div>
      <div class="footer" :style="{ width: width + 'px' }">
        <logo
          class="logo"
          :style="{ width: width/6 + 'px', height: width/6 + 'px', marginLeft: width/20 + 'px', marginRight: width/20 + 'px' }"/>
        <div class="message-container">
          <p class="message">{{ footerMsg }}</p>
          <p class="message">
            <ui-icon icon="copyright"/>
            {{ $tr('learningEqualityCopyright') }}
          </p>
        </div>
      </div>
    </div>

    <div v-if="navShown && mobile" class="modal-overlay"
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
      manage: 'Manage',
      coach: 'Coach',
      signIn: 'Sign in',
      profile: 'Profile',
      signOut: 'Sign out',
      about: 'About',
      closeNav: 'Close navigation',
      poweredBy: 'Kolibri {version}',
      learningEqualityCopyright: '2017 Learning Equality',
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
        this.$emit('toggleSideNav');
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
        return (this.windowSize.breakpoint > 1) && (this.windowSize.breakpoint < 5);
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
        return (this.topLevelPageName === TopLevelPageNames.LEARN);
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
            href: '/learn',
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
        if (this.isUserLoggedIn & !this.isAdminOrSuperuser) {
          options.push({
            label: this.$tr('profile'),
            disabled: this.profileActive,
            icon: 'account_circle',
            href: '/user',
          });
        }
        /*
         options.push({
         label: this.$tr('about'),
         disabled: this.aboutActive,
         icon: 'error_outline',
         });
         */
        if (this.isUserLoggedIn) {
          options.push({
            label: this.$tr('signOut'),
            icon: 'exit_to_app',
            action: this.signOut,
          });
        } else {
          options.push({
            label: this.$tr('signIn'),
            icon: 'exit_to_app',
            href: '/user',
          });
        }
        return options;
      },
    },
    components: {
      'session-nav-widget': require('kolibri.coreVue.components.sessionNavWidget'),
      'nav-bar-item': require('kolibri.coreVue.components.navBarItem'),
      'ui-menu': require('keen-ui/src/UiMenu'),
      'ui-icon': require('keen-ui/src/UiIcon'),
      'ui-icon-button': require('keen-ui/src/UiIconButton'),
      'logo': require('kolibri.coreVue.components.logo'),
    },
    vuex: {
      actions: {
        signOut: actions.kolibriLogout,
      },
      getters: {
        session: state => state.core.session,
        isUserLoggedIn: getters.isUserLoggedIn,
        isAdminOrSuperuser: getters.isAdminOrSuperuser,
        isCoachAdminOrSuperuser: getters.isCoachAdminOrSuperuser,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'
  @require '~kolibri.styles.navBarItem'

  $footerheight = 152px

  .nav-wrapper
    top: 0
    background: $core-bg-light
    font-weight: 300
    position: fixed
    z-index: 1001
    font-size: 1em
    height: 100%
    overflow: auto
    -webkit-overflow-scrolling: touch
    box-shadow: 2px 0 0 0 rgba(0, 0, 0, 0.12)
    .header-logo
      display: inline-block
      vertical-align: middle
      height: 1.5em
      margin-right: 0.25em
    .logo
      margin: auto
      display: inline-block

  .nav-main
    background: $core-bg-light

  a.active:focus svg
    fill: $core-bg-light

  .header
    position: absolute
    z-index: 1003
    top: 0
    left: 0
    font-size: 14px
    text-transform: uppercase
    overflow: auto
    overflow-y: hidden
    background-color: $core-text-default
    box-shadow: 0 0 2px rgba(0, 0, 0, 0.12), 0 2px 2px rgba(0, 0, 0, 0.2)
    .close
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
      vertical-align: middle

  .scrollable-nav
    position: absolute
    z-index: 1002
    top: 0
    left: 0
    padding-bottom: $footerheight + 16
    height: 100%
    overflow: auto

  .footer
    position: absolute
    z-index: 1003
    bottom: 0
    left: 0
    overflow: hidden
    background-color: $core-text-default
    padding-top: 1em
    padding-bottom: 1em
    .logo
      float: left
    .message-container
      .message
        color: $core-bg-light
        font-size: x-small

  .modal-overlay
    position: fixed
    top: 0
    left: 0
    width: 100%
    height: 100%
    background: rgba(0, 0, 0, 0.7)
    transition: opacity 0.3s ease
    background-attachment: fixed
    z-index: 60

</style>


<style lang="stylus">

  @require '~kolibri.styles.definitions'

  // Customize Keen UI Menu option
  .nav-main
    .ui-menu-option
      margin: 5px 0
      &:not(.is-divider)
        font-size: 14px
        &.is-disabled
          .ui-menu-option__icon
            color: $core-accent-color
          color: $core-accent-color
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
      max-width: 320px

</style>
