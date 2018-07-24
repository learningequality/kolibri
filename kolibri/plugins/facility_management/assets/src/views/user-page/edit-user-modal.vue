<template>

  <k-modal
    :title="$tr('editUser')"
    :submitText="$tr('save')"
    :cancelText="$tr('cancel')"
    :submitDisabled="isBusy"
    @submit="submitForm"
    @cancel="displayModal(false)"
  >
    <k-textbox
      ref="name"
      type="text"
      :label="$tr('fullName')"
      :autofocus="true"
      :maxlength="120"
      :invalid="nameIsInvalid"
      :invalidText="nameIsInvalidText"
      @blur="nameBlurred = true"
      v-model="newName"
    />

    <k-textbox
      ref="username"
      type="text"
      :label="$tr('username')"
      :maxlength="30"
      :invalid="usernameIsInvalid"
      :invalidText="usernameIsInvalidText"
      @blur="usernameBlurred = true"
      @input="setError(null)"
      v-model="newUsername"
    />

    <k-select
      :label="$tr('userType')"
      :options="userKinds"
      v-model="newKind"
    />

    <fieldset class="coach-selector" v-if="coachIsSelected">
      <k-radio-button
        :label="$tr('classCoachLabel')"
        :description="$tr('classCoachDescription')"
        :value="true"
        v-model="classCoachIsSelected"
      />
      <k-radio-button
        :label="$tr('facilityCoachLabel')"
        :description="$tr('facilityCoachDescription')"
        :value="false"
        v-model="classCoachIsSelected"
      />
    </fieldset>
  </k-modal>

</template>


<script>

  import { mapActions, mapState, mapGetters } from 'vuex';
  import { UserKinds } from 'kolibri.coreVue.vuex.constants';
  import { validateUsername } from 'kolibri.utils.validators';
  import kModal from 'kolibri.coreVue.components.kModal';
  import kTextbox from 'kolibri.coreVue.components.kTextbox';
  import kSelect from 'kolibri.coreVue.components.kSelect';
  import kRadioButton from 'kolibri.coreVue.components.kRadioButton';
  import { ERROR_CONSTANTS } from 'kolibri.coreVue.vuex.constants';

  export default {
    name: 'editUserModal',
    $trs: {
      editUser: 'Edit user',
      fullName: 'Full name',
      username: 'Username',
      userType: 'User type',
      admin: 'Admin',
      coach: 'Coach',
      learner: 'Learner',
      save: 'Save',
      cancel: 'Cancel',
      required: 'This field is required',
      usernameAlreadyExists: 'Username already exists',
      usernameNotAlphaNumUnderscore: 'Username can only contain letters, numbers, and underscores',
      classCoachLabel: 'Class coach',
      classCoachDescription: "Can only instruct classes that they're assigned to",
      facilityCoachLabel: 'Facility coach',
      facilityCoachDescription: 'Can instruct all classes in your facility',
    },
    components: {
      kModal,
      kTextbox,
      kSelect,
      kRadioButton,
    },
    props: {
      id: {
        type: String,
        required: true,
      },
      name: {
        type: String,
        required: true,
      },
      username: {
        type: String,
        required: true,
      },
      kind: {
        type: String,
        required: true,
      },
    },
    data() {
      return {
        classCoachIsSelected: true,
        newName: this.name,
        newUsername: this.username,
        newKind: null,
        nameBlurred: false,
        usernameBlurred: false,
        formSubmitted: false,
      };
    },
    computed: {
      ...mapGetters(['currentFacilityId']),
      ...mapState({
        currentUserId: state => state.core.session.user_id,
        currentUserKind: state => state.core.session.kind[0],
        facilityUsers: state => state.pageState.facilityUsers,
        error: state => state.pageState.error,
        isBusy: state => state.pageState.isBusy,
      }),
      coachIsSelected() {
        return this.newKind.value === UserKinds.COACH;
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
      nameIsInvalidText() {
        if (this.nameBlurred || this.formSubmitted) {
          if (this.newName === '') {
            return this.$tr('required');
          }
        }
        return '';
      },
      nameIsInvalid() {
        return Boolean(this.nameIsInvalidText);
      },
      usernameAlreadyExists() {
        // Just return if it's the same username with a different case
        if (this.username.toLowerCase() === this.newUsername.toLowerCase()) {
          return false;
        }

        if (this.error) {
          if (this.error.includes(ERROR_CONSTANTS.USERNAME_ALREADY_EXISTS)) {
            return true;
          }
        }

        return this.facilityUsers.find(
          ({ username }) => username.toLowerCase() === this.newUsername.toLowerCase()
        );
      },
      usernameIsInvalidText() {
        if (this.usernameBlurred || this.formSubmitted) {
          if (this.newUsername === '') {
            return this.$tr('required');
          }
          if (this.usernameAlreadyExists) {
            return this.$tr('usernameAlreadyExists');
          }
          if (!validateUsername(this.newUsername)) {
            return this.$tr('usernameNotAlphaNumUnderscore');
          }
        }
        return '';
      },
      usernameIsInvalid() {
        return Boolean(this.usernameIsInvalidText);
      },
      formIsValid() {
        return !this.nameIsInvalid && !this.usernameIsInvalid;
      },
    },
    beforeMount() {
      const coachOption = this.userKinds[1];
      if (this.kind === UserKinds.ASSIGNABLE_COACH) {
        this.newKind = coachOption;
        this.classCoachIsSelected = true;
      } else if (this.kind === UserKinds.COACH) {
        this.newKind = coachOption;
        this.classCoachIsSelected = false;
      } else {
        this.newKind = this.userKinds.find(kind => kind.value === this.kind);
      }
    },
    methods: {
      ...mapActions(['updateUser', 'displayModal', 'setError']),
      submitForm() {
        const roleUpdate = {
          collection: this.currentFacilityId,
        };
        this.formSubmitted = true;
        if (this.formIsValid) {
          if (this.newKind.value === UserKinds.COACH) {
            if (this.classCoachIsSelected) {
              roleUpdate.kind = UserKinds.ASSIGNABLE_COACH;
            } else {
              roleUpdate.kind = UserKinds.COACH;
            }
          } else {
            roleUpdate.kind = this.newKind.value;
          }
          this.updateUser({
            userId: this.id,
            updates: {
              username: this.newUsername,
              full_name: this.newName,
              role: roleUpdate,
            },
          });
          if (
            this.currentUserId === this.id &&
            this.currentUserKind !== UserKinds.SUPERUSER &&
            this.newKind.value === UserKinds.LEARNER
          ) {
            window.location.href = window.location.origin;
          }
        } else {
          if (this.nameIsInvalid) {
            this.$refs.name.focus();
          } else if (this.usernameIsInvalid) {
            this.$refs.username.focus();
          }
        }
      },
    },
  };

</script>


<style lang="scss" scoped>

  .coach-selector {
    padding: 0;
    margin: 0;
    margin-bottom: 3em;
    border: 0;
  }

  .edit-user-form {
    min-height: 350px;
  }

</style>
