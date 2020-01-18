<template>

  <KPageContainer class="narrow-container">
    <form v-if="!loading" class="form" @submit.prevent="submitForm">
      <h1>
        {{ $tr('editUserDetailsHeader') }}
      </h1>

      <section>
        <FullNameTextbox
          ref="fullNameTextbox"
          :autofocus="true"
          :disabled="formDisabled"
          :value.sync="fullName"
          :isValid.sync="fullNameValid"
          :shouldValidate="formSubmitted"
        />

        <UsernameTextbox
          ref="usernameTextbox"
          :disabled="formDisabled"
          :value.sync="username"
          :isValid.sync="usernameValid"
          :shouldValidate="formSubmitted"
          :isUniqueValidator="usernameIsUnique"
          :errors.sync="caughtErrors"
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
            class="select"
            :disabled="formDisabled"
            :label="coreString('userTypeLabel')"
            :options="userTypeOptions"
          />

          <fieldset v-if="coachIsSelected" class="coach-selector">
            <KRadioButton
              v-model="classCoachIsSelected"
              :disabled="formDisabled"
              :label="coreString('classCoachLabel')"
              :description="$tr('classCoachDescription')"
              :value="true"
            />
            <KRadioButton
              v-model="classCoachIsSelected"
              :disabled="formDisabled"
              :label="coreString('facilityCoachLabel')"
              :description="$tr('facilityCoachDescription')"
              :value="false"
            />
          </fieldset>
        </template>

        <IdentifierTextbox
          :value.sync="idNumber"
          :disabled="formDisabled"
        />

        <BirthYearSelect
          :value.sync="birthYear"
          :disabled="formDisabled"
          class="select"
        />

        <GenderSelect
          :value.sync="gender"
          :disabled="formDisabled"
          class="select"
        />
      </section>

      <p v-if="willBeLoggedOut">
        {{ $tr('forceLogoutWarning') }}
      </p>
      <div class="buttons">
        <KButton
          type="submit"
          :text="coreString('saveAction')"
          :disabled="formDisabled"
          :primary="true"
        />
        <KButton
          :text="cancelButtonText"
          :disabled="formDisabled"
          @click="goToUserManagementPage()"
        />
      </div>

    </form>
  </KPageContainer>

</template>


