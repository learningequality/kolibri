<template>

  <ui-toolbar
    :title="title"
    type="colored"
    textColor="white"
    class="app-bar"
    :removeNavIcon="navShown"
    @nav-icon-click="$emit('toggleSideNav')"
    :style="{ height: height + 'px' }">
    <div slot="actions">
      <slot name="app-bar-actions"/>
      <ui-button
        v-if="isUserLoggedIn"
        icon="person"
        type="primary"
        color="primary"
        :ariaLabel="$tr('account')"
        :has-dropdown="true"
        ref="accountButton"
        class="username-text">
        {{ username }}
        <template v-if="isSuperuser">({{ $tr('superuser') }})</template>
        <template v-if="isAdmin">({{ $tr('admin') }})</template>
        <template v-if="isCoach">({{ $tr('coach') }})</template>
        <ui-menu
          slot="dropdown"
          :options="accountMenuOptions"
          @close="$refs.accountButton.closeDropdown()"
          @select="optionSelected"
        />
      </ui-button>
      <a v-else href="/user">
        <ui-button
          type="primary"
          color="primary"
          :ariaLabel="$tr('signIn')">
          {{ $tr('signIn') }}
        </ui-button>
      </a>
    </div>
  </ui-toolbar>

</template>


<script>

  const kolibriLogout = require('kolibri.coreVue.vuex.actions').kolibriLogout;
  const isUserLoggedIn = require('kolibri.coreVue.vuex.getters').isUserLoggedIn;
  const isSuperuser = require('kolibri.coreVue.vuex.getters').isSuperuser;
  const isAdmin = require('kolibri.coreVue.vuex.getters').isAdmin;
  const isCoach = require('kolibri.coreVue.vuex.getters').isCoach;
  const isLearner = require('kolibri.coreVue.vuex.getters').isUserLoggedIn;

  module.exports = {
    $trNameSpace: 'appBar',
    $trs: {
      account: 'Account',
      profile: 'Profile',
      signOut: 'Sign Out',
      signIn: 'Sign In',
      superuser: 'Device owner',
      admin: 'Admin',
      coach: 'Coach',
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
    components: {
      'ui-toolbar': require('keen-ui/src/UiToolbar'),
      'ui-icon-button': require('keen-ui/src/UiIconButton'),
      'ui-menu': require('keen-ui/src/UiMenu'),
      'ui-button': require('keen-ui/src/UiButton'),
    },
    computed: {
      accountMenuOptions() {
        return [
          {
            id: 'profile',
            label: this.$tr('profile'),
          },
          {
            id: 'signOut',
            label: this.$tr('signOut'),
          },
        ];
      },
    },
    methods: {
      optionSelected(option) {
        switch (option.id) {
          case 'profile':
            window.location = `/user`;
            break;
          case 'signOut':
            this.kolibriLogout();
            break;
          default:
            break;
        }
      },
    },
    vuex: {
      actions: {
        kolibriLogout,
      },
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

  .username-text
    text-transform: none

</style>
