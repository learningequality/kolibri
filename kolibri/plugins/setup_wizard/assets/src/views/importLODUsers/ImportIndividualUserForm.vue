<template>

  <OnboardingForm
    :header="$tr('importIndividualUsersHeader')"
    :description="formDescription"
    :submitText="coreString('importAction')"
    :disabled="checkFormDisabled"
    :finishButton="users.length !== 0"
    @submit="handleSubmit"
    @click_finish="redirectToChannels"
  >
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

  </OnboardingForm>

</template>


<script>

  import PasswordTextbox from 'kolibri.coreVue.components.PasswordTextbox';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import commonSyncElements from 'kolibri.coreVue.mixins.commonSyncElements';
  import { DemographicConstants, ERROR_CONSTANTS } from 'kolibri.coreVue.vuex.constants';
  import CatchErrors from 'kolibri.utils.CatchErrors';
  import OnboardingForm from '../onboarding-forms/OnboardingForm';
  import {
    FacilityImportResource,
    FinishSoUDSyncingResource,
    SetupSoUDTasksResource,
  } from '../../api';

  export default {
    name: 'ImportIndividualUserForm',
    components: {
      OnboardingForm,
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
      };
    },
    inject: ['lodService', 'state'],
    computed: {
      device() {
        return this.state.value.device;
      },
      facility() {
        return this.state.value.facility;
      },
      users() {
        return this.state.value.users;
      },
      checkFormDisabled() {
        return (
          this.username === '' ||
          this.state.value.users.find(f => f.username === this.username) !== undefined
        );
      },
      formDescription() {
        if (this.device.name) {
          return this.$tr('commaSeparatedPair', {
            first: this.formatNameAndId(this.device.name, this.device.id),
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
    methods: {
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
        const task_name = 'kolibri.plugins.setup_wizard.tasks.startprovisionsoud';
        const password = this.password === '' ? DemographicConstants.NOT_SPECIFIED : this.password;
        const params = {
          baseurl: this.device.baseurl,
          username: this.username,
          password: password,
          facility_id: this.facility.id,
          device_name: this.device.name,
        };
        SetupSoUDTasksResource.createTask(task_name, params)
          .then(task => {
            task['device_id'] = this.device.id;
            task['facility_name'] = this.facility.name;
            this.lodService.send({
              type: 'CONTINUE',
              value: {
                username: this.username,
                password: password,
                full_name: task.full_name,
                task: task,
              },
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
            this.lodService.send({
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
      redirectToChannels() {
        FinishSoUDSyncingResource.finish();
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
