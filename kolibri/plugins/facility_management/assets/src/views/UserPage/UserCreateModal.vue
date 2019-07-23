<template>

  <form @submit.prevent="createNewUser">
    <h1>
      {{ $tr('createNewUserHeader') }}
    </h1>
    <section>
      <FullNameTextbox
        ref="fullNameTextbox"
        :autofocus="true"
        :disabled="busy"
        :value.sync="fullName"
        :isValid.sync="fullNameValid"
        :shouldValidate="formSubmitted"
      />

      <UsernameTextbox
        ref="usernameTextbox"
        :disabled="busy"
        :value.sync="username"
        :isValid.sync="usernameValid"
        :shouldValidate="formSubmitted"
        :isUniqueValidator="usernameIsUnique"
        :errors.sync="caughtErrors"
      />

      <PasswordTextbox
        ref="passwordTextbox"
        :disabled="busy"
        :value.sync="password"
        :isValid.sync="passwordValid"
        :shouldValidate="formSubmitted"
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

      <IdentifierTextbox
        :value.sync="idNumber"
        :disabled="busy"
      />

      <BirthYearSelect
        :disabled="busy"
        class="select"
        :value.sync="birthYear"
      />
      <GenderSelect
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
        @click="goToUserManagementPage()"
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
  import KSelect from 'kolibri.coreVue.components.KSelect';
  import GenderSelect from 'kolibri.coreVue.components.GenderSelect';
  import BirthYearSelect from 'kolibri.coreVue.components.BirthYearSelect';
  import FullNameTextbox from 'kolibri.coreVue.components.FullNameTextbox';
  import UsernameTextbox from 'kolibri.coreVue.components.UsernameTextbox';
  import PasswordTextbox from 'kolibri.coreVue.components.PasswordTextbox';
  import IdentifierTextbox from './IdentifierTextbox';

  export default {
    name: 'UserCreateModal',
    components: {
      KRadioButton,
      KButton,
      KSelect,
      GenderSelect,
      BirthYearSelect,
      UsernameTextbox,
      FullNameTextbox,
      PasswordTextbox,
      IdentifierTextbox,
    },
    data() {
      return {
        fullName: '',
        fullNameValid: true,
        username: '',
        usernameValid: true,
        password: '',
        passwordValid: true,
        kind: {
          label: this.$tr('learner'),
          value: UserKinds.LEARNER,
        },
        classCoach: true,
        busy: false,
        formSubmitted: false,
        gender: '',
        birthYear: '',
        idNumber: '',
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
      formIsValid() {
        return !some([!this.fullNameValid, !this.usernameValid, !this.passwordValid], Boolean);
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
              id_number: this.idNumber,
              gender: this.gender,
              birth_year: this.birthYear,
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
            this.$refs.fullNameTextbox.focus();
          } else if (!this.usernameValid) {
            this.$refs.usernameTextbox.focus();
          } else if (!this.passwordValid) {
            this.$refs.passwordTextbox.focus();
          }
        });
      },
    },
    $trs: {
      createNewUserHeader: 'Create new user',
      cancelAction: 'Cancel',
      userType: 'User type',
      saveAction: 'Save',
      learner: 'Learner',
      coach: 'Coach',
      admin: 'Admin',
      classCoachLabel: 'Class coach',
      classCoachDescription: "Can only instruct classes that they're assigned to",
      facilityCoachLabel: 'Facility coach',
      facilityCoachDescription: 'Can instruct all classes in your facility',
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
