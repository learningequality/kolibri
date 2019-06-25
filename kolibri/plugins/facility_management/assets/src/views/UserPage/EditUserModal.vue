<template>

  <KModal
    :title="$tr('editUserDetailsHeader')"
    :submitText="coreCommon$tr('saveAction')"
    :cancelText="coreCommon$tr('cancelAction')"
    :submitDisabled="isBusy"
    @submit="submitForm"
    @cancel="$emit('cancel')"
  >
    <KTextbox
      ref="name"
      v-model="newName"
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
      v-model="newUsername"
      type="text"
      :label="coreCommon$tr('usernameLabel')"
      :maxlength="30"
      :invalid="usernameIsInvalid"
      :invalidText="usernameIsInvalidText"
      @blur="usernameBlurred = true"
      @input="setError(null)"
    />

    <template v-if="editingSuperAdmin">
      <h2 class="user-type header">
        {{ coreCommon$tr('userTypeLabel') }}
      </h2>

      <UserTypeDisplay
        :userType="kind"
        class="user-type"
      />

      <KExternalLink
        v-if="devicePermissionsPageLink"
        class="super-admin-description"
        :text="editingSelf ? $tr('viewInDeviceTabPrompt') : $tr('changeInDeviceTabPrompt')"
        :href="devicePermissionsPageLink"
      />

    </template>

    <template v-else>
      <KSelect
        v-model="typeSelected"
        :label="coreCommon$tr('userTypeLabel')"
        :options="userTypeOptions"
      />

      <fieldset v-if="coachIsSelected" class="coach-selector">
        <KRadioButton
          v-model="classCoachIsSelected"
          :label="$tr('classCoachLabel')"
          :description="$tr('classCoachDescription')"
          :value="true"
        />
        <KRadioButton
          v-model="classCoachIsSelected"
          :label="$tr('facilityCoachLabel')"
          :description="$tr('facilityCoachDescription')"
          :value="false"
        />
      </fieldset>
    </template>

  </KModal>

</template>


<script>

  import { mapActions, mapState, mapGetters } from 'vuex';
  import urls from 'kolibri.urls';
  import { UserKinds, ERROR_CONSTANTS } from 'kolibri.coreVue.vuex.constants';
  import { validateUsername } from 'kolibri.utils.validators';
  import { coreStringsMixin } from 'kolibri.coreVue.mixins.coreStringsMixin';
  import KModal from 'kolibri.coreVue.components.KModal';
  import KTextbox from 'kolibri.coreVue.components.KTextbox';
  import KExternalLink from 'kolibri.coreVue.components.KExternalLink';
  import UserTypeDisplay from 'kolibri.coreVue.components.UserTypeDisplay';
  import KSelect from 'kolibri.coreVue.components.KSelect';
  import KRadioButton from 'kolibri.coreVue.components.KRadioButton';

  // IDEA use UserTypeDisplay for strings in options
  export default {
    name: 'EditUserModal',
    components: {
      KModal,
      KTextbox,
      KSelect,
      KRadioButton,
      KExternalLink,
      UserTypeDisplay,
    },
    mixins: [coreStringsMixin],
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
        newName: this.name,
        newUsername: this.username,
        classCoachIsSelected: true,
        typeSelected: null, // see beforeMount
        nameBlurred: false,
        usernameBlurred: false,
      };
    },
    computed: {
      ...mapGetters(['currentFacilityId', 'currentUserId']),
      ...mapState('userManagement', ['facilityUsers', 'error', 'isBusy']),
      coachIsSelected() {
        return this.typeSelected.value === UserKinds.COACH;
      },
      userTypeOptions() {
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
      nameIsInvalidText() {
        if (this.nameBlurred) {
          if (this.newName === '') {
            return this.coreCommon$tr('requiredFieldLabel');
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
        if (this.usernameBlurred) {
          if (this.newUsername === '') {
            return this.coreCommon$tr('requiredFieldLabel');
          }
          if (this.usernameAlreadyExists) {
            return this.$tr('usernameAlreadyExists');
          }
          if (!validateUsername(this.newUsername)) {
            return this.coreCommon$tr('usernameNotAlphaNumError');
          }
        }
        return '';
      },
      usernameIsInvalid() {
        return Boolean(this.usernameIsInvalidText);
      },
      formIsInvalid() {
        return this.nameIsInvalid || this.usernameIsInvalid;
      },
      editingSelf() {
        return this.currentUserId === this.id;
      },
      editingSuperAdmin() {
        return this.kind === UserKinds.SUPERUSER;
      },
      devicePermissionsPageLink() {
        const devicePageUrl = urls['kolibri:devicemanagementplugin:device_management'];
        if (devicePageUrl) {
          return `${devicePageUrl()}#/permissions/${this.id}`;
        }

        return '';
      },
      newType() {
        // never got the chance to even change it
        if (this.editingSuperAdmin) {
          return '';
        }
        if (this.typeSelected.value === UserKinds.COACH) {
          if (this.classCoachIsSelected) {
            return UserKinds.ASSIGNABLE_COACH;
          }

          return UserKinds.COACH;
        }
        return this.typeSelected.value;
      },
    },
    beforeMount() {
      const coachOption = this.userTypeOptions[1];
      if (this.kind === UserKinds.ASSIGNABLE_COACH) {
        this.typeSelected = coachOption;
        this.classCoachIsSelected = true;
      } else if (this.kind === UserKinds.COACH) {
        this.typeSelected = coachOption;
        this.classCoachIsSelected = false;
      } else {
        this.typeSelected = this.userTypeOptions.find(kind => kind.value === this.kind) || {};
      }
    },
    methods: {
      ...mapActions('userManagement', ['updateUser', 'setError']),
      ...mapActions(['kolibriLogout']),
      submitForm() {
        if (this.formIsInvalid) {
          if (this.nameIsInvalid) {
            this.$refs.name.focus();
          } else if (this.usernameIsInvalid) {
            this.$refs.username.focus();
          }

          return;
        }

        const updates = {
          username: this.newUsername,
          full_name: this.newName,
        };

        if (this.newType) {
          updates.role = {
            collection: this.currentFacilityId,
            kind: this.newType,
          };
        }

        this.updateUser({
          userId: this.id,
          updates,
        }).then(() => {
          // newType is falsey if Super Admin, since that's not a facility role
          if (this.editingSelf && this.newType && this.newType !== UserKinds.ADMIN) {
            // user has demoted themselves
            this.kolibriLogout();
          }
          this.$emit('cancel');
        });
      },
    },
    $trs: {
      editUserDetailsHeader: 'Edit user details',
      admin: 'Admin',
      learner: 'Learner',
      usernameAlreadyExists: 'Username already exists',
      changeInDeviceTabPrompt: 'Go to Device permissions to change this',
      viewInDeviceTabPrompt: 'View details in Device permissions',
      classCoachLabel: 'Class coach',
      classCoachDescription: "Can only instruct classes that they're assigned to",
      facilityCoachLabel: 'Facility coach',
      facilityCoachDescription: 'Can instruct all classes in your facility',
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

  .super-admin-description,
  .user-type.header,
  .user-admin {
    display: block;
  }

  .super-admin-description {
    font-size: 12px;
  }

  .user-type.header {
    font-size: 16px;
  }

</style>
