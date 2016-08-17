<template>

  <div class="user-creation-modal">
    <modal v-ref:modal btntext="Add New">

      <h1 slot="header" class="header">Add New Account</h1>

      <div @keyup.enter="createNewUser" slot="body">

        <div class="user-field">
          <label for="name">Name</label>
          <input @focus="clearErrorMessage" type="text" class="add-form" id="name" autocomplete="name"  autofocus="true" required v-model="full_name">
        </div>

        <div class="user-field">
          <label for="username">Username</label>
          <input @focus="clearErrorMessage" type="text" class="add-form" autocomplete="username" id="username" required v-model="username">
        </div>

        <div class="user-field">
          <label for="password">Password</label>
          <input @focus="clearErrorMessage" type="password" class="add-form" id="password" required v-model="password">
        </div>

        <div class="user-field">
          <label for="confirm-password">Confirm Password</label>
          <input @focus="clearErrorMessage" type="password" class="add-form" id="confirm-password" required v-model="passwordConfirm">
        </div>

        <div class="user-field">
          <label for="user-role"><span class="visuallyhidden">User Role</span></label>
          <select @focus="clearErrorMessage" v-model="role" id="user-role">
          <option value="learner" selected> Learner </option>
          <option value="admin"> Admin </option>
          </select>
        </div>

      </div>

      <div class="footer" slot="footer">
        <p class="error-message" v-if="errorMessage">{{errorMessage}}</p>
        <button class="create-btn" type="button" @click="createNewUser">Create Account</button>
      </div>

      <icon-button class="add-user-button" text="Add New" :primary="false" slot="openbtn">
        <svg class="add-user" src="../icons/add_new_user.svg"></svg>
      </icon-button>
    </modal>
  </div>

</template>


<script>

  const actions = require('../../actions');

  module.exports = {
    components: {
      'icon-button': require('icon-button'),
      'modal': require('../modal'),
    },
    data() {
      return {
        username: '',
        password: '',
        passwordConfirm: '',
        full_name: '',
        role: 'learner',
        errorMessage: '',
      };
    },
    methods: {
      createNewUser() {
        const newUser = {
          username: this.username,
          full_name: this.full_name,
          facility: this.facility,
        };

        // check for all fields populated
        if (!(this.username && this.password && this.full_name && this.role)) {
          this.errorMessage = 'All fields are required';
        // check for password confirmation match
        } else if (!(this.password === this.passwordConfirm)) {
          this.errorMessage = 'Passwords do not match.';
        // create user
        } else {
          newUser.password = this.password;
          // using promise to ensure that the user is created before closing
          this.createUser(newUser, this.role).then(
            () => {
              this.full_name = '';
              this.username = '';
              this.password = '';
              this.passwordConfirm = '';
              this.clearErrorMessage();
              this.$refs.modal.closeModal();
            }).catch((error) => {
              if (error.status.code === 409) {
                this.errorMessage = error.entity;
              } else if (error.status.code === 403) {
                this.errorMessage = error.entity;
              } else {
                this.errorMessage = `Whoops! Something went wrong.`;
              }
            });
        }
      },
      clearErrorMessage() {
        this.errorMessage = '';
      },
    },
    vuex: {
      getters: {
        facility: state => state.facility,
      },
      actions: {
        createUser: actions.createUser,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~core-theme'

  $button-content-size = 1em

  .user-field
    padding-bottom: 5%
    input
      width: 100%
      height: 40px
      font-weight: bold
    label
      position: relative
      cursor: pointer
    select
      width: 100%
      height: 40px
      font-weight: bold
      background-color: transparent

  .add-form
    width: 300px
    margin: 0 auto
    display: block
    padding: 5px 10px
    letter-spacing: 0.08em
    border: none
    border-bottom: 1px solid $core-text-default
    height: 30px
    &:focus
      outline: none
      border-bottom: 3px solid $core-action-normal

  .header
    text-align: center

  .footer
    text-align: center

  .create-btn
    width: 200px
    background-color: $core-action-normal
    color: $core-bg-canvas
    &:hover
      border-color: transparent
      color: $core-action-light

  .add-user-button
    width: 100%

  .error-message
    color: $core-text-alert

  .secondary
    &:hover
      color: #ffffff
      background-color: $core-action-dark
      svg
        fill: #ffffff

</style>
