<template>

  <form @submit.prevent="createNewUser">
    <h1>
      {{ $tr('createNewUserHeader') }}
    </h1>
    <section>
      <TextboxFullName
        ref="textboxFullName"
        :autofocus="true"
        :disabled="busy"
        :value.sync="fullName"
        :isValid.sync="fullNameValid"
        :shouldValidate="formSubmitted"
      />

      <TextboxUsername
        ref="textboxUsername"
        :disabled="busy"
        :value.sync="username"
        :isValid.sync="usernameValid"
        :shouldValidate="formSubmitted"
        :isUniqueValidator="usernameIsUnique"
        :errors.sync="caughtErrors"
      />
      <KTextbox
        ref="password"
        v-model="password"
        type="password"
        :disabled="busy"
        :label="$tr('password')"
        :invalid="Boolean(passwordIsInvalidText)"
        :invalidText="passwordIsInvalidText"
        @blur="passwordBlurred = true"
      />
      <KTextbox
        ref="confirmedPassword"
        v-model="confirmedPassword"
        type="password"
        :disabled="busy"
        :label="$tr('reEnterPassword')"
        :invalid="Boolean(confirmedPasswordIsInvalidText)"
        :invalidText="confirmedPasswordIsInvalidText"
        @blur="confirmedPasswordBlurred = true"
      />

      <KSelect
        v-model="kind"
        class="select"
        :disabled="busy"
        :label="$tr('userType')"
        :options="userKindDropdownOptions"
      />

      <fieldset v-if="coachIsSelected" class="coach-selector">
        <KRadioButton
          v-model="classCoach"
          :disabled="busy"
          :label="$tr('classCoachLabel')"
          :description="$tr('classCoachDescription')"
          :value="true"
        />
        <KRadioButton
          v-model="classCoach"
          :disabled="busy"
          :label="$tr('facilityCoachLabel')"
          :description="$tr('facilityCoachDescription')"
          :value="false"
        />
      </fieldset>

      <div>
        <KTextbox
          v-model="identificationNumber"
          :disabled="busy"
          :maxlength="30"
          :label="$tr('identificationNumberLabel')"
        />
      </div>

      <SelectBirthYear
        :disabled="busy"
        class="select"
        :value.sync="birthYear"
      />
      <SelectGender
        :disabled="busy"
        class="select"
        :value.sync="gender"
      />

    </section>

    <div class="buttons">
      <KButton
        :disabled="busy"
        :text="$tr('saveAction')"
        type="submit"
        :primary="true"
      />
      <KButton
        :disabled="busy"
        :text="$tr('cancelAction')"
        @click="goToUserManagementPage"
      />
    </div>
  </form>

</template>


<script>

  import some from 'lodash/some';
  import { mapState, mapGetters } from 'vuex';
  import { UserKinds, ERROR_CONSTANTS } from 'kolibri.coreVue.vuex.constants';
  import CatchErrors from 'kolibri.utils.CatchErrors';
  import KRadioButton from 'kolibri.coreVue.components.KRadioButton';
  import KButton from 'kolibri.coreVue.components.KButton';
  import KTextbox from 'kolibri.coreVue.components.KTextbox';
  import KSelect from 'kolibri.coreVue.components.KSelect';
  import SelectGender from 'kolibri.coreVue.components.SelectGender';
  import SelectBirthYear from 'kolibri.coreVue.components.SelectBirthYear';
  import TextboxUsername from '../UserCreatePage/TextboxUsername';

  export default {
    name: 'UserCreateModal',
    components: {
      KRadioButton,
      KButton,
      KTextbox,
      KSelect,
      SelectGender,
      SelectBirthYear,
      TextboxUsername,
    },
    data() {
      return {
        fullName: '',
        fullNameValid: true,
        username: '',
        usernameValid: true,
        password: '',
        confirmedPassword: '',
        kind: {
          label: this.$tr('learner'),
          value: UserKinds.LEARNER,
        },
        classCoach: true,
        busy: false,
        passwordBlurred: false,
        confirmedPasswordBlurred: false,
        formSubmitted: false,
        gender: null,
        birthYear: null,
        identificationNumber: '',
        caughtErrors: [],
      };
    },
    computed: {
      ...mapGetters(['currentFacilityId']),
      ...mapState('userManagement', ['facilityUsers']),
      newUserRole() {
        if (this.coachIsSelected) {
          return this.classCoach ? UserKinds.ASSIGNABLE_COACH : UserKinds.COACH;
        }
        // Admin or Learner
        return this.kind.value;
      },
      coachIsSelected() {
        return this.kind.value === UserKinds.COACH;
      },
      passwordIsInvalidText() {
        if (this.passwordBlurred || this.formSubmitted) {
          if (this.password === '') {
            return this.$tr('required');
          }
        }
        return '';
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
      formIsValid() {
        return !some(
          [
            !this.fullNameValid,
            !this.usernameValid,
            this.passwordIsInvalidText,
            this.confirmedPasswordIsInvalidText,
          ],
          Boolean
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
      goToUserManagementPage(onComplete) {
        this.$router.push(this.$router.getRoute('USER_MGMT_PAGE'), onComplete);
      },
      usernameIsUnique(value) {
        return !this.facilityUsers.find(
          ({ username }) => username.toLowerCase() === value.toLowerCase()
        );
      },
      createNewUser() {
        this.formSubmitted = true;
        if (this.formIsValid) {
          this.busy = true;
          this.$store
            .dispatch('userManagement/createUser', {
              username: this.username,
              full_name: this.fullName,
              role: {
                kind: this.newUserRole,
                collection: this.currentFacilityId,
              },
              password: this.password,
            })
            .then(
              () => {
                this.goToUserManagementPage(() => {
                  this.$store.dispatch(
                    'createSnackbar',
                    this.$tr('userCreatedNotification', { username: this.username })
                  );
                });
              },
              error => {
                this.caughtErrors = CatchErrors(error, [ERROR_CONSTANTS.USERNAME_ALREADY_EXISTS]);
                if (this.caughtErrors.length > 0) {
                  this.busy = false;
                  this.focusOnInvalidField();
                } else {
                  this.$store.dispatch('handleApiError', error);
                }
              }
            );
        } else {
          this.focusOnInvalidField();
        }
      },
      focusOnInvalidField() {
        this.$nextTick().then(() => {
          if (!this.fullNameValid) {
            this.$refs.textboxFullName.focus();
          } else if (!this.usernameValid) {
            this.$refs.textboxUsername.focus();
          } else if (this.passwordIsInvalidText) {
            this.$refs.password.focus();
          } else if (this.confirmedPasswordIsInvalidText) {
            this.$refs.confirmedPassword.focus();
          }
        });
      },
    },
    $trs: {
      createNewUserHeader: 'Create new user',
      cancelAction: 'Cancel',
      name: 'Full name',
      username: 'Username',
      password: 'Password',
      reEnterPassword: 'Re-enter password',
      userType: 'User type',
      saveAction: 'Save',
      learner: 'Learner',
      coach: 'Coach',
      admin: 'Admin',
      classCoachLabel: 'Class coach',
      classCoachDescription: "Can only instruct classes that they're assigned to",
      facilityCoachLabel: 'Facility coach',
      facilityCoachDescription: 'Can instruct all classes in your facility',
      pwMismatchError: 'Passwords do not match',
      required: 'This field is required',
      identificationNumberLabel: 'Identification number (optional)',
      userCreatedNotification: "User account for '{username}' was created",
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

  .select {
    margin: 18px 0 36px;
  }

  .buttons {
    button:first-of-type {
      margin-left: 0;
    }
  }

</style>
