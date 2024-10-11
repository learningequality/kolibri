<template>

  <OnboardingStepBase
    :title="$tr('importIndividualUsersHeader')"
    :noBackAction="!noUsersImported"
    :footerMessageType="footerMessageType"
    :step="step"
    :steps="steps"
    :description="formDescription"
    :submitText="coreString('importAction')"
    :disabled="formSubmitted || wizardService.state.context.importedUsers.length > 0"
    :finishButton="users.length !== 0"
    @continue="handleSubmit"
  >
    <div v-if="noUsersImported">
      {{ getCommonSyncString('warningFirstImportedIsSuperuser') }}
    </div>

    <KCircularLoader v-if="!facility" />

    <div v-else>
      <p class="facility-name">
        {{ formatNameAndId(facility.name, facility.id) }}
      </p>
      <p>{{ $tr('enterCredentials') }}</p>
      <p
        v-if="error && !useAdmin"
        :style="{ color: $themeTokens.error }"
      >
        {{ coreString('invalidCredentialsError') }}
      </p>
      <KTextbox
        ref="usernameTextbox"
        v-model.trim="username"
        :disabled="formSubmitted"
        :label="coreString('usernameLabel')"
        :autofocus="$attrs.autofocus"
        :invalid="Boolean(invalidText)"
        :invalidText="invalidText"
        @blur="shouldValidate = true"
      />
      <PasswordTextbox
        v-if="!facility.learner_can_login_with_no_password"
        ref="passwordTextbox"
        :disabled="formSubmitted"
        :value.sync="password"
        :showConfirmationInput="false"
        autocomplete="new-password"
      />
      <p>
        {{ $tr('doNotHaveUserCredentials') }}
        <KButton
          :text="profileString('useAdminAccount')"
          appearance="basic-link"
          @click="openAdminCredentialsForm"
        />
      </p>

      <KModal
        v-if="deviceLimitations"
        :title="$tr('deviceLimitationsTitle')"
        :cancelText="coreString('cancelAction')"
        :submitText="coreString('importAction')"
        @cancel="closeModal"
        @submit="importUser"
      >
        <p>{{ modalMessage }}</p>
      </KModal>

      <KModal
        v-if="useAdmin"
        :title="profileString('useAdminAccount')"
        :cancelText="coreString('cancelAction')"
        :submitText="coreString('continueAction')"
        @cancel="closeModal"
        @submit="moveAdmin"
      >
        <p>{{ adminModalMessage }}</p>
        <p
          v-if="error && useAdmin"
          :style="{ color: $themeTokens.error }"
        >
          {{ coreString('invalidCredentialsError') }}
        </p>
        <KTextbox
          ref="adminUsernameTextbox"
          v-model.trim="adminUsername"
          :label="coreString('usernameLabel')"
          :autofocus="$attrs.autofocus"
          :invalid="Boolean(invalidText)"
          :invalidText="invalidText"
          @blur="shouldValidate = true"
        />
        <PasswordTextbox
          ref="adminPasswordTextbox"
          :value.sync="adminPassword"
          :showConfirmationInput="false"
          autocomplete="new-password"
        />
      </KModal>
    </div>
  </OnboardingStepBase>

</template>


