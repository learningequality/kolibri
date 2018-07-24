<template>

  <k-modal
    :title="$tr('addNewAccountTitle')"
    :submitText="$tr('createAccount')"
    :cancelText="$tr('cancel')"
    :submitDisabled="submitting"
    @submit="createNewUser"
    @cancel="close"
  >

    <section>
      <k-textbox
        ref="name"
        type="text"
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
        :label="$tr('password')"
        :invalid="passwordIsInvalid"
        :invalidText="passwordIsInvalidText"
        @blur="passwordBlurred = true"
        v-model="password"
      />
      <k-textbox
        ref="confirmedPassword"
        type="password"
        :label="$tr('reEnterPassword')"
        :invalid="confirmedPasswordIsInvalid"
        :invalidText="confirmedPasswordIsInvalidText"
        @blur="confirmedPasswordBlurred = true"
        v-model="confirmedPassword"
      />

      <k-select
        :label="$tr('userType')"
        :options="userKindDropdownOptions"
        v-model="kind"
      />

      <fieldset class="coach-selector" v-if="coachIsSelected">
        <k-radio-button
          :label="$tr('classCoachLabel')"
          :description="$tr('classCoachDescription')"
          :value="true"
          v-model="classCoach"
        />
        <k-radio-button
          :label="$tr('facilityCoachLabel')"
          :description="$tr('facilityCoachDescription')"
          :value="false"
          v-model="classCoach"
        />
      </fieldset>
    </section>
  </k-modal>

</template>


<script>

  import { mapActions, mapState, mapGetters } from 'vuex';
  import { UserKinds } from 'kolibri.coreVue.vuex.constants';
  import { validateUsername } from 'kolibri.utils.validators';
  import kRadioButton from 'kolibri.coreVue.components.kRadioButton';
  import kModal from 'kolibri.coreVue.components.kModal';
  import kTextbox from 'kolibri.coreVue.components.kTextbox';
  import kSelect from 'kolibri.coreVue.components.kSelect';
  import uiAlert from 'kolibri.coreVue.components.uiAlert';
  import CatchErrors from 'kolibri.utils.CatchErrors';
  import { ERROR_CONSTANTS } from 'kolibri.coreVue.vuex.constants';

  export default {
    name: 'userCreateModal',
    $trs: {
      addNewAccountTitle: 'Add new account',
      cancel: 'Cancel',
      name: 'Full name',
      username: 'Username',
      password: 'Password',
      reEnterPassword: 'Re-enter password',
      userType: 'User type',
      createAccount: 'Create Account',
      learner: 'Learner',
      coach: 'Coach',
      admin: 'Admin',
      coachSelectorHeader: 'Coach type',
      classCoachLabel: 'Class coach',
      classCoachDescription: "Can only instruct classes that they're assigned to",
      facilityCoachLabel: 'Facility coach',
      facilityCoachDescription: 'Can instruct all classes in your facility',
      usernameAlreadyExists: 'Username already exists',
      usernameNotAlphaNumUnderscore: 'Username can only contain letters, numbers, and underscores',
      pwMismatchError: 'Passwords do not match',
      unknownError: 'Whoops, something went wrong. Try again',
      loadingConfirmation: 'Loading...',
      required: 'This field is required',
    },
    components: {
      kRadioButton,
      kModal,
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
        kind: {
          label: this.$tr('learner'),
          value: UserKinds.LEARNER,
        },
        classCoach: true,
        usernameAlreadyExistsOnServer: false,
        submitting: false,
        nameBlurred: false,
        usernameBlurred: false,
        passwordBlurred: false,
        confirmedPasswordBlurred: false,
        formSubmitted: false,
      };
    },
    computed: {
      ...mapGetters(['currentFacilityId']),
      ...mapState({
        facilityUsers: state => state.pageState.facilityUsers,
      }),
      newUserRole() {
        if (this.coachIsSelected) {
          if (this.classCoach) {
            return UserKinds.ASSIGNABLE_COACH;
          }
          return UserKinds.COACH;
        }
        // Admin or Learner
        return this.kind.value;
      },
      coachIsSelected() {
        return this.kind.value === UserKinds.COACH;
      },
      nameIsInvalidText() {
        if (this.nameBlurred || this.formSubmitted) {
          if (this.fullName === '') {
            return this.$tr('required');
          }
        }
        return '';
      },
      nameIsInvalid() {
        return Boolean(this.nameIsInvalidText);
      },
      usernameAlreadyExists() {
        return this.facilityUsers.find(
          ({ username }) => username.toLowerCase() === this.username.toLowerCase()
        );
      },
      usernameIsInvalidText() {
        if (this.usernameBlurred || this.formSubmitted) {
          if (this.username === '') {
            return this.$tr('required');
          }
          if (!validateUsername(this.username)) {
            return this.$tr('usernameNotAlphaNumUnderscore');
          }
          if (this.usernameAlreadyExists || this.usernameAlreadyExistsError) {
            return this.$tr('usernameAlreadyExists');
          }
        }
        return '';
      },
      usernameIsInvalid() {
        return Boolean(this.usernameIsInvalidText);
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
        return Boolean(this.passwordIsInvalidText);
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
        return Boolean(this.confirmedPasswordIsInvalidText);
      },
      formIsValid() {
        return (
          !this.nameIsInvalid &&
          !this.usernameIsInvalid &&
          !this.passwordIsInvalid &&
          !this.confirmedPasswordIsInvalid
        );
      },
      userKindDropdownOptions() {
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
    methods: {
      ...mapActions(['createUser', 'displayModal', 'handleApiError']),
      createNewUser() {
        this.usernameAlreadyExistsOnServer = false;
        this.formSubmitted = true;
        if (this.formIsValid) {
          this.submitting = true;
          this.createUser({
            username: this.username,
            full_name: this.fullName,
            role: {
              kind: this.newUserRole,
              collection: this.currentFacilityId,
            },
            password: this.password,
          }).then(
            () => {
              this.close();
            },
            error => {
              const usernameAlreadyExistsError = CatchErrors(error, [
                ERROR_CONSTANTS.USERNAME_ALREADY_EXISTS,
              ]);
              if (usernameAlreadyExistsError) {
                this.submitting = false;
                this.usernameAlreadyExistsOnServer = true;
              } else {
                this.handleApiError(error);
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
  };

</script>


<style lang="scss" scoped>

  .user-create-form {
    min-height: 500px;
  }

  .coach-selector {
    padding: 0;
    margin: 0;
    margin-bottom: 3em;
    border: 0;
  }

</style>
