<template>

  <core-modal
    title="Add New Account"
    :has-error="errorMessage ? true : false"
    @enter="createNewUser"
    @cancel="close"
  >
    <div>
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
          <label for="user-kind"><span class="visuallyhidden">User Kind</span></label>
          <select @focus="clearErrorMessage" v-model="kind" id="user-kind">
            <option :value="userKinds.LEARNER" selected> Learner </option>
            <option :value="userKinds.COACH"> Coach </option>
            <option :value="userKinds.ADMIN"> Admin </option>
          </select>
        </div>
      </section>

      <!-- Button Options at footer of modal -->
      <section class="footer">
        <p class="error" v-if="errorMessage" aria-live="polite">{{errorMessage}}</p>
        <icon-button
          class="create-btn"
          text="Create Account"
          @keydown.enter.stop
          @click="createNewUser">
        </icon-button>
      </section>
    </div>
  </core-modal>

</template>


<script>

  const actions = require('../../actions');
  const userKinds = require('kolibri.coreVue.vuex.constants').UserKinds;

  module.exports = {
    components: {
      'icon-button': require('kolibri.coreVue.components.iconButton'),
    },
    data() {
      return {
        username: '',
        password: '',
        passwordConfirm: '',
        full_name: '',
        kind: userKinds.LEARNER,
        errorMessage: '',
        userKinds : userKinds,
      };
    },
    mounted() {
      // clear form on load
      Object.assign(this.$data, this.$options.data());
    },
    methods: {
      createNewUser() {
        const newUser = {
          username: this.username,
          full_name: this.full_name,
          facility: this.facility,
          kind: this.kind
        };

        // check for all fields populated
        if (!(this.username && this.password && this.full_name && this.kind)) {
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
          this.createUser(newUser).then(
            () => {
              this.close();
            }).catch((error) => {
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
      clearErrorMessage() {
        this.errorMessage = '';
      },
      close() {
        this.$emit('close'); // signal parent to close
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

  @require '~kolibri.styles.coreTheme'

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

  .error
    color: $core-text-error

  .secondary
    &:hover
      color: #ffffff
      background-color: $core-action-dark
      svg
        fill: #ffffff

</style>
