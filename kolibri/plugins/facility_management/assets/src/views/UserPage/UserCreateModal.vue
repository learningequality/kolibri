<template>

  <form @submit.prevent="createNewUser">
    <h1>
      {{ $tr('createNewUserHeader') }}
    </h1>
    <section>
      <KTextbox
        ref="name"
        v-model="fullName"
        :disabled="busy"
        :label="$tr('name')"
        :autofocus="true"
        :maxlength="120"
        :invalid="Boolean(nameIsInvalidText)"
        :invalidText="nameIsInvalidText"
        @blur="nameBlurred = true"
      />
      <KTextbox
        ref="username"
        v-model="username"
        :disabled="busy"
        :label="$tr('username')"
        :maxlength="30"
        :invalid="Boolean(usernameIsInvalidText)"
        :invalidText="usernameIsInvalidText"
        @blur="usernameBlurred = true"
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
  import { mapActions, mapState, mapGetters } from 'vuex';
  import { UserKinds, ERROR_CONSTANTS } from 'kolibri.coreVue.vuex.constants';
  import { validateUsername } from 'kolibri.utils.validators';
  import CatchErrors from 'kolibri.utils.CatchErrors';
  import KRadioButton from 'kolibri.coreVue.components.KRadioButton';
  import KButton from 'kolibri.coreVue.components.KButton';
  import KTextbox from 'kolibri.coreVue.components.KTextbox';
  import KSelect from 'kolibri.coreVue.components.KSelect';
  import SelectGender from 'kolibri.coreVue.components.SelectGender';
  import SelectBirthYear from 'kolibri.coreVue.components.SelectBirthYear';

  export default {
    name: 'UserCreateModal',
    components: {
      KRadioButton,
      KButton,
      KTextbox,
      KSelect,
      SelectGender,
      SelectBirthYear,
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
        busy: false,
        nameBlurred: false,
        usernameBlurred: false,
        passwordBlurred: false,
        confirmedPasswordBlurred: false,
        formSubmitted: false,
        gender: null,
        birthYear: null,
        identificationNumber: '',
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
      nameIsInvalidText() {
        if (this.nameBlurred || this.formSubmitted) {
          if (this.fullName === '') {
            return this.$tr('required');
          }
        }
        return '';
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
            this.nameIsInvalidText,
            this.usernameIsInvalidText,
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
      ...mapActions('userManagement', ['createUser']),
      ...mapActions(['handleApiError']),
      goToUserManagementPage() {
        this.$router.push(this.$router.getRoute('USER_MGMT_PAGE'));
      },
      createNewUser() {
        this.usernameAlreadyExistsOnServer = false;
        this.formSubmitted = true;
        if (this.formIsValid) {
          this.busy = true;
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
              this.goToUserManagementPage();
            },
            error => {
              const usernameAlreadyExistsError = CatchErrors(error, [
                ERROR_CONSTANTS.USERNAME_ALREADY_EXISTS,
              ]);
              if (usernameAlreadyExistsError) {
                this.busy = false;
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
        this.$nextTick().then(() => {
          if (this.nameIsInvalidText) {
            this.$refs.name.focus();
          } else if (this.usernameIsInvalidText) {
            this.$refs.username.focus();
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
      usernameAlreadyExists: 'Username already exists',
      usernameNotAlphaNumUnderscore: 'Username can only contain letters, numbers, and underscores',
      pwMismatchError: 'Passwords do not match',
      required: 'This field is required',
      identificationNumberLabel: 'Identification number (optional)',
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
