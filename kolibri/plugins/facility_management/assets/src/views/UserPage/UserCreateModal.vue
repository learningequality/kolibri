<template>

  <KModal
    :title="$tr('createNewUserHeader')"
    :submitText="coreCommon$tr('saveAction')"
    :cancelText="coreCommon$tr('cancelAction')"
    :submitDisabled="submitting"
    @submit="createNewUser"
    @cancel="$emit('cancel')"
  >
    <section>
      <KTextbox
        ref="name"
        v-model.trim="fullName"
        type="text"
        :label="coreCommon$tr('fullNameLabel')"
        :autofocus="true"
        :maxlength="120"
        :invalid="nameIsInvalid"
        :invalidText="nameIsInvalidText"
        @blur="nameBlurred = true"
      />
      <KTextbox
        ref="username"
        v-model="username"
        type="text"
        :label="coreCommon$tr('usernameLabel')"
        :maxlength="30"
        :invalid="usernameIsInvalid"
        :invalidText="usernameIsInvalidText"
        @blur="usernameBlurred = true"
      />
      <KTextbox
        ref="password"
        v-model="password"
        type="password"
        :label="coreCommon$tr('passwordLabel')"
        :invalid="passwordIsInvalid"
        :invalidText="passwordIsInvalidText"
        @blur="passwordBlurred = true"
      />
      <KTextbox
        ref="confirmedPassword"
        v-model="confirmedPassword"
        type="password"
        :label="$tr('reEnterPassword')"
        :invalid="confirmedPasswordIsInvalid"
        :invalidText="confirmedPasswordIsInvalidText"
        @blur="confirmedPasswordBlurred = true"
      />

      <KSelect
        v-model="kind"
        :label="coreCommon$tr('userTypeLabel')"
        :options="userKindDropdownOptions"
      />

      <fieldset v-if="coachIsSelected" class="coach-selector">
        <KRadioButton
          v-model="classCoach"
          :label="$tr('classCoachLabel')"
          :description="$tr('classCoachDescription')"
          :value="true"
        />
        <KRadioButton
          v-model="classCoach"
          :label="$tr('facilityCoachLabel')"
          :description="$tr('facilityCoachDescription')"
          :value="false"
        />
      </fieldset>
    </section>
  </KModal>

</template>


<script>

  import { mapActions, mapState, mapGetters } from 'vuex';
  import { UserKinds, ERROR_CONSTANTS } from 'kolibri.coreVue.vuex.constants';
  import { validateUsername } from 'kolibri.utils.validators';
  import CatchErrors from 'kolibri.utils.CatchErrors';
  import { coreStringsMixin } from 'kolibri.coreVue.mixins.coreStringsMixin';
  import KRadioButton from 'kolibri.coreVue.components.KRadioButton';
  import KModal from 'kolibri.coreVue.components.KModal';
  import KTextbox from 'kolibri.coreVue.components.KTextbox';
  import KSelect from 'kolibri.coreVue.components.KSelect';

  export default {
    name: 'UserCreateModal',
    components: {
      KRadioButton,
      KModal,
      KTextbox,
      KSelect,
    },
    mixins: [coreStringsMixin],
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
      ...mapState('userManagement', ['facilityUsers']),
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
            return this.coreCommon$tr('requiredFieldLabel');
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
            return this.coreCommon$tr('requiredFieldLabel');
          }
          if (!validateUsername(this.username)) {
            return this.coreCommon$tr('usernameNotAlphaNumError');
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
            return this.coreCommon$tr('requiredFieldLabel');
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
            return this.coreCommon$tr('requiredFieldLabel');
          }
          if (this.confirmedPassword !== this.password) {
            return this.coreCommon$tr('passwordsMismatchError');
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
            label: this.coreCommon$tr('coachLabel'),
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
              this.$emit('cancel');
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
    },
    $trs: {
      createNewUserHeader: 'Create new user',
      reEnterPassword: 'Re-enter password',
      learner: 'Learner',
      admin: 'Admin',
      classCoachLabel: 'Class coach',
      classCoachDescription: "Can only instruct classes that they're assigned to",
      facilityCoachLabel: 'Facility coach',
      facilityCoachDescription: 'Can instruct all classes in your facility',
      usernameAlreadyExists: 'Username already exists',
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
