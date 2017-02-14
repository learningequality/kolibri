<template>
    <div
      class='nav-wrapper'
      v-bind:style="{minHeight: (menuOptions.length - 1)*50 + 173 + 'px'}">
      <div class='header'>
        <button :aria-label="closeNav" class='close' @click="toggleNav"><ui-icon icon='arrow_back'/></button>
        <img class='logo' src="../login-modal/icons/kolibri-logo.svg" alt="">
        <p class='title'>Kolibri</p>
      </div>
      <ui-menu
        class='nav-main'
        :options="menuOptions"
        hasIcons
        @select="navigate"
        role="navigation"
        :aria-label="ariaLabel">
      </ui-menu>
      <!-- log-in modal -->
      <login-modal v-if="loginModalVisible"/>
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
    },
    data: () => ({
      version: __version, // eslint-disable-line no-undef
    }),
    computed: {
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

  .nav-wrapper
    display: table
    table-layout: fixed
    background: $core-bg-light
    font-weight: 300
    position: fixed
    z-index: auto
    @media screen and (min-width: $portrait-breakpoint + 1)
      font-size: 1em
      height: 100%
      width: $nav-width
    @media screen and (max-width: $portrait-breakpoint)
      font-size: 0.8em
      bottom: 0
      width: 100%
      min-width: 300px

  .nav-main
    background: $core-bg-light
    height: 100vh
    @media screen and (max-width: $portrait-breakpoint)
      display: table-row
      height: 56px

  a.active:focus svg
    fill: $core-bg-light

  .nav-icon
    width: 40px
    height: 40px

</style>
