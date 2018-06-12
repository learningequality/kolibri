<template>

  <core-modal
    :title="$tr('editUser')"
    @cancel="displayModal(false)"
    width="400px"
  >
    <form class="edit-user-form" @submit.prevent="submitForm">

      <ui-alert
        v-if="error"
        type="error"
        :dismissible="false"
      >
        {{ error }}
      </ui-alert>

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

      <div class="core-modal-buttons">
        <k-button
          :text="$tr('cancel')"
          :primary="false"
          appearance="flat-button"
          @click="displayModal(false)"
        />
        <k-button
          type="submit"
          :text="$tr('save')"
          :primary="true"
          appearance="raised-button"
          :disabled="isBusy"
        />
      </div>
    </form>
  </core-modal>

</template>


<script>

  import { UserKinds } from 'kolibri.coreVue.vuex.constants';
  import { currentFacilityId } from 'kolibri.coreVue.vuex.getters';
  import { validateUsername } from 'kolibri.utils.validators';
  import coreModal from 'kolibri.coreVue.components.coreModal';
  import kTextbox from 'kolibri.coreVue.components.kTextbox';
  import kButton from 'kolibri.coreVue.components.kButton';
  import kSelect from 'kolibri.coreVue.components.kSelect';
  import uiAlert from 'kolibri.coreVue.components.uiAlert';
  import kRadioButton from 'kolibri.coreVue.components.kRadioButton';
  import { updateUser, displayModal } from '../../state/actions';

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
      kButton,
      coreModal,
      kTextbox,
      kSelect,
      uiAlert,
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
          this.updateUser(this.id, {
            username: this.newUsername,
            full_name: this.newName,
            role: roleUpdate,
          }).then(() => {
            this.displayModal(false);
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
    vuex: {
      actions: {
        updateUser,
        displayModal,
      },
      getters: {
        currentFacilityId,
        currentUserId: state => state.core.session.user_id,
        currentUserKind: state => state.core.session.kind[0],
        facilityUsers: state => state.pageState.facilityUsers,
        error: state => state.pageState.error,
        isBusy: state => state.pageState.isBusy,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  .coach-selector
    margin-bottom: 3em
    margin: 0
    padding: 0
    border: none

  .edit-user-form
    min-height: 350px

</style>
