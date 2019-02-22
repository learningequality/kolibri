<template>

  <KModal
    :title="$tr('createNewUserHeader',{thisClassName})"
    :submitText="$tr('saveUserButtonLabel')"
    :cancelText="$tr('cancel')"
    :submitDisabled="submitting"
    @submit="createNewUser"
    @cancel="close"
  >
    <section>
      <KTextbox
        ref="name"
        v-model.trim="fullName"
        type="text"
        :label="$tr('name')"
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
        :label="$tr('username')"
        :maxlength="30"
        :invalid="usernameIsInvalid"
        :invalidText="usernameIsInvalidText"
        @blur="usernameBlurred = true"
      />
      <KTextbox
        ref="password"
        v-model="password"
        type="password"
        :label="$tr('password')"
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
  import { FacilityUsernameResource } from 'kolibri.resources';
  import { validateUsername } from 'kolibri.utils.validators';
  import CatchErrors from 'kolibri.utils.CatchErrors';
  import KRadioButton from 'kolibri.coreVue.components.KRadioButton';
  import KModal from 'kolibri.coreVue.components.KModal';
  import KTextbox from 'kolibri.coreVue.components.KTextbox';
  import {
    filterAndSortUsers,
    userMatchesFilter,
  } from '../../../../../device_management/assets/src/userSearchUtils';

  export default {
    name: 'CoachUserCreateModal',
    $trs: {
      createNewUserHeader: 'Create new learner in {thisClassName}',
      cancel: 'Cancel',
      name: 'Full name',
      username: 'Username',
      password: 'Password',
      reEnterPassword: 'Re-enter password',
      userType: 'User type',
      saveUserButtonLabel: 'Save',
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
      KRadioButton,
      KModal,
      KTextbox,
    },
    props: {
      classId: {
        type: String,
        required: true,
      },
      className: {
        type: String,
        required: true,
      },
    },
    data() {
      return {
        thisClassName: this.className,
        thisClassId: this.classId,
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
        newUser: [],
        usernames: [],
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
            return this.$tr('required');
          }
        }
        return '';
      },
      nameIsInvalid() {
        return Boolean(this.nameIsInvalidText);
      },
      usernameAlreadyExists() {
        return this.usernames.find(
          username => username.toLowerCase() === this.username.toLowerCase()
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
    },
    beforeMount() {
      this.setSuggestions();
    },
    methods: {
      ...mapActions('userManagement', ['createUser', 'displayModal']),
      ...mapActions(['handleApiError']),
      ...mapActions('classAssignMembers', ['enrollLearnersInClass']),
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
              this.enrollLearnersInClass({ classId: this.thisClassId, users: this.getUsers() });
              this.close();
              location.reload();
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
      setSuggestions() {
        FacilityUsernameResource.fetchCollection({
          getParams: {
            facility: this.currentFacilityId,
          },
        })
          .then(users => {
            this.usernames = users.map(user => user.username);
          })
          .catch(() => {
            this.usernames = [];
          });
      },
      getUsers() {
        this.newUser.push(
          filterAndSortUsers(this.facilityUsers, user => userMatchesFilter(user, this.username))[0]
            .id
        );
        return this.newUser;
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
