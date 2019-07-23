<template>

  <form v-if="!loading" @submit.prevent="submitForm">
    <h1>
      {{ $tr('editUserDetailsHeader') }}
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
      </template>

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
  import UserType from 'kolibri.utils.UserType';
  import { FacilityUserResource } from 'kolibri.resources';
  import { mapState, mapGetters } from 'vuex';
  import urls from 'kolibri.urls';
  import { UserKinds, ERROR_CONSTANTS } from 'kolibri.coreVue.vuex.constants';
  import CatchErrors from 'kolibri.utils.CatchErrors';
  import KExternalLink from 'kolibri.coreVue.components.KExternalLink';
  import UserTypeDisplay from 'kolibri.coreVue.components.UserTypeDisplay';
  import KSelect from 'kolibri.coreVue.components.KSelect';
  import KRadioButton from 'kolibri.coreVue.components.KRadioButton';
  import KButton from 'kolibri.coreVue.components.KButton';
  import GenderSelect from 'kolibri.coreVue.components.GenderSelect';
  import BirthYearSelect from 'kolibri.coreVue.components.BirthYearSelect';
  import FullNameTextbox from 'kolibri.coreVue.components.FullNameTextbox';
  import UsernameTextbox from 'kolibri.coreVue.components.UsernameTextbox';
  import IdentifierTextbox from '../IdentifierTextbox';

  export default {
    name: 'UserEditForm',
    metaInfo() {
      return {
        title: this.$tr('editUserDetailsHeader'),
      };
    },
    components: {
      KButton,
      KSelect,
      KRadioButton,
      KExternalLink,
      UserTypeDisplay,
      GenderSelect,
      BirthYearSelect,
      UsernameTextbox,
      FullNameTextbox,
      IdentifierTextbox,
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
        gender: '',
        birthYear: '',
        idNumber: '',
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
      formIsValid() {
        return every([this.fullNameValid, this.usernameValid]);
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
        this.idNumber = user.id_number;
        this.gender = user.gender;
        this.birthYear = user.birth_year;
        this.setKind(user);
        this.makeCopyOfUser();
        this.loading = false;
      });
    },
    methods: {
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
          id_number: this.idNumber,
          gender: this.gender,
          birth_year: this.birthYear,
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
        if (!this.formIsValid) {
          return this.focusOnInvalidField();
        }
        this.busy = true;

        const updates = {
          username: this.username,
          full_name: this.fullName,
          id_number: this.idNumber,
          gender: this.gender,
          birth_year: this.birthYear,
        };

        if (!this.editingSuperAdmin) {
          updates.role = {
            collection: this.currentFacilityId,
            kind: this.newUserKind,
          };
        }

        this.$store
          .dispatch('userManagement/updateUser', {
            userId: this.userId,
            updates,
            original: { ...this.userCopy },
          })
          .then(() => {
            this.handleSubmitSuccess();
          })
          .catch(error => {
            this.handleSubmitFailure(error);
          });
      },
      handleSubmitSuccess() {
        this.busy = false;
        // newUserKind is falsey if Super Admin, since that's not a facility role
        if (this.editingSelf && this.newUserKind && this.newUserKind !== UserKinds.ADMIN) {
          // Log out of Facility Page if and Admin demotes themselves to non-Admin
          this.$store.dispatch('kolibriLogout');
        } else {
          this.$store.dispatch('createSnackbar', this.$tr('userUpdateNotification'));
        }
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
    border: 0;
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
