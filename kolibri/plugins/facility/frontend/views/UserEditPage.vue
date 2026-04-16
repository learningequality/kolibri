<template>

  <ImmersivePage
    :route="$store.getters.facilityPageLinks.UserPage"
    :appBarTitle="coreString('usersLabel')"
    :loading="loading"
  >
    <KPageContainer class="narrow-container">
      <form
        v-if="!loading"
        class="form"
        data-testid="form"
        @submit.prevent="submitForm"
      >
        <section>
          <h1>
            {{ $tr('editUserDetailsHeader') }}
          </h1>

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

          <section
            v-if="showPicturePasswordSection"
            class="picture-password-section"
            data-testid="picture-password-section"
          >
            <h3>
              {{ picturePassword$() }}
            </h3>
            <UserPicturePassword :picturePassword="userPicturePassword" />
          </section>

          <template v-if="editingSuperAdmin">
            <h2 class="header user-type">
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
              :class="{ select: true, 'learner-role-disabled': disableLearnerRoleOption }"
              :disabled="formDisabled"
              :label="coreString('userTypeLabel')"
              :options="userTypeOptions"
              data-testid="user-type"
            />
            <div
              v-if="disableLearnerRoleOption"
              class="learner-limit-message"
              data-testid="learner-limit-message"
            >
              <KIcon
                class="icon"
                icon="warningIncomplete"
              />
              <p :style="{ color: $themeTokens.annotation }">
                {{ learnerCreationDisabled$() }}
                <KButton
                  appearance="basic-link"
                  :text="coreString('learnMoreAction')"
                  data-testid="learner-limit-modal-trigger"
                  @click="isLearnerLimitModalOpen = true"
                />
              </p>
            </div>

            <fieldset
              v-if="coachIsSelected"
              class="coach-selector"
            >
              <KRadioButtonGroup>
                <KRadioButton
                  v-model="classCoachIsSelected"
                  :disabled="formDisabled"
                  :label="coreString('classCoachLabel')"
                  :description="coreString('classCoachDescription')"
                  :buttonValue="true"
                />
                <KRadioButton
                  v-model="classCoachIsSelected"
                  :disabled="formDisabled"
                  :label="coreString('facilityCoachLabel')"
                  :description="coreString('facilityCoachDescription')"
                  :buttonValue="false"
                />
              </KRadioButtonGroup>
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

          <ExtraDemographics
            v-model="extraDemographics"
            :facilityDatasetExtraFields="facilityConfig.extra_fields"
            :disabled="formDisabled"
          />
        </section>

        <p v-if="willBeLoggedOut">
          {{ $tr('forceLogoutWarning') }}
        </p>
        <div class="buttons">
          <KButtonGroup style="margin-top: 8px">
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
          </KButtonGroup>
        </div>
      </form>
      <LearnerLimitReachedModal
        v-if="isLearnerLimitModalOpen"
        data-testid="learner-limit-modal"
        @close="isLearnerLimitModalOpen = false"
      />
    </KPageContainer>
  </ImmersivePage>

</template>


