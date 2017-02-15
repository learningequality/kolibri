<template>

  <div>
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
          ref="dropdownButton">
          <ui-menu
            contain-focus
            has-icons
            slot="dropdown"
            :options="accountMenuOptions"
            @close="$refs.dropdownButton.closeDropdown()"
          ></ui-menu>
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
  </div>

</template>


<script>

  module.exports = {
    $trNameSpace: 'app-bar',
    $trs: {
      account: 'account',
      search: 'search',
      channelSwitcher: 'Channel Switcher',
    },
    props: {
      title: {
        type: String,
        required: true,
      },
    },
    data: () => ({
      accountMenuOptions: [
        {
          id: 'editProfile',
          label: 'Edit Profile',
          icon: 'edit',
        },
        {
          id: 'signOut',
          label: 'Sign Out',
          icon: 'content_copy',
        },
      ],
    }),
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


<style lang="stylus" scoped>

  .app-bar
    // TODO: remove this
    z-index: 1000

</style>
