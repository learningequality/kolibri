<template>

  <KModal
    :title="$tr('editUserDetailsHeader')"
    :submitText="coreString('saveAction')"
    :cancelText="coreString('cancelAction')"
    :submitDisabled="isBusy"
    @submit="submitForm"
    @cancel="$emit('cancel')"
  >
    <KTextbox
      ref="name"
      v-model="newName"
      type="text"
      :label="coreString('fullNameLabel')"
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
      :label="coreString('usernameLabel')"
      :maxlength="30"
      :invalid="usernameIsInvalid"
      :invalidText="usernameIsInvalidText"
      @blur="usernameBlurred = true"
      @input="setError(null)"
    />

    <template v-if="editingSuperAdmin">
      <h2 class="user-type header">
        {{ coreString('userTypeLabel') }}
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
        :label="coreString('userTypeLabel')"
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
          :label="coreString('facilityCoachLabel')"
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
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import UserTypeDisplay from 'kolibri.coreVue.components.UserTypeDisplay';

  // IDEA use UserTypeDisplay for strings in options
  export default {
    name: 'EditUserModal',
    components: {
      UserTypeDisplay,
    },
    mixins: [commonCoreStrings],
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
            label: this.coreString('learnerLabel'),
            value: UserKinds.LEARNER,
          },
          {
            label: this.coreString('coachLabel'),
            value: UserKinds.COACH,
          },
          {
            label: this.coreString('adminLabel'),
            value: UserKinds.ADMIN,
          },
        ];
      },
      nameIsInvalidText() {
        if (this.nameBlurred) {
          if (this.newName === '') {
            return this.coreString('requiredFieldLabel');
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
            return this.coreString('requiredFieldLabel');
          }
          if (this.usernameAlreadyExists) {
            return this.$tr('usernameAlreadyExists');
          }
          if (!validateUsername(this.newUsername)) {
            return this.coreString('usernameNotAlphaNumError');
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
