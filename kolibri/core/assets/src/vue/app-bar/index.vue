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

      <slot name="app-bar-actions"/>
    </div>
  </ui-toolbar>

</template>


<script>

  module.exports = {
    $trNameSpace: 'app-bar',
    $trs: {
      account: 'Account',
      editProfile: 'Edit Profile',
      signOut: 'Sign Out',
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
  };

</script>


<style lang="stylus" scoped></style>
