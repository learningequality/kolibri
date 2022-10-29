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

  import KolibriLoadingSnippet from 'kolibri.coreVue.components.KolibriLoadingSnippet';
  import urls from 'kolibri.urls';
  import { FacilityImportResource, OnMyOwnResource, SetupWizardResource } from '../../api';
  import { UsePresets } from '../../constants';

  export default {
    name: 'SettingUpKolibri',
    components: { KolibriLoadingSnippet },
    inject: ['wizardService'],
    data() {
      return {
        user: {},
      };
    },
    mounted() {
      this.user = this.$store.state.onboardingData.user;
      // TODO figure out w/ richard how to properly get the auth_token passed so we can get_or_create_os_user
      let { full_name, username, password } = this.user;
      const facilityUserData = {
        full_name,
        username,
        password,
        facility_name: this.$store.state.onboardingData.facility.name,
        extra_fields: {
          on_my_own_setup: this.isOnMyOwnSetup(),
          os_user: this.canGetOsUser(),
        },
      };
      OnMyOwnResource.createonmyownuser(facilityUserData)
        .then(() => {
          const deviceProvisioningData = {
            device_name: this.wizardService.state.context.deviceName,
            language_id: this.$store.state.onboardingData.language_id,
            is_provisioned: true,
          };
          SetupWizardResource.provisiondevice(deviceProvisioningData)
            .then(() => {
              // FIXME In dev mode, we'll wait 5 seconds before moving along so we can see the page... maybe we keep this?
              const timeout = process.NODE_ENV === 'production' ? 1 : 5000;
              setTimeout(
                () =>
                  (window.location.pathname = urls[
                    'kolibri:kolibri.plugins.user_auth:user_auth'
                  ]()),
                timeout
              );
            })
            .catch(err => console.log(err));
        })
        .catch(err => console.log(err));
    },
    methods: {
      isOnMyOwnSetup() {
        return this.wizardService.state.context.onMyOwnOrGroup == UsePresets.ON_MY_OWN;
      },
      canGetOsUser() {
        return this.wizardService.state.context.canGetOsUser;
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
