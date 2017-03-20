<template>

  <core-modal
    :title="$tr('addNewAccountTitle')"
    :has-error="errorMessage ? true : false"
    @cancel="close"
  >
    <form @submit.prevent="createNewUser">
      <!-- Fields for the user to fill out -->
      <section class="user-fields">
        <core-textbox
          :label="$tr('name')"
          :autofocus="true"
          @focus="clearStatus"
          type="text"
          class="user-field"
          autocomplete="name"
          required
          v-model="fullName"/>
        <core-textbox
          :label="$tr('username')"
          @focus="clearStatus"
          type="text"
          class="user-field"
          autocomplete="username"
          required
          v-model="username"/>
        <core-textbox
          :label="$tr('password')"
          @focus="clearStatus"
          type="password"
          class="user-field"
          autocomplete="password"
          required
          v-model="password"/>
        <core-textbox
          :label="$tr('confirmPassword')"
          @focus="clearStatus"
          type="password"
          class="user-field"
          autocomplete="password"
          required
          v-model="passwordConfirm"/>

        <div class="user-field">
          <label for="user-kind"><span class="visuallyhidden">{{$tr('userKind')}}</span></label>
          <select @focus="clearStatus" v-model="kind" id="user-kind">
            <option :value="LEARNER"> {{$tr('learner')}} </option>
            <option :value="COACH"> {{$tr('coach')}} </option>
            <option :value="ADMIN"> {{$tr('admin')}} </option>
          </select>
        </div>
      </section>

      <!-- Button Options at footer of modal -->
      <section class="footer">
        <p :class="{error: errorMessage}" v-if="statusMessage" aria-live="polite">{{statusMessage}}</p>
        <icon-button
          class="create-btn"
          :text="$tr('createAccount')"
          :primary="true"
        />
      </section>
    </form>
  </core-modal>

</template>


<script>

  const actions = require('../../actions');
  const UserKinds = require('kolibri.coreVue.vuex.constants').UserKinds;

  module.exports = {
    $trNameSpace: 'userCreateModal',
    $trs: {
      // Modal title
      addNewAccountTitle: 'Add New Account',
      // Labels
      name: 'Name',
      username: 'Username',
      password: 'Password',
      confirmPassword: 'Confirm Password',
      userKind: 'User Kind',
      // Button Labels
      createAccount: 'Create Account',
      // Select inputs
      learner: 'Learner',
      coach: 'Coach',
      admin: 'Admin',
      // Status Messages
      emptyFieldError: 'All fields are required',
      pwMismatchError: 'Passwords do not match',
      unknownError: 'Whoops! Something went wrong!',
      loadingConfirmation: 'Loading...',
    },
    components: {
      'icon-button': require('kolibri.coreVue.components.iconButton'),
      'core-modal': require('kolibri.coreVue.components.coreModal'),
      'core-textbox': require('kolibri.coreVue.components.textbox'),
    },
    data() {
      return {
        username: '',
        password: '',
        passwordConfirm: '',
        fullName: '',
        kind: UserKinds.LEARNER,
        errorMessage: '',
        confirmationMessage: '',
      };
    },
    mounted() {
      // clear form on load
      Object.assign(this.$data, this.$options.data());
    },
    computed: {
      LEARNER: () => UserKinds.LEARNER,
      COACH: () => UserKinds.COACH,
      ADMIN: () => UserKinds.ADMIN,
      statusMessage() {
        if (this.errorMessage) {
          return this.errorMessage;
        } else if (this.confirmationMessage) {
          return this.confirmationMessage;
        }
        return false;
      },
    },
    methods: {
      createNewUser() {
        const newUser = {
          username: this.username,
          full_name: this.fullName,
          kind: this.kind,
        };

        // check for all fields populated
        if (!(this.username && this.password && this.fullName && this.kind)) {
          this.errorMessage = this.$tr('emptyFieldError');
        // check for password confirmation match
        } else if (!(this.password === this.passwordConfirm)) {
          this.errorMessage = this.$tr('pwMismatchError');
        // create user
        } else {
          newUser.password = this.password;

          // loading message
          this.confirmationMessage = this.$tr('loadingConfirmation');
          // using promise to ensure that the user is created before closing
          this.createUser(newUser).then(
            () => {
              this.close();
            },
            (error) => {
              if (error.status.code === 400) {
                // access the first error message
                this.errorMessage = error.entity[Object.keys(error.entity)[0]];
              } else if (error.status.code === 403) {
                this.errorMessage = error.entity;
              } else {
                this.errorMessage = this.$tr('unknownError');
              }
            });
        }
      },
      clearStatus() {
        this.errorMessage = '';
        this.confirmationMessage = '';
      },
      close() {
        this.displayModal(false);
      },
    },
    vuex: {
      actions: {
        createUser: actions.createUser,
        displayModal: actions.displayModal,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  $button-content-size = 1em

  .user-field
    margin-bottom: 5%
    select
      width: 100%
      height: 40px
      background-color: transparent
      font-weight: bold

  .header
    text-align: center

  .footer
    text-align: center

  .create-btn
    width: 200px

  .error
    color: $core-text-error

  .secondary
    &:hover
      background-color: $core-action-dark
      color: #ffffff
      svg
        fill: #ffffff

</style>
