<template>

  <form @submit.prevent="submitForm">
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
        :options="userTypeOptions"
      />

      <fieldset v-if="coachIsSelected" class="coach-selector">
        <KRadioButton
          v-model="classCoachIsSelected"
          :disabled="busy"
          :label="$tr('classCoachLabel')"
          :description="$tr('classCoachDescription')"
          :value="true"
        />
        <KRadioButton
          v-model="classCoachIsSelected"
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
        :value.sync="birthYear"
        :disabled="busy"
        class="select"
      />

      <GenderSelect
        :value.sync="gender"
        :disabled="busy"
        class="select"
      />

    </section>

    <div class="buttons">
      <KButton
        type="submit"
        :text="$tr('saveAction')"
        :disabled="busy"
        :primary="true"
      />
      <KButton
        :text="$tr('cancelAction')"
        :disabled="busy"
        @click="goToUserManagementPage()"
      />
    </div>

  </form>

</template>


<script>

  import every from 'lodash/every';
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
  import IdentifierTextbox from '../IdentifierTextbox';

  export default {
    name: 'UserCreateForm',
    metaInfo() {
      return {
        title: this.$tr('createNewUserHeader'),
      };
    },
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
        fullNameValid: false,
        username: '',
        usernameValid: false,
        password: '',
        passwordValid: false,
        gender: '',
        birthYear: '',
        idNumber: '',
        kind: {
          label: this.$tr('learner'),
          value: UserKinds.LEARNER,
        },
        classCoachIsSelected: true,
        busy: false,
        formSubmitted: false,
        caughtErrors: [],
      };
    },
    computed: {
      ...mapGetters(['currentFacilityId']),
      ...mapState('userManagement', ['facilityUsers']),
      newUserRole() {
        if (this.coachIsSelected) {
          return this.classCoachIsSelected ? UserKinds.ASSIGNABLE_COACH : UserKinds.COACH;
        }
        // Admin or Learner
        return this.kind.value;
      },
      coachIsSelected() {
        return this.kind.value === UserKinds.COACH;
      },
      formIsValid() {
        return every([this.fullNameValid, this.usernameValid, this.passwordValid]);
      },
      userTypeOptions() {
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
      submitForm() {
        this.formSubmitted = true;
        if (!this.formIsValid) {
          return this.focusOnInvalidField();
        }
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
          .then(() => {
            this.handleSubmitSuccess();
          })
          .catch(error => {
            this.handleSubmitFailure(error);
          });
      },
      handleSubmitSuccess() {
        this.goToUserManagementPage(() => {
          this.$store.dispatch(
            'createSnackbar',
            this.$tr('userCreatedNotification', { username: this.username })
          );
        });
      },
      handleSubmitFailure(error) {
        this.caughtErrors = CatchErrors(error, [ERROR_CONSTANTS.USERNAME_ALREADY_EXISTS]);
        this.busy = false;
        if (this.caughtErrors.length > 0) {
          this.focusOnInvalidField();
        } else {
          this.$store.dispatch('handleApiError', error);
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
      userCreatedNotification: "User account for '{username}' was created",
    },
  };

</script>


<style lang="scss" scoped>

  .coach-selector {
    padding: 0;
    margin: 0;
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

  .form {
    margin-bottom: 20px;
  }

</style>
