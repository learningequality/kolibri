<template>

  <modal :error="errorMessage ? true : false" @open.stop="clear" title="Add New Account">

    <div @keydown.enter="createNewUser">

      <!-- Fields for the user to fill out -->
      <section class="user-fields">
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
      </section>

      <!-- Button Options at footer of modal -->
      <section class="footer">
        <p class="error-message" v-if="errorMessage">{{errorMessage}}</p>
        <button class="create-btn" type="button" @keydown.enter.stop @click="createNewUser">
          Create Account
        </button>
      </section>
    </div>
  </modal>

  <icon-button @click="open" class="add-user-button" text="Add New" :primary="false">
    <svg class="add-user" src="../icons/add_new_user.svg"></svg>
  </icon-button>

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

          // loading message
          this.confirmation_message = 'Loading...';
          // using promise to ensure that the user is created before closing
          this.createUser(newUser, this.role).then(
            () => {
              this.close();
            }).catch((error) => {
              this.clear();
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
      clear() {
        this.$data = this.$options.data();
      },
      clearErrorMessage() {
        this.errorMessage = '';
      },
      close() {
        this.clear();
        this.$broadcast('close');
      },
      open() {
        this.$broadcast('open');
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
