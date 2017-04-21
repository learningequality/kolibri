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
      <span v-if="isSuperuser" class="superuser">{{ $tr('superuser') }}</span>
      <ui-icon-button
        v-if="isUserLoggedIn"
        icon="person"
        type="secondary"
        color="white"
        :ariaLabel="$tr('account')"
        :title="userTooltip"
        has-dropdown
        ref="accountButton">
        <ui-menu
          contain-focus
          contains-icons
          slot="dropdown"
          :options="accountMenuOptions"
          @close="$refs.accountButton.closeDropdown()"
          @select="optionSelected"/>
      </ui-icon-button>
      <a v-else href="/user">
        <ui-button
          type="secondary"
          :ariaLabel="$tr('signIn')"
          class="appbarbutton">
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
      editProfile: 'Edit Profile',
      signOut: 'Sign Out',
      signIn: 'Sign In',
      superuser: 'Signed in as a Device Owner',
      learnerDetails: '{username} (Learner)',
      coachDetails: '{username} (Coach)',
      adminDetails: '{username} (Admin)',
      superuserDetails: '{username} (Device Owner)',
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
      userTooltip() {
        if (this.isSuperuser) {
          return this.$tr('superuserDetails', { username: this.username });
        }
        if (this.isAdmin) {
          return this.$tr('adminDetails', { username: this.username });
        }
        if (this.isCoach) {
          return this.$tr('coachDetails', { username: this.username });
        }
        if (this.isLearner) {
          return this.$tr('learnerDetails', { username: this.username });
        }
        return '';
      },
      accountMenuOptions() {
        return [
          {
            id: 'editProfile',
            label: this.$tr('editProfile'),
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
          case 'editProfile':
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

  .superuser
    font-size: smaller

</style>


<style lang="stylus">

  .app-bar .appbarbutton
    color: white
    &:hover
      background-color: rgba(0, 0, 0, 0.1)
    &.has-dropdown-open
      background-color: rgba(0, 0, 0, 0.1)

</style>
