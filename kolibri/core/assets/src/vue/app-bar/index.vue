<template>

  <ui-toolbar
    :title="title"
    type="colored"
    textColor="white"
    class="app-bar"
    @nav-icon-click="toggleDrawer">
    <div slot="actions">

      <ui-icon-button
        icon="person"
        type="secondary"
        color="white"
        size="large"
        :ariaLabel="$tr('account')"
        has-dropdown
        ref="accountButton">
        <ui-menu
          contain-focus
          contains-icons
          slot="dropdown"
          :options="accountMenuOptions"
          @close="$refs.accountButton.closeDropdown()"/>
      </ui-icon-button>

      <ui-icon-button
        icon="search"
        type="secondary"
        color="white"
        size="large"
        :ariaLabel="$tr('search')"
        @click="openSearch"/>

      <ui-icon-button
        icon="widgets"
        type="secondary"
        color="white"
        size="large"
        :ariaLabel="$tr('channelSwitcher')"
        @click="openChannelSwitcher"/>
    </div>
  </ui-toolbar>

</template>


<script>

  module.exports = {
    $trNameSpace: 'app-bar',
    $trs: {
      account: 'account',
      search: 'search',
      channelSwitcher: 'Channel Switcher',
      editProfile: 'Edit Profile',
      signOut: 'Sign Out',
    },
    props: {
      title: {
        type: String,
        required: true,
      },
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
      toggleDrawer() {
        console.log('toggleDrawer');
      },
      openSearch() {
        console.log('openSearch');
      },
      openChannelSwitcher() {
        console.log('openChannelSwitcher');
      },
    },
    components: {
      'ui-toolbar': require('keen-ui/src/UiToolbar'),
      'ui-icon-button': require('keen-ui/src/UiIconButton'),
      'ui-menu': require('keen-ui/src/UiMenu'),
    },
  };

</script>


<style lang="stylus" scoped></style>
