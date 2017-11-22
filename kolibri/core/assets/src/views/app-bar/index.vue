<template>

  <ui-toolbar
    :title="title"
    type="colored"
    textColor="white"
    class="app-bar"
    @nav-icon-click="$emit('toggleSideNav')"
    :style="{ height: height + 'px' }">

    <div>
      <div class="app-bar-title-icon"></div>
      {{ title }}
    </div>

    <div slot="actions">
      <slot name="app-bar-actions"></slot>

      <ui-button
        ref="userMenuButton"
        icon="person"
        type="primary"
        color="primary"
        class="user-menu-button"
        :ariaLabel="$tr('userMenu')"
        @click="userMenuDropdownIsOpen = !userMenuDropdownIsOpen"
      >
        <template v-if="isUserLoggedIn">{{ username }}</template>
        <mat-svg name="arrow_drop_down" category="navigation" />
      </ui-button>

      <custom-ui-menu
        v-show="userMenuDropdownIsOpen"
        ref="userMenuDropdown"
        class="user-menu-dropdown"
        :options="userMenuOptions"
        :raised="true"
        :containFocus="true"
        @select="optionSelected"
        @close="userMenuDropdownIsOpen = false"
      >
        <template slot="header" v-if="isUserLoggedIn">
          <div class="role">{{ $tr('role') }}</div>
          <div v-if="isAdmin">{{ $tr('admin') }}</div>
          <div v-else-if="isCoach">{{ $tr('coach') }}</div>
          <div v-else-if="isLearner">{{ $tr('learner') }}</div>
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
  import languageSwitcherModal from '../language-switcher/modal';
  export default {
    name: 'appBar',
    components: {
      uiToolbar,
      uiIconButton,
      customUiMenu,
      uiButton,
      languageSwitcherModal,
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
    computed: {
      userMenuOptions() {
        const changeLanguage = {
          id: 'language',
          label: this.$tr('languageSwitchMenuOption'),
        };
        if (this.isUserLoggedIn) {
          return [
            {
              id: 'profile',
              label: this.$tr('profile'),
            },
            changeLanguage,
            {
              id: 'signOut',
              label: this.$tr('signOut'),
            },
          ];
        }
        return [
          {
            id: 'signIn',
            label: this.$tr('signIn'),
          },
          changeLanguage,
        ];
      },
    },
    created() {
      window.addEventListener('click', this.handleClick);
    },
    beforeDestroy() {
      window.removeEventListener('click', this.handleClick);
    },
    methods: {
      optionSelected(option) {
        if (option.id === 'profile') {
          window.location = `/user`;
        } else if (option.id === 'signOut') {
          this.kolibriLogout();
        } else if (option.id === 'signIn') {
          redirectBrowser();
        } else if (option.id === 'language') {
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


<style lang="stylus">

  @require '~kolibri.styles.definitions'

  .override-ui-toolbar
    color: $core-text-default

</style>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .app-bar
    overflow: hidden

  .user-menu-button
    text-transform: none
    svg
      fill: white

  .user-menu-dropdown
    position: fixed
    right: 0
    z-index: 8

  .role
    font-size: small
    margin-bottom: 8px

  // Will display icon in app bar if variables are defined
  .app-bar-title-icon
    background: $app-bar-title-icon
    height: $app-bar-title-icon-height
    width: $app-bar-title-icon-height
    display: inline-block
    vertical-align: middle
    background-size: cover

</style>
