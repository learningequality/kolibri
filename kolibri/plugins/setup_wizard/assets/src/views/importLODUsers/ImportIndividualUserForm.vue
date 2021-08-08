<template>

  <OnboardingForm
    :header="$tr('importIndividualUsersHeader')"
    :description="formDescription"
    :submitText="$tr('import')"
    :disabled="username === ''"
    @submit="handleSubmit"
  >
    <p class="facility-name">
      {{ formatNameAndId(facility.name, facility.id) }}
    </p>
    <p>{{ $tr('enterCredentials') }}</p>
    <p v-if="error" class="error">
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
        @click="moveAdmin"
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

  </OnboardingForm>

</template>


<script>

  import PasswordTextbox from 'kolibri.coreVue.components.PasswordTextbox';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import commonSyncElements from 'kolibri.coreVue.mixins.commonSyncElements';
  import { ERROR_CONSTANTS } from 'kolibri.coreVue.vuex.constants';
  import CatchErrors from 'kolibri.utils.CatchErrors';
  import OnboardingForm from '../onboarding-forms/OnboardingForm';
  import { SetupSoUDTasksResource } from '../../api';

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
    },
    methods: {
      closeModal() {
        this.deviceLimitations = false;
      },
      handleSubmit() {
        const task_name = 'kolibri.plugins.setup_wizard.tasks.startprovisionsoud';
        const params = {
          baseurl: this.device.baseurl,
          username: this.username,
          password: this.password,
          facility_id: this.facility.id,
          device_name: this.device.name,
        };
        SetupSoUDTasksResource.createTask(task_name, params)
          .then(task => {
            this.lodService.send({
              type: 'CONTINUE',
              value: {
                username: this.username,
                password: this.password,
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
        this.lodService.send({ type: 'CONTINUEADMIN' });
      },
    },
    $trs: {
      commaSeparatedPair: '{first}, {second}',
      importIndividualUsersHeader: {
        message: 'Import individual user accounts',
        context: "The title of the 'Import individual user accounts' step in the wizard setup",
      },
      enterCredentials: {
        message: 'Enter the credentials of the user account you want to import',
        context: 'Asking user and password of the user to be improted',
      },
      deviceLimitationsTitle: 'Device limitations',
      deviceLimitationsMessage: {
        message:
          '’{full_name} ({username})’ is a {roles} on ‘{device}’. This device is limited to features for learners only. Features for coaches and admins will not be available.',
        context: 'Message to warn only learners can do individual sync',
      },
      doNotHaveUserCredentials: 'Don’t have user’s credentials?',
      useAdmin: 'Use an admin account',
      import: 'Import',
    },
  };

</script>


<style lang="scss" scoped>

  .facility-name {
    font-weight: bold;
  }

  .error {
    color: red;
  }

</style>
