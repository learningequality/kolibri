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
          icon="close"
          :aria-label="closeNav"/>
        <ui-icon class="header-logo"><logo/></ui-icon>
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
            <!-- Not translated -->
            © 2017 Learning Equality
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

  import values from 'lodash/values';
  import * as getters from 'kolibri.coreVue.vuex.getters';
  import * as actions from 'kolibri.coreVue.vuex.actions';
  import { TopLevelPageNames } from 'kolibri.coreVue.vuex.constants';
  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  import responsiveElement from 'kolibri.coreVue.mixins.responsiveElement';
  import uiMenu from './keen-menu-port';
  import uiIcon from 'keen-ui/src/UiIcon';
  import uiIconButton from 'keen-ui/src/UiIconButton';
  import logo from 'kolibri.coreVue.components.logo';
  export default {
    mixins: [responsiveWindow, responsiveElement],
    name: 'navbar',
    $trs: {
      navigationLabel: 'Main user navigation',
      learn: 'Learn',
      facility: 'Facility',
      coach: 'Coach',
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
    computed: {
      closeStyle() {
        return {
          fontSize: `${this.headerHeight / 2}px`,
          marginLeft: `${this.width / 20}px`,
          marginRight: `${this.width / 20}px`,
        };
      },
      wrapperStyle() {
        // Calculate min-height property by taking the number of options (minus the divider)
        // multipying by 50 for each option, adding 173 for the divider and the footer,
        // and finally adding this.width/2.5 for the non-mobile logo if needed.
        return {
          minHeight: `${(this.menuOptions.length - 1) * 50 +
            173 +
            (!this.mobile ? this.width / 2.5 : 0)}px`,
          width: `${this.width}px`,
        };
      },
      mobile() {
        return this.windowSize.breakpoint < 2;
      },
      tablet() {
        return this.windowSize.breakpoint > 1 && this.windowSize.breakpoint < 5;
      },
      footerMsg() {
        return this.$tr('poweredBy', { version: __version });
      },
      closeNav() {
        return this.$tr('closeNav');
      },
      ariaLabel() {
        return this.$tr('navigationLabel');
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
        if (this.isAdmin || this.isSuperuser || this.isCoach) {
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
            href: '/management',
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
    components: {
      uiMenu,
      uiIcon,
      uiIconButton,
      logo,
    },
    vuex: {
      actions: { signOut: actions.kolibriLogout },
      getters: {
        session: state => state.core.session,
        isUserLoggedIn: getters.isUserLoggedIn,
        isSuperuser: getters.isSuperuser,
        isAdmin: getters.isAdmin,
        isCoach: getters.isCoach,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  $footerheight = 152px

  .nav-wrapper
    top: 0
    background: $core-bg-light
    font-weight: 300
    position: fixed
    z-index: 16
    font-size: 1em
    height: 100%
    overflow: auto
    -webkit-overflow-scrolling: touch
    box-shadow: 2px 0 0 0 rgba(0, 0, 0, 0.12)
    .header-logo
      font-size: 3em
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
    z-index: 17
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
    top: 0
    left: 0
    padding-bottom: $footerheight + 16
    height: 100%
    overflow: auto

  .footer
    position: absolute
    z-index: 17
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
    z-index: 15

</style>


<style lang="stylus">

  @require '~kolibri.styles.definitions'

  // Customize Keen UI Menu option
  .nav-main
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
