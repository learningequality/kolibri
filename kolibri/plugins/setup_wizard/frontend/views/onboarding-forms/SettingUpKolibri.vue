<template>

  <div class="full-page">
    <AppError
      v-if="coreError"
      :hideParagraphs="true"
    >
      <template #buttons>
        <KButton
          :text="coreString('startOverAction')"
          @click="startOver"
        />
        <KButton
          :primary="true"
          :text="coreString('retryAction')"
          @click="startProvisionDeviceTask"
        />
      </template>
    </AppError>
    <main
      v-else
      class="content"
    >
      <KolibriLoadingSnippet />
      <h1 class="page-title">
        {{ $tr('pageTitle') }}
      </h1>
      <p class="message">
        {{ $tr('pleaseWaitMessage') }}
      </p>
    </main>
  </div>

</template>


<script>

  import omitBy from 'lodash/omitBy';
  import get from 'lodash/get';
  import useUser from 'kolibri/composables/useUser';
  import AppError from 'kolibri/components/error/AppError';
  import { currentLanguage } from 'kolibri/utils/i18n';
  import { checkCapability } from 'kolibri/utils/appCapabilities';
  import { TaskStatuses, TaskTypes } from 'kolibri-common/utils/syncTaskUtils';
  import redirectBrowser from 'kolibri/utils/redirectBrowser';
  import TaskResource from 'kolibri/apiResources/TaskResource';
  import KolibriLoadingSnippet from 'kolibri-common/components/KolibriLoadingSnippet';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import { Presets } from 'kolibri/constants';
  import Lockr from 'lockr';
  import { DeviceTypePresets } from '../../constants';

  const PROVISION_TASK_QUEUE = 'device_provision';

  export default {
    name: 'SettingUpKolibri',
    components: { AppError, KolibriLoadingSnippet },
    inject: ['wizardService'],
    mixins: [commonCoreStrings],
    setup() {
      const { login } = useUser();
      return { login };
    },
    computed: {
      coreError() {
        if (this.$store) {
          return this.$store.state.core.error;
        } else {
          return null;
        }
      },
      facilityData() {
        const usersName = get(this.wizardContext('superuser'), 'full_name', '');
        const facilityName =
          this.wizardContext('facilityName') ||
          // full names may be up to 120 chars, but facility names can only be 100 chars
          this.$tr('onMyOwnFacilityName', { name: usersName }).slice(0, 100);
        const selectedFacility = this.wizardContext('selectedFacility');
        if (selectedFacility) {
          if (selectedFacility.id) {
            // Imported a facility already otherwise we wouldn't have an ID yet,
            // so we'll just be sending off the `facility_id`
            return { facility_id: selectedFacility.id };
          } else {
            // Otherwise we'll pass the facility data we have (including settings set by user)
            return { facility: selectedFacility };
          }
        } else {
          return { facility: { name: facilityName } };
        }
      },
      learnerCanLoginWithNoPassword() {
        // The user answers the question "Enable passwords?" -- so the `requirePassword` value
        // is the boolean opposite of whatever the value we need to assign to
        // `learner_can_login_with_no_password` in the API call.
        // If there is already a facility imported, we will use its value
        // If it is `null`, then it was never set by the user and we set to require passwords
        const { facility, facility_id } = this.facilityData;
        // If we have a facility_id then we imported the facility
        if (facility_id) {
          return null;
        }
        const facilitySetting = get(facility, 'learner_can_login_with_no_password', null);
        if (facilitySetting !== null) {
          return facilitySetting;
        } else {
          return this.wizardContext('requirePassword') === null
            ? true
            : !this.wizardContext('requirePassword');
        }
      },
      userBasedOnOs() {
        // On my own setup with OS user means that the user will be created
        // at login time, based on the OS user.
        return this.isOnMyOwnSetup && checkCapability('get_os_user');
      },
      learnerCanEditPassword() {
        // Note that we don't ask this question of a user during onboarding -- however,
        // the nonformal facility will set this to `true` by default -- which does not jive
        // with the possibility that a user can login with no password
        if (
          // Learner cannot edit a password they cannot set
          this.learnerCanLoginWithNoPassword ||
          // OS on my own users don't use password to sign in
          this.userBasedOnOs
        ) {
          return false; // Learner cannot edit a password they cannot set
        } else {
          return null; // We'll set this to a key and null values are removed from the API call
        }
      },
      /** The data we will use to initialize the device during provisioning */
      deviceProvisioningData() {
        let superuser = null;
        // We need the superuser information unless the superuser will be created at login,
        // based on the os user - this is only the case for on my own setup.
        if (!this.userBasedOnOs) {
          // Here we see if we've set a firstImportedLodUser -- if they exist, they must be the
          // superuser as they were the first imported user.
          if (this.wizardContext('firstImportedLodUser')) {
            superuser = this.wizardContext('firstImportedLodUser');
          }
          if (!superuser) {
            // If we are creating a user, their data is in the Vuex store because UserCredentials is
            // tightly coupled to it (for now).
            superuser = this.wizardContext('superuser') || this.$store.state.onboardingData.user;
          }
        }

        const settings = {
          learner_can_login_with_no_password: this.learnerCanLoginWithNoPassword,
          learner_can_edit_password: this.learnerCanEditPassword,
          on_my_own_setup: this.isOnMyOwnSetup,
          learner_can_sign_up: this.wizardContext('learnerCanCreateAccount'),
        };

        const payload = {
          ...this.facilityData,
          superuser,
          settings: omitBy(settings, v => v === null),
          preset: this.presetValue,
          language_id: currentLanguage,
          device_name:
            this.wizardContext('deviceName') ||
            // full names may be up to 120 chars, but device names can only be 50 chars
            this.$tr('onMyOwnDeviceName', { name: get(superuser, 'full_name', '') }).slice(0, 50),
          allow_guest_access: Boolean(this.wizardContext('guestAccess')),
          is_provisioned: true,
          is_soud: this.wizardContext('fullOrLOD') === DeviceTypePresets.LOD,
        };

        // Remove anything that is `null` value
        return omitBy(payload, v => v === null);
      },

      /** Introspecting the machine via it's `state.context` properties */
      isOnMyOwnSetup() {
        return this.wizardContext('onMyOwnOrGroup') == Presets.PERSONAL;
      },
      presetValue() {
        // this computed prop was to guard against a strange edge case where a mismatched
        // preset was inadvertently being sent to the backend, where the values
        // were not valid, including an incorrect fallback, and 'on my own' being sent as a value
        if (this.isOnMyOwnSetup) {
          return Presets.PERSONAL;
        } else {
          return this.wizardContext('formalOrNonformal');
        }
      },
    },
    created() {
      this.startProvisionDeviceTask();
    },
    methods: {
      startOver() {
        this.$store.dispatch('clearError');
        this.wizardService.send('START_OVER');
      },
      // A helper for readability
      wizardContext(key) {
        return this.wizardService.state.context[key];
      },
      async startProvisionDeviceTask() {
        try {
          await TaskResource.startTask({
            type: TaskTypes.PROVISIONDEVICE,
            ...this.deviceProvisioningData,
          });
          this.pollProvisionTask();
        } catch (e) {
          this.$store.dispatch('handleApiError', { error: e });
        }
      },
      async pollProvisionTask() {
        try {
          const tasks = await TaskResource.list({ queue: PROVISION_TASK_QUEUE });
          const task = tasks[tasks.length - 1]; // Get the most recent task
          if (!task) {
            throw new Error('Device provisioning task not found');
          }
          if (task.status === TaskStatuses.COMPLETED) {
            const facilityId = task.extra_metadata.facility_id;

            // Taking the username from the task extra metadata in case the superuser was created
            // from the OS user.
            const username = task.extra_metadata.username;

            // Taking the auth token and superuser ID from the task extra metadata in case
            // the superuser was imported, and we don't have a password for them. In this case,
            // the auth token will allow us to log them in.
            const authToken = task.extra_metadata.auth_token;
            const superuserId = task.extra_metadata.superuser_id;

            this.clearPollingTasks();
            this.wrapOnboarding();
            if (this.deviceProvisioningData.superuser || this.userBasedOnOs) {
              const { password } = this.deviceProvisioningData.superuser || {};
              const error = await this.login({
                facilityId,
                username,
                password,
                auth_token: authToken,
                user_id: superuserId,
              });
              if (error) {
                // If we get an error logging in, just redirect to the sign-in page
                return redirectBrowser();
              }
              return;
            } else {
              return redirectBrowser();
            }
          } else if (task.status === TaskStatuses.FAILED) {
            this.clearPollingTasks();
            this.$store.dispatch('handleApiError', { error: task.traceback });
          } else {
            setTimeout(() => {
              this.pollProvisionTask();
            }, 1000);
          }
        } catch (e) {
          this.$store.dispatch('handleApiError', { error: e });
        }
      },
      wrapOnboarding() {
        const welcomeDismissalKey = 'DEVICE_WELCOME_MODAL_DISMISSED';
        const facilityImported = 'FACILITY_IS_IMPORTED';
        window.localStorage.setItem(welcomeDismissalKey, false);
        window.localStorage.setItem(facilityImported, this.wizardContext('isImportedFacility'));

        Lockr.rm('savedState'); // Clear out saved state machine
      },
      clearPollingTasks() {
        TaskResource.clearAll(PROVISION_TASK_QUEUE);
      },
    },
    $trs: {
      pageTitle: {
        message: 'Setting up Kolibri',
        context: 'The title of the page',
      },
      pleaseWaitMessage: {
        message: 'This may take several minutes',
        context: 'Kolibri is working in the background and the user may need to wait',
      },
      onMyOwnDeviceName: {
        message: 'Personal device for {name}',
        context:
          "The default device name for a user installing Kolibri using the personal 'on my own' (formerly Quick Start) flow",
      },
      onMyOwnFacilityName: {
        message: 'Home Facility for {name}',
        context:
          "Default facility name when Kolibri is installed with the 'Quick start' setup option for at home learning, outside any type of structure or institution like a school or a library. '{name}' will display the full name of the super admin user for their Kolibri server. Note that users can change this default name after the setup, and put whatever name they want to use for their home facility.",
      },
    },
  };

</script>


<style lang="scss" scoped>

  .alert {
    position: relative;
    top: 0;
    left: 0;
    margin: 16px;
    text-align: left;
  }

  .full-page {
    /* Fill the screen, no scroll bars */
    position: relative;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
  }

  .content {
    /* Vertically centered */
    position: relative;
    top: 50%;
    transform: translateY(-50%);
  }

  .page-title,
  .message {
    padding: 0 1em;
    text-align: center;
  }

  .page-title {
    font-size: 1.5em;
  }

</style>
