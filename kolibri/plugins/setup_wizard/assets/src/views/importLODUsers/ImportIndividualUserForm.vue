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
    <UsernameTextbox
      ref="usernameTextbox"
      :value.sync="username"
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
  </OnboardingForm>

</template>


<script>

  import UsernameTextbox from 'kolibri.coreVue.components.UsernameTextbox';
  import PasswordTextbox from 'kolibri.coreVue.components.PasswordTextbox';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import commonSyncElements from 'kolibri.coreVue.mixins.commonSyncElements';
  import { TaskResource } from 'kolibri.resources';
  import { ERROR_CONSTANTS } from 'kolibri.coreVue.vuex.constants';
  import CatchErrors from 'kolibri.utils.CatchErrors';
  import OnboardingForm from '../onboarding-forms/OnboardingForm';

  export default {
    name: 'ImportIndividualUserForm',
    components: {
      OnboardingForm,
      UsernameTextbox,
      PasswordTextbox,
    },
    mixins: [commonSyncElements, commonCoreStrings],
    data() {
      return {
        username: '',
        password: '',
        error: false,
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
    },
    methods: {
      handleSubmit() {
        const params = {
          baseurl: this.device.baseurl,
          username: this.username,
          password: this.password,
          facility_id: this.facility.id,
          device_name: this.$store.state.onboardingData.device_name,
        };
        TaskResource.startprovisionsoud(params)
          .then(task => {
            this.lodService.send({
              type: 'CONTINUE',
              value: { username: this.username, password: this.password, id: task.data.user },
            });
          })
          .catch(error => {
            const errorsCaught = CatchErrors(error, [
              ERROR_CONSTANTS.INVALID_CREDENTIALS,
              ERROR_CONSTANTS.MISSING_PASSWORD,
              ERROR_CONSTANTS.PASSWORD_NOT_SPECIFIED,
              ERROR_CONSTANTS.AUTHENTICATION_FAILED,
            ]);
            if (errorsCaught) {
              this.error = true;
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
        message: 'Import individual users accounts',
        context: "The title of the 'Import individual user accounts' step in the wizard setup",
      },
      enterCredentials: {
        message: 'Enter the credentials of the user account you want to import',
        context: 'Asking user and password of the user to be improted',
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