<script>

  import every from 'lodash/every';
  import pickBy from 'lodash/pickBy';
  import UserType from 'kolibri-common/utils/userType';
  import FacilityUserResource from 'kolibri-common/apiResources/FacilityUserResource';
  import { mapState } from 'vuex';
  import urls from 'kolibri/urls';
  import { UserKinds, ERROR_CONSTANTS } from 'kolibri/constants';
  import CatchErrors from 'kolibri/utils/CatchErrors';
  import UserTypeDisplay from 'kolibri-common/components/UserTypeDisplay';
  import GenderSelect from 'kolibri-common/components/userAccounts/GenderSelect';
  import BirthYearSelect from 'kolibri-common/components/userAccounts/BirthYearSelect';
  import ImmersivePage from 'kolibri/components/pages/ImmersivePage';
  import FullNameTextbox from 'kolibri-common/components/userAccounts/FullNameTextbox';
  import UsernameTextbox from 'kolibri-common/components/userAccounts/UsernameTextbox';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import ExtraDemographics from 'kolibri-common/components/ExtraDemographics';
  import useUser from 'kolibri/composables/useUser';
  import useSnackbar from 'kolibri/composables/useSnackbar';
  import { handleApiError } from 'kolibri/utils/appError';
  import useFacility from 'kolibri-common/composables/useFacility';
  import { picturePasswordStrings } from 'kolibri-common/strings/picturePasswords';
  import UserPicturePassword from 'kolibri-common/components/UserPicturePassword.vue';
  import IdentifierTextbox from './users/sidePanels/UserCreate/IdentifierTextbox.vue';
  import LearnerLimitReachedModal from './LearnerLimitReachedModal.vue';

  export default {
    name: 'UserEditPage',
    metaInfo() {
      return {
        title: this.$tr('editUserDetailsHeader'),
      };
    },
    components: {
      BirthYearSelect,
      ImmersivePage,
      FullNameTextbox,
      GenderSelect,
      IdentifierTextbox,
      UsernameTextbox,
      UserTypeDisplay,
      ExtraDemographics,
      LearnerLimitReachedModal,
      UserPicturePassword,
    },
    mixins: [commonCoreStrings],
    setup() {
      const { createSnackbar } = useSnackbar();
      const { currentUserId, logout } = useUser();
      const { updateFacilityConfig, selectedFacility, facilityConfig } = useFacility();
      const { picturePassword$, learnerCreationDisabled$ } = picturePasswordStrings;

      return {
        // state
        currentUserId,
        facilityConfig,
        selectedFacility,
        // actions
        logout,
        createSnackbar,
        updateFacilityConfig,
        handleApiError,
        // strings
        learnerCreationDisabled$,
        picturePassword$,
      };
    },
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
        extraDemographics: null,
        userCopy: {},
        caughtErrors: [],
        status: '',
        userPicturePassword: null,
        isLearnerLimitModalOpen: false,
      };
    },
    computed: {
      ...mapState('userManagement', ['facilityUsers']),
      formDisabled() {
        return this.status === 'BUSY';
      },
      cancelButtonText() {
        return this.coreString('cancelAction');
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
            disabled: this.disableLearnerRoleOption,
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
      picturePasswordEnabled() {
        return Boolean(this.facilityConfig.picture_password_settings);
      },
      disableLearnerRoleOption() {
        return (
          this.picturePasswordEnabled &&
          this.selectedFacility.picture_passwords_exhausted &&
          this.kind !== UserKinds.LEARNER
        );
      },
      showPicturePasswordSection() {
        return (
          this.picturePasswordEnabled &&
          this.kind === UserKinds.LEARNER &&
          Boolean(this.userPicturePassword)
        );
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
    created() {
      const facilityConfigPromise = this.updateFacilityConfig();
      const facilityUserPromise = FacilityUserResource.fetchModel({
        id: this.$route.params.id,
      }).then(user => {
        this.username = user.username;
        this.fullName = user.full_name;
        this.idNumber = user.id_number;
        this.gender = user.gender;
        this.birthYear = user.birth_year;
        this.extraDemographics = user.extra_demographics;
        this.userPicturePassword = user.picture_password;
        this.setKind(user);
        this.makeCopyOfUser(user);
      });
      Promise.all([facilityConfigPromise, facilityUserPromise])
        .then(() => {
          this.loading = false;
        })
        .catch(error => {
          this.handleApiError({ error, reloadOnReconnect: true });
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
          extra_demographics: this.extraDemographics,
          username: this.username,
          kind: UserType(user),
        };
      },
      goToUserManagementPage() {
        this.$router.push(this.$store.getters.facilityPageLinks.UserPage);
      },
      usernameIsUnique(value) {
        const match = this.facilityUsers.find(
          ({ username }) => username.toLowerCase() === value.toLowerCase(),
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
            extra_demographics: this.extraDemographics,
            username: this.username,
          },
          (value, key) => {
            return value !== this.userCopy[key];
          },
        );

        // Roles are update via a different API than FacilityUsers, so pass
        // their update separately
        if (!this.editingSuperAdmin && this.newUserKind !== this.userCopy.kind) {
          roleUpdates = {
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

        if (this.disableLearnerRoleOption && this.newUserKind === UserKinds.LEARNER) {
          this.isLearnerLimitModalOpen = true;
          return;
        }

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
        // newUserKind is falsey if Super Admin, since that's not a facility role
        if (this.willBeLoggedOut) {
          // Log out of Facility Page if and Admin demotes themselves to non-Admin
          this.logout();
        } else {
          this.createSnackbar(this.coreString('changesSavedNotification'));
          this.goToUserManagementPage();
        }
      },
      handleSubmitFailure(error) {
        this.status = 'FAILURE';
        this.caughtErrors = CatchErrors(error, [ERROR_CONSTANTS.USERNAME_ALREADY_EXISTS]);
        if (this.caughtErrors.length > 0) {
          this.focusOnInvalidField();
        } else {
          this.handleApiError({ error });
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
      editUserDetailsHeader: {
        message: 'Edit user details',
        context: 'Refers to edit existing users option.',
      },
      changeInDeviceTabPrompt: {
        message: 'Go to Device permissions to change this',
        context: 'Refers to admin permissions.',
      },
      viewInDeviceTabPrompt: {
        message: 'View details in Device permissions',
        context: 'Reminder for the admin that they can review permissions in the Device page.',
      },
      forceLogoutWarning: {
        message:
          'Warning: By making yourself a non-admin, you will be logged out after clicking "Save".',
        context:
          'Warning provoked if a user with admin permissions changes their user type to become a non-admin. This avoids dangerous deletions.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .coach-selector {
    padding: 0;
    margin: 0 0 10px;
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

  .learner-role-disabled {
    margin-bottom: 4px;
  }

  .learner-limit-message {
    display: flex;
    align-items: baseline;
    margin-bottom: 12px;

    .icon {
      flex-shrink: 0;
      margin-top: 2px;
      font-size: 14px;
    }

    p {
      margin: 0 0 0 4px;
      font-size: 14px;
    }
  }

  .picture-password-section {
    margin: 12px 0 24px;

    h3 {
      margin-bottom: 8px;
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
