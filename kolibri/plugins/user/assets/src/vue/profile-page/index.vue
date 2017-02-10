<template>

  <div class="profile-page">
    <div v-if="hasPrivilege('username')" class="input-field">
      <label>Username</label>
      <input autocomplete="username" id="username" type="text"/>
    </div>
    <div v-if="hasPrivilege('name')" class="input-field">
      <label>Name</label>
      <input autocomplete="name" id="name" type="text"/>
    </div>
    <div v-if="hasPrivilege('password')"  class="input-field">
      <label>Password</label>
      <input autocomplete="new-password" id="password" type="password"/>
    </div>
    <div v-if="hasPrivilege('password')"  class="input-field">
      <label>Confirm Password</label>
      <input autocomplete="new-password" id="confirm-password" type="password"/>
    </div>
    <div v-if="hasPrivilege('delete')"  class="input-field">
      <span class="advanced-option">Delete Account</span>
    </div>
    <div class="input-field">
      <button>Update Profile</button>
    </div>
  </div>

</template>


<script>

  module.exports = {
    name: 'profile-page',
    data: () => ({
      username: '',
      name: '',
      password: '',
    }),
    methods: {
      hasPrivilege(privilege) {
        return this.privileges[privilege];
      },
    },
    vuex: {
      getters: {
        privileges: state => state.core.learnerPrivileges,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.coreTheme'

  $input-width = 20em
  $input-vertical-spacing = 1rem

  .profile-page
    position: relative
    top: 50%
    transform: translateY(-50%)

  .input-field
    width: $input-width
    margin-left: auto
    margin-right: auto
    margin-bottom: $input-vertical-spacing

    @media(max-width: $portrait-breakpoint)
      width: 100%

    label
      clear: both
      display: block
      font-size: 0.7em
      margin-bottom: ($input-vertical-spacing / 2)
    input
      width: 100%

    .advanced-option
      color: $core-action-light
      width: 100%
      display: inline-block
      font-size: 0.9em

    button
      width: ($input-width * 0.9)
      height: 3em
      display: block
      margin: auto

</style>
