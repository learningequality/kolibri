<template>

  <core-modal
    :title="$tr('addNewAccountTitle')"
    @cancel="close"
    width="400px"
  >
    <ui-alert type="error" v-if="errorMessage" @dismiss="errorMessage = ''">{{ errorMessage }}</ui-alert>

    <form @submit.prevent="createNewUser">
      <section>
        <k-textbox
          ref="name"
          type="text"
          class="user-field"
          :label="$tr('name')"
          :autofocus="true"
          :maxlength="120"
          :invalid="nameIsInvalid"
          :invalidText="nameIsInvalidText"
          @blur="nameBlurred = true"
          v-model.trim="fullName"
        />
        <k-textbox
          ref="username"
          type="text"
          class="user-field"
          :label="$tr('username')"
          :maxlength="30"
          :invalid="usernameIsInvalid"
          :invalidText="usernameIsInvalidText"
          @blur="usernameBlurred = true"
          v-model="username"
        />
        <k-textbox
          ref="password"
          type="password"
          class="user-field"
          :label="$tr('password')"
          :invalid="passwordIsInvalid"
          :invalidText="passwordIsInvalidText"
          @blur="passwordBlurred = true"
          v-model="password"
        />
        <k-textbox
          ref="confirmedPassword"
          type="password"
          class="user-field"
          :label="$tr('reEnterPassword')"
          :invalid="confirmedPasswordIsInvalid"
          :invalidText="confirmedPasswordIsInvalidText"
          @blur="confirmedPasswordBlurred = true"
          v-model="confirmedPassword"
        />

        <k-select
          :label="$tr('typeOfUser')"
          :options="userKinds"
          v-model="kind"
          class="kind-select"
        />
      </section>

      <!-- Button Options at footer of modal -->
      <section class="footer">
        <k-button :text="$tr('createAccount')" :primary="true" type="submit" :disabled="submitting" />
      </section>
    </form>
  </core-modal>

</template>


<script>

  import * as actions from '../../state/actions';
  import { UserKinds } from 'kolibri.coreVue.vuex.constants';
  import { validateUsername } from 'kolibri.utils.validators';
  import kButton from 'kolibri.coreVue.components.kButton';
  import coreModal from 'kolibri.coreVue.components.coreModal';
  import kTextbox from 'kolibri.coreVue.components.kTextbox';
  import kSelect from 'kolibri.coreVue.components.kSelect';
  import uiAlert from 'kolibri.coreVue.components.uiAlert';
  export default {
    name: 'userCreateModal',
    $trs: {
      addNewAccountTitle: 'Add new account',
      name: 'Full name',
      username: 'Username',
      password: 'Password',
      reEnterPassword: 'Re-enter password',
      typeOfUser: 'Type of user',
      createAccount: 'Create Account',
      learner: 'Learner',
      coach: 'Coach',
      admin: 'Admin',
      usernameAlreadyExists: 'Username already exists',
      usernameNotAlphaNumUnderscore: 'Username can only contain letters, numbers, and underscores',
      pwMismatchError: 'Passwords do not match',
      unknownError: 'Whoops, something went wrong. Try again',
      loadingConfirmation: 'Loading...',
      required: 'This field is required',
    },
    components: {
      kButton,
      coreModal,
      kTextbox,
      uiAlert,
      kSelect,
    },
    data() {
      return {
        fullName: '',
        username: '',
        password: '',
        confirmedPassword: '',
        kind: {},
        errorMessage: '',
        submitting: false,
        nameBlurred: false,
        usernameBlurred: false,
        passwordBlurred: false,
        confirmedPasswordBlurred: false,
        formSubmitted: false,
      };
    },
    computed: {
      nameIsInvalidText() {
        if (this.nameBlurred || this.formSubmitted) {
          if (this.fullName === '') {
            return this.$tr('required');
          }
        }
        return '';
      },
      nameIsInvalid() {
        return !!this.nameIsInvalidText;
      },
      usernameAlreadyExists() {
        return this.users.findIndex(user => user.username === this.username) !== -1;
      },
      usernameIsInvalidText() {
        if (this.usernameBlurred || this.formSubmitted) {
          if (this.username === '') {
            return this.$tr('required');
          }
          if (!validateUsername(this.username)) {
            return this.$tr('usernameNotAlphaNumUnderscore');
          }
          if (this.usernameAlreadyExists) {
            return this.$tr('usernameAlreadyExists');
          }
        }
        return '';
      },
      usernameIsInvalid() {
        return !!this.usernameIsInvalidText;
      },
      passwordIsInvalidText() {
        if (this.passwordBlurred || this.formSubmitted) {
          if (this.password === '') {
            return this.$tr('required');
          }
        }
        return '';
      },
      passwordIsInvalid() {
        return !!this.passwordIsInvalidText;
      },
      confirmedPasswordIsInvalidText() {
        if (this.confirmedPasswordBlurred || this.formSubmitted) {
          if (this.confirmedPassword === '') {
            return this.$tr('required');
          }
          if (this.confirmedPassword !== this.password) {
            return this.$tr('pwMismatchError');
          }
        }
        return '';
      },
      confirmedPasswordIsInvalid() {
        return !!this.confirmedPasswordIsInvalidText;
      },
      formIsValid() {
        return (
          !this.nameIsInvalid &&
          !this.usernameIsInvalid &&
          !this.passwordIsInvalid &&
          !this.confirmedPasswordIsInvalid
        );
      },
      userKinds() {
        return [
          {
            label: this.$tr('learner'),
            value: UserKinds.LEARNER,
          },
          {
            label: this.$tr('coach'),
            value: UserKinds.COACH,
          },
          {
            label: this.$tr('admin'),
            value: UserKinds.ADMIN,
          },
        ];
      },
    },
    beforeMount() {
      Object.assign(this.$data, this.$options.data());
      this.kind = {
        label: this.$tr('learner'),
        value: UserKinds.LEARNER,
      };
    },
    methods: {
      createNewUser() {
        this.errorMessage = '';
        this.formSubmitted = true;
        if (this.formIsValid) {
          this.submitting = true;
          const newUser = {
            username: this.username,
            full_name: this.fullName,
            kind: this.kind.value,
            password: this.password,
          };
          this.createUser(newUser).then(
            () => {
              this.close();
            },
            error => {
              this.submitting = false;
              if (error.status.code === 400) {
                this.errorMessage = Object.values(error.entity)[0][0];
              } else if (error.status.code === 403) {
                this.errorMessage = error.entity;
              } else {
                this.errorMessage = this.$tr('unknownError');
              }
            }
          );
        } else {
          this.focusOnInvalidField();
        }
      },
      focusOnInvalidField() {
        if (this.nameIsInvalid) {
          this.$refs.name.focus();
        } else if (this.usernameIsInvalid) {
          this.$refs.username.focus();
        } else if (this.passwordIsInvalid) {
          this.$refs.password.focus();
        } else if (this.confirmedPasswordIsInvalid) {
          this.$refs.confirmedPassword.focus();
        }
      },
      close() {
        this.displayModal(false);
      },
    },
    vuex: {
      getters: { users: state => state.pageState.facilityUsers },
      actions: {
        createUser: actions.createUser,
        displayModal: actions.displayModal,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  .footer
    text-align: right

  .kind-select
    margin-bottom: 3em

</style>
