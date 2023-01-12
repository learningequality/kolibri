<template>

  <div class="full-page">
    <main class="content">
      <KolibriLoadingSnippet />
      <h1 class="page-title">
        {{ $tr('pageTitle') }}
      </h1>
      <p class="message">
        {{ $tr('pleaseWaitMessage') }}
      </p>
    </main>
    <div
      v-if="devMode"
      style="
        z-index: 9999;
        position: fixed;
        left: 1em;
        right: 1em;
        bottom: 1em;
        top: 1em;
        background-color: rgba(0, 0, 0, 0.86);
        padding: 2em;
        color: white;
        font-weight: bold;
      "
    >
      <h2>Setup Wizard Debugger 3000</h2>
      <h3>Device Provisioning Data</h3>
      <pre>{{ JSON.stringify(deviceProvisioningData, null, 2) }}</pre>
      <h3>Facility User Data</h3>
      <pre>{{ JSON.stringify(facilityUserData, null, 2) }}</pre>
      <KButton primary @click="wizardService.send('START_OVER')">
        Start Over
      </KButton>
    </div>
  </div>

</template>


<script>

  import { v4 } from 'uuid';
  import { currentLanguage } from 'kolibri.utils.i18n';
  import KolibriLoadingSnippet from 'kolibri.coreVue.components.KolibriLoadingSnippet';
  import urls from 'kolibri.urls';
  import { SetupWizardResource } from '../../api';
  import { DeviceTypePresets, FacilityTypePresets, UsePresets } from '../../constants';

  export default {
    name: 'SettingUpKolibri',
    components: { KolibriLoadingSnippet },
    inject: ['wizardService'],
    computed: {
      devMode() {
        return process.NODE_ENV !== 'production';
      },
      /** The data we will use to initialize the device during provisioning */
      deviceProvisioningData() {
        return {
          facility: null,
          preset: null,
          superuser: {},
          language_id: currentLanguage,
          device_name: this.wizardContext('deviceName'),
          settings: {},
          allow_guest_access: this.wizardContext('guestAccess'),
          is_provisioned: true
        };
      },

      /** The data we will use to create the user and facility, if needed, during provisioning */
      facilityUserData() {
        // Data from user credentials form
        let { full_name, username, password } = this.$store.state.onboardingData.user;
        return {
          full_name,
          username,
          password,
          facility_name: this.wizardContext('facilityName'),
          facility_dataset: {
            // TODO Make the key names on FacilityDataset map properly to the actual questions we ask
            // The question here was "enable passwords?" so a `yes` there means `no` here:
            learner_can_login_with_no_password: !this.wizardContext('requirePassword'),
            learner_can_sign_up: this.wizardContext('learnerCanCreateAccount'),
            preset: this.wizardContext('formalOrNonformal'),
          },
          extra_fields: {
            on_my_own_setup: this.isOnMyOwnSetup,
            os_user: this.canGetOsUser,
          },
          auth_token: v4(),
        };
      },

      /** Introspecting the machine via it's `state.context` properties */
      isOnMyOwnSetup() {
        return this.wizardContext('onMyOwnOrGroup') == UsePresets.ON_MY_OWN;
      },
      canGetOsUser() {
        return this.wizardContext('canGetOsUser');
      },
      isNewFacility() {
        return this.wizardContext('facilityNewOrImport') === FacilityTypePresets.NEW;
      },
      isLearnOnlyDevice() {
        return this.wizardContext('fullOrLOD') === DeviceTypePresets.LOD;
      },
    },
    mounted() {
      if (this.devMode) {
        return null; // debugger activated, don't do anything
      }
      if (this.isOnMyOwnSetup) {
        if (this.canGetOsUser) {
          this.createAndProvisionOnMyOwnUserApp();
        } else {
          this.createAndProvisionOnMyOwnUserDevice();
        }
      }

      if (!this.isLearnOnlyDevice) {
        if (this.isNewFacility) {
          this.createAndProvisionNewFullFacilityDevice();
        } else {
          // We already have the facility imported, just provision and redirect
          this.createAndProvisionNewFullFacilityDevice();
        }
      } else {
        this.provisionDevice();
      }
    },
    methods: {
      // A helper for readability
      wizardContext(key) {
        return this.wizardService.state.context[key];
      },
      createAndProvisionOnMyOwnUserDevice() {
        SetupWizardResource.createonmyownuser(this.facilityUserData).then(() =>
          this.provisionDevice()
        );
      },
      createAndProvisionOnMyOwnUserApp() {
        SetupWizardResource.createappuser(this.facilityUserData).then(() => this.provisionDevice());
      },
      createAndProvisionNewFullFacilityDevice() {
        SetupWizardResource.createsuperuser(this.facilityUserData).then(() =>
          this.provisionDevice()
        );
      },
      provisionDevice() {
        SetupWizardResource.provisiondevice(this.deviceProvisioningData)
          .then(() => {
            // FIXME In dev mode, we'll wait 5 seconds before moving along so we can see the page
            // ... maybe we keep this?
            const timeout = process.NODE_ENV === 'production' ? 1 : 5000;
            setTimeout(
              () =>
                (window.location.pathname = urls['kolibri:kolibri.plugins.user_auth:user_auth']()),
              timeout
            );
          })
          .catch(err => console.log(err));
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
    },
  };

</script>


<style scoped lang="scss">

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
