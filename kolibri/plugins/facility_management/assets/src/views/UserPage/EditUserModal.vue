<template>

  <form v-if="!loading" @submit.prevent="submitForm">
    <h1>{{ $tr('editUserDetailsHeader') }}</h1>

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

    <template v-if="editingSuperAdmin">
      <h2 class="user-type header">
        {{ $tr('userType') }}
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
        :disabled="busy"
        class="select"
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
    </template>

    <div>
      <KTextbox
        v-model="identificationNumber"
        :disabled="busy"
        :label="$tr('identificationNumberLabel')"
      />
    </div>

    <SelectBirthYear
      class="select"
      :disabled="busy"
      :value.sync="birthYear"
    />
    <SelectGender
      class="select"
      :disabled="busy"
      :value.sync="gender"
    />

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

  import UserType from 'kolibri.utils.UserType';
  import { FacilityUserResource } from 'kolibri.resources';
  import { mapActions, mapState, mapGetters } from 'vuex';
  import urls from 'kolibri.urls';
  import { UserKinds, ERROR_CONSTANTS } from 'kolibri.coreVue.vuex.constants';
  import CatchErrors from 'kolibri.utils.CatchErrors';
  import KTextbox from 'kolibri.coreVue.components.KTextbox';
  import KExternalLink from 'kolibri.coreVue.components.KExternalLink';
  import UserTypeDisplay from 'kolibri.coreVue.components.UserTypeDisplay';
  import KSelect from 'kolibri.coreVue.components.KSelect';
  import KRadioButton from 'kolibri.coreVue.components.KRadioButton';
  import KButton from 'kolibri.coreVue.components.KButton';
  import SelectGender from 'kolibri.coreVue.components.SelectGender';
  import SelectBirthYear from 'kolibri.coreVue.components.SelectBirthYear';
  import TextboxFullName from 'kolibri.coreVue.components.TextboxFullName';
  import TextboxUsername from 'kolibri.coreVue.components.TextboxUsername';

  // IDEA use UserTypeDisplay for strings in options
  export default {
    name: 'EditUserModal',
    components: {
      KButton,
      KTextbox,
      KSelect,
      KRadioButton,
      KExternalLink,
      UserTypeDisplay,
      SelectGender,
      SelectBirthYear,
      TextboxUsername,
      TextboxFullName,
    },
    data() {
      return {
        fullName: '',
        fullNameValid: true,
        username: '',
        usernameValid: true,
        kind: '',
        loading: true,
        busy: false,
        formSubmitted: false,
        classCoachIsSelected: true,
        typeSelected: null, // see beforeMount
        gender: null,
        birthYear: null,
        identificationNumber: '',
        userCopy: {},
        caughtErrors: [],
      };
    },
    computed: {
      ...mapGetters(['currentFacilityId', 'currentUserId']),
      ...mapState('userManagement', ['facilityUsers']),
      coachIsSelected() {
        return this.typeSelected && this.typeSelected.value === UserKinds.COACH;
      },
      userId() {
        return this.$route.params.id;
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
      formIsInvalid() {
        return !this.fullNameValid || !this.usernameValid;
      },
      editingSelf() {
        return this.currentUserId === this.userId;
      },
      editingSuperAdmin() {
        return this.kind === UserKinds.SUPERUSER;
      },
      devicePermissionsPageLink() {
        const devicePageUrl = urls['kolibri:devicemanagementplugin:device_management'];
        if (devicePageUrl) {
          return `${devicePageUrl()}#/permissions/${this.userId}`;
        }

        return '';
      },
      newUserKind() {
        const { value } = this.typeSelected;
        if (value === UserKinds.COACH && this.classCoachIsSelected) {
          return UserKinds.ASSIGNABLE_COACH;
        }
        return value;
      },
    },
    mounted() {
      FacilityUserResource.fetchModel({
        id: this.$route.params.id,
      }).then(user => {
        this.username = user.username;
        this.fullName = user.full_name;
        this.setKind(user);
        this.makeCopyOfUser();
        this.loading = false;
      });
    },
    methods: {
      ...mapActions('userManagement', ['updateUser']),
      ...mapActions(['kolibriLogout']),
      setKind(user) {
        this.kind = UserType(user);
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
      makeCopyOfUser() {
        this.userCopy = {
          full_name: this.fullName,
          username: this.username,
          kind: this.kind,
        };
      },
      goToUserManagementPage() {
        this.$router.push(this.$router.getRoute('USER_MGMT_PAGE'));
      },
      usernameIsUnique(value) {
        const match = this.facilityUsers.find(
          ({ username }) => username.toLowerCase() === value.toLowerCase()
        );
        if (match && match.username.toLowerCase() === this.userCopy.username.toLowerCase()) {
          return true;
        }
        return !match;
      },
      submitForm() {
        this.formSubmitted = true;
        if (this.formIsInvalid) {
          return this.focusOnInvalidField();
        }

        const updates = {
          username: this.username,
          full_name: this.fullName,
        };

        if (!this.editingSuperAdmin) {
          updates.role = {
            collection: this.currentFacilityId,
            kind: this.newUserKind,
          };
        }

        this.busy = true;
        this.updateUser({
          userId: this.userId,
          updates,
          original: { ...this.userCopy },
        })
          .then(() => {
            // newUserKind is falsey if Super Admin, since that's not a facility role
            if (this.editingSelf && this.newUserKind && this.newUserKind !== UserKinds.ADMIN) {
              // user has demoted themselves
              this.kolibriLogout();
            } else {
              this.busy = false;
              this.$store.dispatch('createSnackbar', this.$tr('userUpdateNotification'));
            }
          })
          .catch(error => {
            this.caughtErrors = CatchErrors(error, [ERROR_CONSTANTS.USERNAME_ALREADY_EXISTS]);
            if (this.caughtErrors.length > 0) {
              this.busy = false;
              this.focusOnInvalidField();
            } else {
              this.$store.dispatch('handleApiError', error);
            }
          });
      },
      focusOnInvalidField() {
        this.$nextTick().then(() => {
          if (!this.fullNameValid) {
            this.$refs.textboxFullName.focus();
          } else if (!this.usernameValid) {
            this.$refs.textboxUsername.focus();
          }
        });
      },
    },
    $trs: {
      editUserDetailsHeader: 'Edit user details',
      fullName: 'Full name',
      username: 'Username',
      userType: 'User type',
      admin: 'Admin',
      coach: 'Coach',
      learner: 'Learner',
      save: 'Save',
      cancel: 'Cancel',
      required: 'This field is required',
      changeInDeviceTabPrompt: 'Go to Device permissions to change this',
      viewInDeviceTabPrompt: 'View details in Device permissions',
      classCoachLabel: 'Class coach',
      classCoachDescription: "Can only instruct classes that they're assigned to",
      facilityCoachLabel: 'Facility coach',
      facilityCoachDescription: 'Can instruct all classes in your facility',
      identificationNumberLabel: 'Identification number (optional)',
      cancelAction: 'Cancel',
      saveAction: 'Save',
      userUpdateNotification: 'Changes saved',
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

  .select {
    margin: 18px 0 36px;
  }

  .buttons {
    button:first-of-type {
      margin-left: 0;
    }
  }

</style>
