<template>

  <div class="profile-page">
    <div v-if="error" class="error ">
      {{errorMessage}}
    </div>
    <div v-if="success" class="success">
      {{$tr('success')}}
    </div>
    <form @focus.capture="" @submit.prevent="submitEdits">
      <div v-if="hasPrivilege('username')" class="input-field">
        <label>Username</label>
        <input v-model.lazy="username" autocomplete="username" id="username" type="text"/>
      </div>
      <div v-if="hasPrivilege('name')" class="input-field">
        <label>Name</label>
        <input v-model.lazy="full_name" autocomplete="name" id="name" type="text"/>
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
        <button :disabled="busy" type="submit">Update Profile</button>
      </div>
    </form>
  </div>

</template>


<script>

  const actions = require('../../actions');

  module.exports = {
    name: 'profile-page',
    $trNameSpace: 'profile-page',
    $trs: {
      genericError: 'Something went wrong',
      success: 'Changes successfully made',
    },
    data() {
      return {
        username: this.session.username,
        full_name: this.session.full_name,
        password: '',
        confirm_password: '',
      };
    },
    watch: {
      // going to be used for validation
      // username() {return;},
      // confirm_password() {return this.passwordsMatch();},
    },
    computed: {
      errorMessage() {
        if (this.error) {
          if (this.backendErrorMessage) {
            return this.backendErrorMessage;
          }
          return this.$tr('genericError');
        }
        return '';
      },
    },
    methods: {
      hasPrivilege(privilege) {
        return this.privileges[privilege];
      },
      passwordsMatch() {
        return this.password === this.confirm_password;
      },
      submitEdits() {
        // if (this.passwordsMatch()) {
        const edits = {
          username: this.username,
          full_name: this.full_name,
          password: this.password,
        };
        this.editProfile(edits, this.session);
        // }
      },
    },
    vuex: {
      getters: {
        privileges: state => state.core.learnerPrivileges,
        session: state => state.core.session,
        error: state => state.pageState.error,
        success: state => state.pageState.success,
        busy: state => state.pageState.busy,
        backendErrorMessage: state => state.pageState.errorMessage,
      },
      actions: {
        editProfile: actions.editProfile,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  $input-width = 20em
  $input-vertical-spacing = 1rem

  .profile-page
    position: relative
    top: 50%
    transform: translateY(-50%)

  .input-field, .error, .success
    width: $input-width
    margin-left: auto
    margin-right: auto
    margin-bottom: $input-vertical-spacing

    @media(max-width: $portrait-breakpoint)
      width: 100%

  .input-field
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
  .error
    background-color: red
    font-size: 2em
    color: white
  .success
    background-color: green
    font-size: 2em
    color: white

</style>
