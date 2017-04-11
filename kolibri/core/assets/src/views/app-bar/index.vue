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
      <ui-icon-button
        v-if="isUserLoggedIn"
        icon="person"
        type="secondary"
        color="white"
        :ariaLabel="$tr('account')"
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

  module.exports = {
    $trNameSpace: 'appBar',
    $trs: {
      account: 'Account',
      editProfile: 'Edit Profile',
      signOut: 'Sign Out',
      signIn: 'Sign In',
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
        isUserLoggedIn,
      },
    },
  };

</script>


<style lang="stylus">

  .app-bar .appbarbutton
    color: white
    &:hover
      background-color: rgba(0, 0, 0, 0.1)
    &.has-dropdown-open
      background-color: rgba(0, 0, 0, 0.1)

</style>
