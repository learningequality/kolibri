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
        class="username-text">
        <template v-if="windowSize.breakpoint > 2">
          <template v-if="isUserLoggedIn">
            {{ username }}
            <template v-if="isSuperuser">{{ $tr('superuser') }}</template>
            <template v-if="isAdmin">{{ $tr('admin') }}</template>
            <template v-if="isCoach">{{ $tr('coach') }}</template>
          </template>
          <template v-else>{{ $tr('guest') }}</template>
        </template>
        <ui-menu
          slot="dropdown"
          :options="accountMenuOptions"
          @close="$refs.accountButton.closeDropdown()"
          @select="optionSelected"
        />
      </ui-button>
      <language-switcher :modalOpen="showLanguageModal" @close="showLanguageModal=false"/>
    </div>
  </ui-toolbar>

</template>


<script>

  import { kolibriLogout } from 'kolibri.coreVue.vuex.actions';
  import {
    isUserLoggedIn,
    isSuperuser,
    isAdmin,
    isCoach,
    isLearner,
  } from 'kolibri.coreVue.vuex.getters';
  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  import uiToolbar from 'keen-ui/src/UiToolbar';
  import uiIconButton from 'keen-ui/src/UiIconButton';
  import uiMenu from 'keen-ui/src/UiMenu';
  import uiButton from 'keen-ui/src/UiButton';
  import { redirectBrowser } from '../../utils/browser';
  import languageSwitcher from '../language-switcher';
  export default {
    mixins: [responsiveWindow],
    name: 'appBar',
    $trs: {
      account: 'Account',
      profile: 'Profile',
      signOut: 'Sign Out',
      signIn: 'Sign In',
      superuser: '(Device owner)',
      admin: '(Admin)',
      coach: '(Coach)',
      guest: 'Guest',
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
      uiMenu,
      uiButton,
      languageSwitcher,
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
        isSuperuser,
        isAdmin,
        isCoach,
        isLearner,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  .app-bar
    overflow: hidden

  .username-text
    text-transform: none

</style>
