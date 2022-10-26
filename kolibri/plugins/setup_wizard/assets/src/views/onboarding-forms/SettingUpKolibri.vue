<template>

  <div class="full-page">
    <CoreLogo class="logo" />
    <h1 class="page-title">
      {{ $tr('pageTitle') }}
    </h1>
    <p class="message">
      {{ $tr('pleaseWaitMessage') }}
    </p>
  </div>

</template>


<script>

  import CoreLogo from 'kolibri.coreVue.components.CoreLogo';
  import { FacilityImportResource } from '../../api';
  import { UsePresets } from '../../constants';

  export default {
    name: 'SettingUpKolibri',
    components: { CoreLogo },
    inject: ['wizardService'],
    mounted() {
      // If we're in app mode
      if (this.wizardService.state.context.canGetOsUser) {
        const facilityUserData = {
          facility_name: this.$store.state.onboardingData.facility.name,
          extra_fields: {
            on_my_own_setup: this.isOnMyOwnSetup(),
            os_user: true,
          },
        };
        FacilityImportResource.createsuperuser(facilityUserData)
          .then(
            () => (window.location = window.urls['kolibri:kolibri.plugins.user_auth:user_auth']())
          )
          .catch(err => console.log(err));
      } else {
        window.location = window.urls['kolibri:kolibri.plugins.user_auth:user_auth']();
      }
    },
    methods: {
      isOnMyOwnSetup() {
        return this.wizardService.state.context.onMyOwnOrGroup == UsePresets.ON_MY_OWN;
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
    position: relative;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
  }

  .logo {
    display: block;
    max-width: 400px;
    padding: 0 2em;
    margin: 12em auto 0;

    /* TODO Replace this with animated logo */
    animation-name: spin;
    animation-duration: 400ms;
    animation-timing-function: linear;
    animation-iteration-count: infinite;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }

    to {
      transform: rotate(360deg);
    }
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
