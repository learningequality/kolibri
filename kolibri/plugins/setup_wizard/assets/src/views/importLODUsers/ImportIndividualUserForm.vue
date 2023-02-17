<template>

  <OnboardingStepBase
    :title="$tr('importIndividualUsersHeader')"
    :description="formDescription"
    :submitText="coreString('importAction')"
    :disabled="false"
    :finishButton="users.length !== 0"
    @continue="handleSubmit"
  >
    <KCircularLoader v-if="!facility" />

    <div v-else>
      <p class="facility-name">
        {{ formatNameAndId(facility.name, facility.id) }}
      </p>
      <p>{{ $tr('enterCredentials') }}</p>
      <p v-if="error && !useAdmin" :style="{ color: $themeTokens.error }">
        {{ coreString('invalidCredentialsError') }}
      </p>
      <KTextbox
        ref="usernameTextbox"
        v-model.trim="username"
        :disabled="false"
        :label="coreString('usernameLabel')"
        :autofocus="$attrs.autofocus"
        @blur="blurred = true"
      />
      <PasswordTextbox
        v-if="!facility.learner_can_login_with_no_password"
        ref="passwordTextbox"
        :value.sync="password"
        :showConfirmationInput="false"
        autocomplete="new-password"
      />
      <p>
        {{ $tr('doNotHaveUserCredentials') }}
        <KButton
          :text=" $tr('useAdmin')"
          appearance="basic-link"
          @click="openAdminCredentialsForm"
        />
      </p>

      <KModal
        v-if="deviceLimitations"
        :title="$tr('deviceLimitationsTitle') "
        :cancelText="coreString('cancelAction')"
        @cancel="closeModal"
      >
        <p> {{ modalMessage }} </p>
      </KModal>

      <KModal
        v-if="useAdmin"
        :title="$tr('headerAdmin') "
        :cancelText="coreString('cancelAction')"
        :submitText="coreString('continueAction')"
        @cancel="closeModal"
        @submit="moveAdmin"
      >
        <p> {{ adminModalMessage }} </p>
        <p v-if="error && useAdmin" :style="{ color: $themeTokens.error }">
          {{ coreString('invalidCredentialsError') }}
        </p>
        <KTextbox
          ref="adminUsernameTextbox"
          v-model.trim="adminUsername"
          :disabled="false"
          :label="coreString('usernameLabel')"
          :autofocus="$attrs.autofocus"
          @blur="blurred = true"
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

  import PasswordTextbox from 'kolibri.coreVue.components.PasswordTextbox';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import commonSyncElements from 'kolibri.coreVue.mixins.commonSyncElements';
  import { DemographicConstants, ERROR_CONSTANTS } from 'kolibri.coreVue.vuex.constants';
  import { TaskResource } from 'kolibri.resources';
  import CatchErrors from 'kolibri.utils.CatchErrors';
  import OnboardingStepBase from '../OnboardingStepBase';
  import { FacilityImportResource } from '../../api';

  export default {
    name: 'ImportIndividualUserForm',
    components: {
      OnboardingStepBase,
      PasswordTextbox,
    },
    mixins: [commonSyncElements, commonCoreStrings],
    data() {
      return {
        username: '',
        password: '',
        full_name: '',
        roles: '',
        error: false,
        deviceLimitations: false,
        useAdmin: false,
        adminUsername: null,
        adminPassword: null,
        device: null,
        facilities: [],
        selectedFacilityId: 'selectedFacilityId',
      };
    },
    inject: ['wizardService'],
    computed: {
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
        return this.$tr('deviceLimitationsMessage', {
          full_name: this.full_name,
          username: this.username,
          roles: this.roles,
          device: this.device.name,
        });
      },
      adminModalMessage() {
        return this.$tr('enterAdminCredentials', { facility: this.facility.name });
      },
    },
    beforeMount() {
      this.fetchNetworkLocation(this.deviceId).then(() => {
        if (!this.facility) {
          this.$store.dispatch('showError', 'Failed to retrieve facilities.');
        }
      });
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
            this.selectedFacilityId = this.facilities[0].id;
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
        this.useAdmin = true;
        this.$nextTick(function() {
          this.$refs.adminUsernameTextbox.focus();
        });
      },
      handleSubmit() {
        const task_name = 'kolibri.core.auth.tasks.peeruserimport';
        const password = this.password === '' ? DemographicConstants.NOT_SPECIFIED : this.password;
        const params = {
          type: task_name,
          username: this.username,
          password: password,
          facility: this.facility.id,
          device_id: this.deviceId,
          using_admin: false,
        };
        TaskResource.startTask(params)
          .then(task => {
            task['device_id'] = this.deviceId;
            task['facility_name'] = this.facility.name;
            this.wizardService.send({
              type: 'CONTINUE',
            });
          })
          .catch(error => {
            const error_info = error.response.data;
            const errorsCaught = CatchErrors(error, [
              ERROR_CONSTANTS.INVALID_CREDENTIALS,
              ERROR_CONSTANTS.MISSING_PASSWORD,
              ERROR_CONSTANTS.PASSWORD_NOT_SPECIFIED,
              ERROR_CONSTANTS.AUTHENTICATION_FAILED,
            ]);
            if (errorsCaught) {
              this.error = true;
            } else if (error_info['id'] === ERROR_CONSTANTS.DEVICE_LIMITATIONS) {
              this.full_name = error_info['full_name'];
              this.roles = error_info['roles'];
              this.deviceLimitations = true;
            }
          });
      },
      moveAdmin() {
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
            ]);
            if (errorsCaught) {
              this.error = true;
            } else this.$store.dispatch('handleApiError', error);
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
        message: 'Enter the credentials of the user account you want to import',
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
          '’{full_name} ({username})’ is a {roles} on ‘{device}’. This device is limited to features for learners only. Features for coaches and admins will not be available.',

        context:
          "Appears on 'Device limitations' window which informs that only learner features will be available on the device.",
      },
      /* eslint-disable kolibri/vue-no-unused-translations */
      deviceLimitationsAdminsMessage: {
        message:
          '’{full_name} ({username})’ is an admin on ‘{device}’. This device is limited to features for learners only. Features for coaches and admins will not be available.',
      },
      /* eslint-enable */
      headerAdmin: {
        message: 'Use an admin account',
        context: 'Modal form to introduce admin account credentials.',
      },
      doNotHaveUserCredentials: {
        message: 'Don’t have user’s credentials?',
        context: "'Credentials' refers to learner's username and password.",
      },
      useAdmin: {
        message: 'Use an admin account',
        context: 'Modal form to introduce admin account credentials.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .facility-name {
    font-weight: bold;
  }

</style>
