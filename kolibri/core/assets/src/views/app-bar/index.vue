<template>

  <ui-toolbar
    :title="title"
    type="colored"
    textColor="white"
    class="app-bar"
    @nav-icon-click="$emit('toggleSideNav')"
    :style="{ height: height + 'px' }">
    <div slot="actions">
      <slot name="app-bar-actions"/>

      <ui-button
        icon="person"
        type="primary"
        color="primary"
        :ariaLabel="$tr('account')"
        :has-dropdown="true"
        ref="accountButton"
        class="username-text"
      >
        <template v-if="isUserLoggedIn">{{ username }}</template>

        <keen-menu-port
          slot="dropdown"
          :options="accountMenuOptions"
          @close="$refs.accountButton.closeDropdown()"
          @select="optionSelected"
        >
          <template slot="header" v-if="isUserLoggedIn">
            <div class="role">{{ $tr('role') }}</div>
            <div v-if="isAdmin">{{ $tr('admin') }}</div>
            <div v-else-if="isCoach">{{ $tr('coach') }}</div>
            <div v-else-if="isLearner">{{ $tr('learner') }}</div>
          </template>
        </keen-menu-port>
      </ui-button>
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
  import keenMenuPort from '../side-nav/keen-menu-port';
  import uiButton from 'keen-ui/src/UiButton';
  import { redirectBrowser } from 'kolibri.utils.browser';
  import languageSwitcherModal from '../language-switcher/modal';
  export default {
    mixins: [responsiveWindow],
    name: 'appBar',
    $trs: {
      account: 'Account',
      profile: 'Profile',
      signOut: 'Sign Out',
      signIn: 'Sign In',
      role: 'Role',
      admin: 'Admin',
      coach: 'Coach',
      learner: 'Learner',
      languageSwitchMenuOption: 'Change language',
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
    }),
    components: {
      uiToolbar,
      uiIconButton,
      keenMenuPort,
      uiButton,
      languageSwitcherModal,
    },
    computed: {
      accountMenuOptions() {
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

  .app-bar
    overflow: hidden

  .username-text
    text-transform: none

  .role
    font-size: small
    margin-bottom: 8px

</style>
