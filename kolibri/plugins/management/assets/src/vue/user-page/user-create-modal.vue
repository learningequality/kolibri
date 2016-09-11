<template>

  <div>
    <modal :has-error="errorMessage ? true : false" @open.stop="clear" title="Add New Account">
      <div @keydown.enter="createNewUser">
        <!-- Fields for the user to fill out -->
        <section class="user-fields">
          <name
            @focus="clearErrorMessage"
            :namemodel.sync="full_name">
          </name>

          <username
            @focus="clearErrorMessage"
            :usernamemodel.sync="username">
          </username>

          <password-and-confirm
            @focus="clearErrorMessage"
            :passwordmodel.sync="password"
            :confirmpasswordmodel.sync="passwordConfirm">
          </password-and-confirm>

          <role
            @focus="clearErrorMessage"
            :rolemodel.sync="role">
          </role>
        </section>

        <!-- Button Options at footer of modal -->
        <section class="footer">
          <p class="error" v-if="errorMessage" aria-live="polite">{{errorMessage}}</p>
          <button class="create-btn" type="button" @keydown.enter.stop @click="createNewUser">
            Create Account
          </button>
        </section>
      </div>
    </modal>
  </div>

</template>


<script>

  const actions = require('../../actions');

  module.exports = {
    components: {
      'icon-button': require('icon-button'),
      'modal': require('../modal'),
      'username': require('../user-input/username'),
      'name': require('../user-input/name'),
      'password-and-confirm': require('../user-input/password-and-confirm'),
      'role': require('../user-input/role'),
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
              if (error.status.code === 400) {
                // access the first error message
                this.errorMessage = error.entity[Object.keys(error.entity)[0]];
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
        this.$emit('close');
        this.$broadcast('close');
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

  .footer
    text-align: center

  .create-btn
    width: 200px
    background-color: $core-action-normal
    color: $core-bg-canvas
    &:hover
      border-color: transparent
      color: $core-action-light

  .error
    color: $core-text-alert

</style>
