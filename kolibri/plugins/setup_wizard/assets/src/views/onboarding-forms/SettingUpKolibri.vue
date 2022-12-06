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
      /** The data we will use to initialize the device during provisioning */
      deviceProvisioningData() {
        return {
          device_name: this.wizardService.state.context.deviceName,
          allow_guest_access: this.wizardService.state.context.guestAccess,
          language_id: currentLanguage,
          is_provisioned: true,
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
          facility_name: this.$store.state.onboardingData.facility.name || null,
          facility_dataset: {
            learner_can_login_with_no_password: this.wizardService.state.context.requirePassword,
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
        return this.wizardService.state.context.onMyOwnOrGroup == UsePresets.ON_MY_OWN;
      },
      canGetOsUser() {
        return this.wizardService.state.context.canGetOsUser;
      },
      isNewFacility() {
        return this.wizardService.state.context.facilityNewOrImport === FacilityTypePresets.NEW;
      },
      isLearnOnlyDevice() {
        return this.wizardService.state.context.fullOrLOD === DeviceTypePresets.LOD;
      },
    },
    mounted() {
      if (this.isOnMyOwnSetup) {
        // 1) On my own
        if (this.canGetOsUser) {
          // 1.1) If we can get the OS user, we'll do this
          this.createAndProvisionOnMyOwnUserApp();
        } else {
          // 1.2) If user is doing "on my own" setup but we cannot get OS user
          this.createAndProvisionOnMyOwnUserDevice();
        }
      }

      // From here, all are going to be "group learning" flows
      if (!this.isLearnOnlyDevice) {
        // 2) Group learning, Full device setup
        if (this.isNewFacility) {
          // 2.1) New Facility
          this.createAndProvisionNewFullFacilityDevice();
        } else {
          // 2.2) Import Facility
          // We already have the facility imported, just provision and redirect
          this.provisionDevice();
        }
      } else {
        // 3) Group learning, learn only device
        this.provisionDevice();
      }
    },
    methods: {
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
