<template>

  <div>
    <div
      v-show="navShown"
      class="side-nav"
      :style="{ width: `${this.width}px` }"
    >
      <div
        class="side-nav-header"
        :style="{ height: headerHeight + 'px', width: `${width}px`, paddingTop: mobile ? '4px' : '8px' }"
      >
        <ui-icon-button
          :aria-label="$tr('closeNav')"
          type="secondary"
          color="white"
          size="large"
          icon="close"
          @click="toggleNav"
        />
        <ui-icon class="side-nav-header-logo"><logo/></ui-icon>
        <span class="side-nav-header-name">Kolibri</span>
      </div>

      <div
        class="side-nav-scrollable-area"
        :style="{ top: `${headerHeight}px`, width: `${width}px` }"
      >
        <ui-menu
          class="side-nav-scrollable-area-menu"
          role="navigation"
          :options="menuOptions"
          :hasIcons="true"
          :aria-label="$tr('navigationLabel')"
          @select="navigate"
        />

        <div class="side-nav-scrollable-area-footer">
          <logo class="side-nav-scrollable-area-footer-logo"/>
          <div class="side-nav-scrollable-area-footer-info">
            <p>{{ footerMsg }}</p>
            <!-- Not translated -->
            <p>© 2017 Learning Equality</p>
          </div>
        </div>
      </div>

    </div>

    <div
      v-if="navShown && mobile"
      class="side-nav-overlay"
      @keydown.esc="toggleNav"
      @click="toggleNav"
    >
    </div>
  </div>

</template>


<script>

  import values from 'lodash/values';
  import {
    isUserLoggedIn,
    isSuperuser,
    isAdmin,
    isCoach,
    canManageContent,
  } from 'kolibri.coreVue.vuex.getters';
  import { kolibriLogout } from 'kolibri.coreVue.vuex.actions';
  import { TopLevelPageNames } from 'kolibri.coreVue.vuex.constants';
  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  import responsiveElement from 'kolibri.coreVue.mixins.responsiveElement';
  import uiMenu from './keen-menu-port';
  import uiIcon from 'keen-ui/src/UiIcon';
  import uiIconButton from 'keen-ui/src/UiIconButton';
  import logo from 'kolibri.coreVue.components.logo';

  export default {
    name: 'sideNav',
    components: {
      uiMenu,
      uiIcon,
      uiIconButton,
      logo,
    },
    mixins: [responsiveWindow, responsiveElement],
    $trs: {
      navigationLabel: 'Main user navigation',
      learn: 'Learn',
      facility: 'Facility',
      coach: 'Coach',
      device: 'Device',
      signIn: 'Sign in',
      profile: 'Profile',
      signOut: 'Sign out',
      about: 'About',
      closeNav: 'Close navigation',
      poweredBy: 'Kolibri {version}',
    },
    props: {
      topLevelPageName: {
        type: String,
        validator(value) {
          if (!value) {
            return true;
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
    computed: {
      mobile() {
        return this.windowSize.breakpoint < 2;
      },
      footerMsg() {
        return this.$tr('poweredBy', { version: __version });
      },
      menuOptions() {
        const options = [
          {
            label: this.$tr('learn'),
            active: this.pageIsActive(TopLevelPageNames.LEARN),
            icon: 'school',
            href: '/learn',
          },
        ];
        if (this.isCoach || this.isAdmin || this.isSuperuser) {
          options.push({
            label: this.$tr('coach'),
            active: this.pageIsActive(TopLevelPageNames.COACH),
            icon: 'assessment',
            href: '/coach',
          });
        }
        if (this.isAdmin || this.isSuperuser) {
          options.push({
            label: this.$tr('facility'),
            active: this.pageIsActive(TopLevelPageNames.MANAGE),
            icon: 'settings_input_antenna',
            href: '/management/facility',
          });
        }
        if (this.canManageContent || this.isSuperuser) {
          options.push({
            label: this.$tr('device'),
            active: this.pageIsActive(TopLevelPageNames.DEVICE),
            icon: 'tablet_mac',
            href: '/management/device',
          });
        }
        options.push({ type: 'divider' });
        if (this.isUserLoggedIn) {
          options.push({
            label: this.$tr('profile'),
            active: this.pageIsActive(TopLevelPageNames.USER),
            icon: 'account_circle',
            href: '/user',
          });
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
      pageIsActive(pageName) {
        return this.topLevelPageName === pageName;
      },
    },
    vuex: {
      actions: { signOut: kolibriLogout },
      getters: {
        session: state => state.core.session,
        isUserLoggedIn: isUserLoggedIn,
        isSuperuser: isSuperuser,
        isAdmin: isAdmin,
        isCoach: isCoach,
        canManageContent: canManageContent,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .side-nav
    position: fixed
    top: 0
    bottom: 0
    z-index: 16
    background: $core-bg-light
    box-shadow: 2px 0 0 0 rgba(0, 0, 0, 0.12)

  .side-nav-header
    position: fixed
    top: 0
    left: 0
    z-index: 17
    font-size: 14px
    text-transform: uppercase
    overflow: hidden
    background-color: $core-text-default
    box-shadow: 0 0 2px rgba(0, 0, 0, 0.12), 0 2px 2px rgba(0, 0, 0, 0.2)

  .side-nav-header-name
    margin-left: 8px
    color: $core-bg-light
    font-weight: bold
    vertical-align: middle

  .side-nav-header-logo
    font-size: 40px

  .side-nav-scrollable-area
    position: fixed
    left: 0
    bottom: 0
    overflow: auto

  .side-nav-scrollable-area-menu
    width: 100%

  .side-nav-scrollable-area-footer
    padding: 16px

  .side-nav-scrollable-area-footer-logo
    width: 40px
    height: 40px

  .side-nav-scrollable-area-footer-info
    font-size: x-small

  .side-nav-overlay
    position: fixed
    top: 0
    left: 0
    width: 100%
    height: 100%
    background: rgba(0, 0, 0, 0.7)
    transition: opacity 0.3s ease
    background-attachment: fixed
    z-index: 15

</style>


<style lang="stylus">

  @require '~kolibri.styles.definitions'

  // Customize Keen UI Menu option
  .side-nav-scrollable-area-menu
    .ui-menu-option
      margin: 5px 0
      &:not(.is-divider)
        font-size: 14px
        &.is-active
          .ui-menu-option-icon
            color: $core-accent-color
          color: $core-accent-color
          font-weight: bold
          opacity: 1
        .ui-menu-option-text
          overflow: visible
        .ui-menu-option-icon
          font-size: 1.2em
      &.is_divider
        background-color: $core-text-annotation
    &.ui-menu
      border: none
      max-width: 320px

</style>
