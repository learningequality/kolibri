<template>

  <core-modal
    :title="$tr('addNewAccountTitle')"
    @cancel="close"
    width="400px"
  >
    <ui-alert type="error" v-if="errorMessage" @dismiss="errorMessage = ''">{{ errorMessage }}</ui-alert>

    <form @submit.prevent="createNewUser">
      <section>
        <core-textbox
          :label="$tr('name')"
          :autofocus="true"
          :required="true"
          :maxlength="120"
          :enforceMaxlength="true"
          type="text"
          class="user-field"
          v-model.trim="fullName"/>
        <core-textbox
          :label="$tr('username')"
          :required="true"
          :maxlength="30"
          :enforceMaxlength="true"
          :invalid="usernameInvalid"
          :error="usernameInvalidMsg"
          type="text"
          class="user-field"
          v-model="username"/>
        <core-textbox
          :label="$tr('password')"
          :required="true"
          type="password"
          class="user-field"
          v-model="password"/>
        <core-textbox
          :label="$tr('confirmPassword')"
          :required="true"
          :invalid="passwordConfirmInvalid"
          :error="$tr('pwMismatchError')"
          type="password"
          class="user-field"
          v-model="passwordConfirm"/>

        <div class="user-field">
          <label for="user-kind"><span class="visuallyhidden">{{$tr('userKind')}}</span></label>
          <select v-model="kind" id="user-kind">
            <option :value="LEARNER"> {{$tr('learner')}} </option>
            <option :value="COACH"> {{$tr('coach')}} </option>
            <option :value="ADMIN"> {{$tr('admin')}} </option>
          </select>
        </div>
      </section>

      <!-- Button Options at footer of modal -->
      <section class="footer">
        <icon-button class="create-btn" :text="$tr('createAccount')" :primary="true" :loading="loading"/>
      </section>
    </form>
  </core-modal>

</template>


<script>

  const actions = require('../../state/actions');
  const UserKinds = require('kolibri.coreVue.vuex.constants').UserKinds;

  module.exports = {
    $trNameSpace: 'userCreateModal',
    $trs: {
      // Modal title
      addNewAccountTitle: 'Add New Account',
      // Labels
      name: 'Full name',
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
      usernameAlreadyExists: 'Username already exists',
      usernameNotAlphaNum: 'Username can only contain letters and digits',
      pwMismatchError: 'Passwords do not match',
      unknownError: 'Whoops, something went wrong. Try again',
      loadingConfirmation: 'Loading...',
    },
    components: {
      'icon-button': require('kolibri.coreVue.components.iconButton'),
      'core-modal': require('kolibri.coreVue.components.coreModal'),
      'core-textbox': require('kolibri.coreVue.components.textbox'),
      'ui-alert': require('keen-ui/src/UiAlert'),
    },
    data() {
      return {
        fullName: '',
        username: '',
        password: '',
        passwordConfirm: '',
        kind: UserKinds.LEARNER,
        errorMessage: '',
        loading: false,
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
      usernameAlreadyExists() {
        const index = this.users.findIndex(user => user.username === this.username);
        if (index === -1) {
          return false;
        }
        return true;
      },
      usernameNotAlphaNum() {
        if (this.username === '') {
          return false;
        }
        const re = /^\w+$/g;
        return !re.test(this.username);
      },
      usernameInvalid() {
        return this.usernameAlreadyExists || this.usernameNotAlphaNum;
      },
      usernameInvalidMsg() {
        if (this.usernameAlreadyExists) {
          return this.$tr('usernameAlreadyExists');
        } else if (this.usernameNotAlphaNum) {
          return this.$tr('usernameNotAlphaNum');
        }
        return '';
      },
      passwordConfirmInvalid() {
        if (this.passwordConfirm === '') {
          return false;
        }
        return this.password !== this.passwordConfirm;
      },
    },
    methods: {
      createNewUser() {
        this.errorMessage = '';
        if (!this.usernameInvalid && !this.passwordConfirmInvalid) {
          this.loading = true;

          const newUser = {
            username: this.username,
            full_name: this.fullName,
            kind: this.kind,
            password: this.password,
          };
          // using promise to ensure that the user is created before closing
          this.createUser(newUser).then(
            () => {
              this.close();
            },
            error => {
              this.loading = false;
              this.errorMessage = this.$tr('unknownError');
            });
        }
      },
      close() {
        this.displayModal(false);
      },
    },
    vuex: {
      getters: {
        users: state => state.pageState.facilityUsers,
      },
      actions: {
        createUser: actions.createUser,
        displayModal: actions.displayModal,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  .user-field
    margin-bottom: 5%
    select
      width: 100%
      height: 40px
      font-weight: bold
      background-color: transparent

  .footer
    text-align: center

  .create-btn
    width: 200px

</style>