<script>

  import get from 'lodash/get';
  import { currentLanguage } from 'kolibri/utils/i18n';
  import PasswordTextbox from 'kolibri-common/components/userAccounts/PasswordTextbox';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import commonSyncElements from 'kolibri-common/mixins/commonSyncElements';
  import { DemographicConstants, ERROR_CONSTANTS } from 'kolibri/constants';
  import TaskResource from 'kolibri/apiResources/TaskResource';
  import CatchErrors from 'kolibri/utils/CatchErrors';
  import { FacilityImportResource } from '../api';
  import { FooterMessageTypes } from '../constants';
  import commonProfileStrings from '../../../../user_profile/assets/src/views/commonProfileStrings';
  import OnboardingStepBase from './OnboardingStepBase';

  export default {
    name: 'ImportIndividualUserForm',
    components: {
      OnboardingStepBase,
      PasswordTextbox,
    },
    mixins: [commonSyncElements, commonCoreStrings, commonProfileStrings],
    data() {
      const footerMessageType = FooterMessageTypes.IMPORT_INDIVIDUALS;
      return {
        footerMessageType,
        username: '',
        password: '',
        full_name: '',
        roles: '',
        error: false,
        deviceLimitations: false,
        useAdmin: false,
        forceNonLearnerImport: false,
        adminUsername: null,
        adminPassword: null,
        device: null,
        facilities: [],
        selectedFacilityId: 'selectedFacilityId',
        formSubmitted: false,
        shouldValidate: false,
      };
    },
    inject: ['wizardService'],
    computed: {
      noUsersImported() {
        // User can only go back from here if they've not yet imported any users, otherwise
        // they've gone beyond the point of no return.
        return this.wizardService.state.context.importedUsers.length == 0;
      },
      // If there is only one facility we skipped a step, so we're on step 1
      step() {
        return this.wizardService.state.context.facilitiesOnDeviceCount == 1 ? 1 : 2;
      },
      // If there is only one facility we skipped a step, so we only have 4 steps
      steps() {
        return this.wizardService.state.context.facilitiesOnDeviceCount == 1 ? 2 : 3;
      },
      deviceId() {
        return this.wizardService.state.context.importDeviceId;
      },
      facility() {
        return this.facilities.find(f => f.id === this.selectedFacilityId);
      },
      users() {
        return this.wizardService.state.context.importedUsers || [];
      },
      formDescription() {
        if (this.device && this.device.name) {
          return this.$tr('commaSeparatedPair', {
            first: this.formatNameAndId(this.device.name, this.deviceId),
            second: this.device.baseurl,
          });
        }
        return '';
      },
      modalMessage() {
        const importedUserIsAdmin = this.roles && this.roles.includes('admin');

        const messageArgs = {
          full_name: this.full_name,
          username: this.username,
          non_admin_role:
            !importedUserIsAdmin &&
            this.coreString('coachLabel').toLocaleLowerCase(currentLanguage),
          device: this.device.name,
        };

        if (importedUserIsAdmin) {
          return this.$tr('deviceLimitationsAdminsMessage', messageArgs);
        } else {
          return this.$tr('deviceLimitationsMessage', messageArgs);
        }
      },
      adminModalMessage() {
        return this.$tr('enterAdminCredentials', { facility: this.facility.name });
      },
      invalidText() {
        if (!this.shouldValidate) {
          return '';
        }
        if (
          !this.useAdmin & (this.username.trim() === '') ||
          this.useAdmin & (this.adminUsername === null || this.adminUsername.trim() === '')
        ) {
          return this.coreString('requiredFieldError');
        }
        return '';
      },
    },
    beforeMount() {
      this.fetchNetworkLocation(this.deviceId).then(() => {
        if (!this.facility) {
          this.$store.dispatch('showError', 'Failed to retrieve facilities.');
        }
      });
    },
    mounted() {
      this.selectedFacilityId = this.wizardService.state.context.selectedFacility.id;
    },
    methods: {
      fetchNetworkLocation(deviceId) {
        this.loadingNewAddress = true;
        return this.fetchNetworkLocationFacilities(deviceId)
          .then(data => {
            this.facilities = [...data.facilities];
            this.device = {
              name: data.device_name,
              id: data.device_id,
              baseurl: data.device_address,
            };
            this.loadingNewAddress = false;
          })
          .catch(error => {
            // TODO handle disconnected peers error more gracefully
            this.$store.dispatch('showError', error);
          });
      },
      closeModal() {
        this.deviceLimitations = false;
        this.useAdmin = false;
      },
      openAdminCredentialsForm() {
        // clean error from non-admin form:
        this.shouldValidate = false;
        this.error = false;

        this.useAdmin = true;
        this.$nextTick(function () {
          this.$refs.adminUsernameTextbox.focus();
        });
      },
      handleSubmit() {
        if (this.wizardService.state.context.importedUsers.length === 0) {
          this.shouldValidate = true;
          if (this.invalidText) {
            this.$refs.usernameTextbox.focus();
            return;
          }
        }
        this.formSubmitted = true;
        const task_name = 'kolibri.core.auth.tasks.peeruserimport';
        const password = this.password === '' ? DemographicConstants.NOT_SPECIFIED : this.password;
        const params = {
          type: task_name,
          username: this.username,
          password: password,
          facility: this.facility.id,
          facility_name: this.facility.name,
          device_id: this.deviceId,
          using_admin: false,
          force_non_learner_import: this.forceNonLearnerImport,
        };

        if (!params.username && params.password === DemographicConstants.NOT_SPECIFIED) {
          this.formSubmitted = false;
          // Here, the user has already imported a user so does not need to enter anything
          // in the form in order to continue
          if (this.wizardService.state.context.importedUsers.length > 0) {
            return this.wizardService.send('FINISH');
          }
        }

        TaskResource.startTask(params)
          .then(task => {
            let user = {};
            if (!this.users.length) {
              // If this is the first imported Learn Only Device user, it will be the superuser
              // we create upon provisioning so we'll set them as the superuser
              user = { username: params.username, password: params.password };
            }
            task['device_id'] = this.deviceId;
            task['facility_name'] = this.facility.name;

            if (!this.wizardService.state.context.firstImportedLodUser) {
              this.wizardService.send({
                type: 'SET_FIRST_LOD',
                value: { username: task.extra_metadata.username, password },
              });
            }

            this.wizardService.send({
              type: 'CONTINUE',
              value: { ...task, ...user },
            });
          })
          .catch(error => {
            this.formSubmitted = false;
            const errorsCaught = CatchErrors(error, [
              ERROR_CONSTANTS.INVALID_CREDENTIALS,
              ERROR_CONSTANTS.MISSING_PASSWORD,
              ERROR_CONSTANTS.PASSWORD_NOT_SPECIFIED,
              ERROR_CONSTANTS.AUTHENTICATION_FAILED,
              ERROR_CONSTANTS.INVALID_USERNAME,
            ]);

            const errorData = error.response.data;

            if (errorsCaught) {
              this.error = true;
            } else if (
              Array.isArray(errorData) &&
              errorData.find(
                e => get(e, 'metadata.message', null) === ERROR_CONSTANTS.DEVICE_LIMITATIONS,
              )
            ) {
              const error_info = errorData.reduce((info, err) => {
                const { field, message } = err.metadata;
                info[field] = message;
                return info;
              }, {});
              this.full_name = error_info['full_name'];
              this.roles = error_info['roles'];
              this.deviceLimitations = true;
            }
          });
      },
      importUser() {
        this.forceNonLearnerImport = true;
        this.error = false;
        this.handleSubmit();
      },
      moveAdmin() {
        this.shouldValidate = true;
        if (this.invalidText) {
          this.$refs.adminUsernameTextbox.focus();
          return;
        }
        const params = {
          baseurl: this.device.baseurl,
          username: this.adminUsername,
          password: this.adminPassword,
          facility_id: this.facility.id,
        };
        FacilityImportResource.listfacilitylearners(params)
          .then(data => {
            this.wizardService.send({
              type: 'CONTINUEADMIN',
              value: {
                adminUsername: this.adminUsername,
                adminPassword: this.adminPassword,
                adminId: data.admin.id,
                users: data.students,
              },
            });
          })
          .catch(error => {
            const errorsCaught = CatchErrors(error, [
              ERROR_CONSTANTS.INVALID_CREDENTIALS,
              ERROR_CONSTANTS.AUTHENTICATION_FAILED,
              ERROR_CONSTANTS.PERMISSION_DENIED,
              ERROR_CONSTANTS.MISSING_PASSWORD,
              ERROR_CONSTANTS.PASSWORD_NOT_SPECIFIED,
              ERROR_CONSTANTS.INVALID_USERNAME,
            ]);
            if (errorsCaught) {
              this.error = true;
            } else this.$store.dispatch('handleApiError', { error });
          });
      },
    },
    $trs: {
      commaSeparatedPair: {
        message: '{first}, {second}',
        context: 'DO NOT TRANSLATE\nCopy the source string.',
      },
      importIndividualUsersHeader: {
        message: 'Import individual user accounts',
        context: "The title of the 'Import individual user accounts' step in the wizard setup",
      },
      enterCredentials: {
        message: 'Enter the user credentials of the account you want to import.',
        context: 'Asking user and password of the user to be imported.',
      },
      enterAdminCredentials: {
        message:
          "Enter the username and password of a facility admin or a super admin of '{facility}'",
        context: 'Asking user and password of the  admin user of the facility to be imported',
      },
      deviceLimitationsTitle: {
        message: 'Device limitations',
        context:
          'Heading for the window which informs that only learner features will be available on the device. ',
      },
      deviceLimitationsMessage: {
        message:
          "'{full_name} ({username})' is a {non_admin_role} on '{device}'. This device is limited to features for learners only. Features for coaches and admins will not be available.",

        context:
          "Appears on 'Device limitations' window which informs that only learner features will be available on the device.",
      },
      /* eslint-disable kolibri/vue-no-unused-translations */
      deviceLimitationsAdminsMessage: {
        message:
          "'{full_name} ({username})' is an admin on '{device}'. This device is limited to features for learners only. Features for coaches and admins will not be available.",
      },
      /* eslint-enable */
      doNotHaveUserCredentials: {
        message: "Don't have the user credentials?",
        context: "'Credentials' refers to learner's username and password.",
      },
    },
  };

</script>


<style lang="scss" scoped>

  .facility-name {
    font-weight: bold;
  }

</style>