<script>

  import every from 'lodash/every';
  import pickBy from 'lodash/pickBy';
  import UserType from 'kolibri.utils.UserType';
  import { FacilityUserResource } from 'kolibri.resources';
  import { mapState, mapGetters } from 'vuex';
  import urls from 'kolibri.urls';
  import { UserKinds, ERROR_CONSTANTS } from 'kolibri.coreVue.vuex.constants';
  import CatchErrors from 'kolibri.utils.CatchErrors';
  import UserTypeDisplay from 'kolibri.coreVue.components.UserTypeDisplay';
  import GenderSelect from 'kolibri.coreVue.components.GenderSelect';
  import BirthYearSelect from 'kolibri.coreVue.components.BirthYearSelect';
  import FullNameTextbox from 'kolibri.coreVue.components.FullNameTextbox';
  import UsernameTextbox from 'kolibri.coreVue.components.UsernameTextbox';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import IdentifierTextbox from './IdentifierTextbox';

  export default {
    name: 'UserEditPage',
    metaInfo() {
      return {
        title: this.$tr('editUserDetailsHeader'),
      };
    },
    components: {
      UserTypeDisplay,
      GenderSelect,
      BirthYearSelect,
      UsernameTextbox,
      FullNameTextbox,
      IdentifierTextbox,
    },
    mixins: [commonCoreStrings],
    data() {
      return {
        fullName: '',
        fullNameValid: true,
        username: '',
        usernameValid: true,
        kind: '',
        loading: true,
        formSubmitted: false,
        classCoachIsSelected: true,
        typeSelected: null, // see beforeMount
        gender: '',
        birthYear: '',
        idNumber: '',
        userCopy: {},
        caughtErrors: [],
        status: '',
      };
    },
    computed: {
      ...mapGetters(['currentFacilityId', 'currentUserId']),
      ...mapState('userManagement', ['facilityUsers']),
      formDisabled() {
        return this.status === 'BUSY';
      },
      cancelButtonText() {
        return this.status === 'SUCCESS'
          ? this.coreString('closeAction')
          : this.coreString('cancelAction');
      },
      coachIsSelected() {
        return this.typeSelected && this.typeSelected.value === UserKinds.COACH;
      },
      userId() {
        return this.$route.params.id;
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
        const devicePageUrl = urls['kolibri:kolibri.plugins.device:device_management'];
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
      willBeLoggedOut() {
        return this.editingSelf && this.newUserKind && this.newUserKind !== UserKinds.ADMIN;
      },
    },
    mounted() {
      FacilityUserResource.fetchModel({
        id: this.$route.params.id,
      })
        .then(user => {
          this.username = user.username;
          this.fullName = user.full_name;
          this.idNumber = user.id_number;
          this.gender = user.gender;
          this.birthYear = user.birth_year;
          this.setKind(user);
          this.makeCopyOfUser(user);
          this.loading = false;
        })
        .catch(error => {
          this.$store.dispatch('handleApiError', error);
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
      makeCopyOfUser(user) {
        this.userCopy = {
          birth_year: this.birthYear,
          full_name: this.fullName,
          gender: this.gender,
          id_number: this.idNumber,
          username: this.username,
          kind: UserType(user),
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
      // Returns the subset of the FacilityUserModel that has been changed
      getUpdates() {
        let roleUpdates;
        const facilityUserUpdates = pickBy(
          {
            birth_year: this.birthYear,
            full_name: this.fullName,
            gender: this.gender,
            id_number: this.idNumber,
            username: this.username,
          },
          (value, key) => {
            return value !== this.userCopy[key];
          }
        );

        // Roles are update via a different API than FacilityUsers, so pass
        // their update separately
        if (!this.editingSuperAdmin && this.newUserKind !== this.userCopy.kind) {
          roleUpdates = {
            collection: this.currentFacilityId,
            kind: this.newUserKind,
          };
        }
        return {
          facilityUserUpdates,
          roleUpdates,
        };
      },
      submitForm() {
        this.formSubmitted = true;

        if (!this.formIsValid) {
          return this.focusOnInvalidField();
        }

        this.status = 'BUSY';

        this.$store
          .dispatch('userManagement/updateFacilityUserDetails', {
            userId: this.userId,
            updates: this.getUpdates(),
          })
          .then(() => {
            this.handleSubmitSuccess();
          })
          .catch(error => {
            this.handleSubmitFailure(error);
          });
      },
      handleSubmitSuccess() {
        this.status = 'SUCCESS';
        // newUserKind is falsey if Super Admin, since that's not a facility role
        if (this.willBeLoggedOut) {
          // Log out of Facility Page if and Admin demotes themselves to non-Admin
          this.$store.dispatch('kolibriLogout');
        } else {
          this.$store.dispatch('createSnackbar', this.$tr('userUpdateNotification'));
        }
      },
      handleSubmitFailure(error) {
        this.status = 'FAILURE';
        this.caughtErrors = CatchErrors(error, [ERROR_CONSTANTS.USERNAME_ALREADY_EXISTS]);
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
      changeInDeviceTabPrompt: 'Go to Device permissions to change this',
      viewInDeviceTabPrompt: 'View details in Device permissions',
      classCoachDescription: "Can only instruct classes that they're assigned to",
      facilityCoachDescription: 'Can instruct all classes in your facility',
      userUpdateNotification: 'Changes saved',
      forceLogoutWarning:
        'Warning: By making your self a non-admin, you will be logged out after clicking "Save".',
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
    margin-bottom: 16px;
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

  .narrow-container {
    max-width: 500px;
    margin: auto;
    overflow: visible;
  }

  .form {
    max-width: 400px;
    margin-right: auto;
    margin-left: auto;
  }

</style>
