<template>

  <ui-toolbar
    :title="title"
    type="colored"
    textColor="white"
    class="app-bar"
    :style="{ height: height + 'px' }"
  >
    <ui-icon-button
      slot="icon"
      type="secondary"
      @click="$emit('toggleSideNav')"
    >
      <mat-svg
        class="icon"
        name="menu"
        category="navigation"
      />
    </ui-icon-button>

    <div>
      <div class="app-bar-title-icon"></div>
      {{ title }}
    </div>

    <div slot="actions">
      <slot name="app-bar-actions"></slot>

      <ui-button
        ref="userMenuButton"
        type="primary"
        color="primary"
        class="user-menu-button"
        :ariaLabel="$tr('userMenu')"
        @click="userMenuDropdownIsOpen = !userMenuDropdownIsOpen"
      >
        <mat-svg
          slot="icon"
          name="person"
          category="social"
        />
        <template v-if="isUserLoggedIn">{{ username }}</template>
        <mat-svg name="arrow_drop_down" category="navigation" />
      </ui-button>

      <custom-ui-menu
        v-show="userMenuDropdownIsOpen"
        ref="userMenuDropdown"
        class="user-menu-dropdown"
        :raised="true"
        :containFocus="true"
        :hasIcons="true"
        @close="userMenuDropdownIsOpen = false"
      >
        <template slot="header" v-if="isUserLoggedIn">
          <div class="role">{{ $tr('role') }}</div>
          <div v-if="isAdmin">{{ $tr('admin') }}</div>
          <div v-else-if="isCoach">{{ $tr('coach') }}</div>
          <div v-else-if="isLearner">{{ $tr('learner') }}</div>
        </template>

        <template slot="options">
          <template v-if="isUserLoggedIn">
            <menu-option
              :label="$tr('profile')"
              @select="selectOption($tr('profile'))"
            />
            <menu-option
              :label="$tr('languageSwitchMenuOption')"
              @select="selectOption($tr('languageSwitchMenuOption'))"
            >
              <mat-svg
                slot="icon"
                name="language"
                category="action"
              />
            </menu-option>
            <menu-option
              :label="$tr('signOut')"
              @select="selectOption($tr('signOut'))"
            />
          </template>

          <template v-else>
            <menu-option
              :label="$tr('signIn')"
              @select="selectOption($tr('signIn'))"
            />
            <menu-option
              :label="$tr('languageSwitchMenuOption')"
              @select="selectOption($tr('languageSwitchMenuOption'))"
            >
              <mat-svg
                slot="icon"
                name="language"
                category="action"
              />
            </menu-option>
          </template>
        </template>
      </custom-ui-menu>

      <language-switcher-modal
        v-if="showLanguageModal"
        @close="showLanguageModal = false"
        class="override-ui-toolbar"
      />
    </div>
  </ui-toolbar>

</template>


<script>

  import { kolibriLogout } from 'kolibri.coreVue.vuex.actions';
  import { isUserLoggedIn, isAdmin, isCoach, isLearner } from 'kolibri.coreVue.vuex.getters';
  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  import uiToolbar from 'keen-ui/src/UiToolbar';
  import uiIconButton from 'keen-ui/src/UiIconButton';
  import customUiMenu from 'kolibri.coreVue.components.customUiMenu';
  import uiButton from 'keen-ui/src/UiButton';
  import { redirectBrowser } from 'kolibri.utils.browser';
  import languageSwitcherModal from './language-switcher/modal';
  import menuOption from './custom-ui-menu/menu-option';

  export default {
    name: 'appBar',
    components: {
      uiToolbar,
      uiIconButton,
      customUiMenu,
      uiButton,
      languageSwitcherModal,
      menuOption,
    },
    mixins: [responsiveWindow],
    $trs: {
      account: 'Account',
      profile: 'Profile',
      signOut: 'Sign out',
      signIn: 'Sign in',
      role: 'Role',
      admin: 'Admin',
      coach: 'Coach',
      learner: 'Learner',
      languageSwitchMenuOption: 'Change language',
      userMenu: 'User menu',
    },
    props: {
      title: {
        type: String,
        required: true,
      },
      navShown: {
        type: Boolean,
        required: true,
      },
      height: {
        type: Number,
        required: true,
      },
    },
    data: () => ({
      showLanguageModal: false,
      userMenuDropdownIsOpen: false,
    }),
    created() {
      window.addEventListener('click', this.handleClick);
    },
    beforeDestroy() {
      window.removeEventListener('click', this.handleClick);
    },
    methods: {
      selectOption(option) {
        if (option === this.$tr('profile')) {
          window.location = `/user`;
        } else if (option === this.$tr('signOut')) {
          this.kolibriLogout();
        } else if (option === this.$tr('signIn')) {
          redirectBrowser();
        } else if (option === this.$tr('languageSwitchMenuOption')) {
          this.showLanguageModal = true;
        }
      },
      handleClick(event) {
        if (
          !this.$refs.userMenuDropdown.$el.contains(event.target) &&
          !this.$refs.userMenuButton.$el.contains(event.target) &&
          this.userMenuDropdownIsOpen
        ) {
          this.userMenuDropdownIsOpen = false;
        }
      },
    },
    vuex: {
      actions: { kolibriLogout },
      getters: {
        username: state => state.core.session.username,
        isUserLoggedIn,
        isAdmin,
        isCoach,
        isLearner,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  >>>.override-ui-toolbar
    color: $core-text-default

  .app-bar
    overflow: hidden

  .user-menu-button
    text-transform: none
    vertical-align: middle
    svg
      fill: white

  .user-menu-dropdown
    position: fixed
    right: 0
    z-index: 8

  .role
    font-size: small
    font-weight: bold
    margin-bottom: 8px

  // Will display icon in app bar if variables are defined
  .app-bar-title-icon
    background: $app-bar-title-icon
    height: $app-bar-title-icon-height
    width: $app-bar-title-icon-height
    display: inline-block
    vertical-align: middle
    background-size: cover

  .icon
    fill: white

</style>
