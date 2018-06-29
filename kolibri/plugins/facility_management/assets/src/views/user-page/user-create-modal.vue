<template>

  <core-modal
    :title="$tr('addNewAccountTitle')"
    @cancel="close"
    width="400px"
  >
    <ui-alert type="error" v-if="errorMessage" @dismiss="errorMessage = ''">
      {{ errorMessage }}
    </ui-alert>

    <form class="user-create-form" @submit.prevent="createNewUser">
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

      <!-- Button Options at footer of modal -->
      <div class="core-modal-buttons">
        <k-button
          :text="$tr('cancel')"
          :primary="false"
          appearance="flat-button"
          @click="close"
        />
        <k-button
          :text="$tr('createAccount')"
          :primary="true"
          type="submit"
          :disabled="submitting"
        />
      </div>
    </form>
  </core-modal>

</template>


<script>

  import { UserKinds } from 'kolibri.coreVue.vuex.constants';
  import { currentFacilityId } from 'kolibri.coreVue.vuex.getters';
  import { validateUsername } from 'kolibri.utils.validators';
  import kButton from 'kolibri.coreVue.components.kButton';
  import kRadioButton from 'kolibri.coreVue.components.kRadioButton';
  import coreModal from 'kolibri.coreVue.components.coreModal';
  import kTextbox from 'kolibri.coreVue.components.kTextbox';
  import kSelect from 'kolibri.coreVue.components.kSelect';
  import uiAlert from 'kolibri.coreVue.components.uiAlert';
  import { createUser, displayModal } from '../../state/actions';

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
      kButton,
      kRadioButton,
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
        kind: {
          label: this.$tr('learner'),
          value: UserKinds.LEARNER,
        },
        classCoach: true,
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
          if (this.usernameAlreadyExists) {
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
      createNewUser() {
        this.errorMessage = '';
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
      getters: {
        facilityUsers: state => state.pageState.facilityUsers,
        currentFacilityId,
      },
      actions: {
        createUser,
        displayModal,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  .user-create-form
    min-height: 500px

  .coach-selector
    margin-bottom: 3em
    margin: 0
    padding: 0
    border: none

</style>
