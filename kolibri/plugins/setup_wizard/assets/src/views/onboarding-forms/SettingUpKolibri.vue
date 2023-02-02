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
        position: absolute;
        left: 1em;
        right: 1em;
        bottom: 1em;
        top: 1em;
        background-color: rgba(0, 0, 0, 0.86);
        padding: 2em;
        color: white;
        font-weight: bold;
        overflow: auto;
      "
    >
      <h2>Setup Wizard Debugger 3000</h2>
      <h3>Device Provisioning Data</h3>
      <pre>{{ JSON.stringify(deviceProvisioningData, null, 2) }}</pre>
      <KButtonGroup
        style="
          position: fixed;
          top: 2em;
          right: 3em;
        "
      >
        <KButton
          icon="back"
          text="START OVER"
          @click="wizardService.send('START_OVER')"
        />
        <KButton
          primary
          iconAfter="forward"
          text="Continue and Finish"
          @click="provisionDevice()"
        />
      </KButtonGroup>
    </div>
  </div>

</template>


<script>

  import { v4 } from 'uuid';
  import omitBy from 'lodash/omitBy';
  import { currentLanguage } from 'kolibri.utils.i18n';
  import { checkCapability } from 'kolibri.utils.appCapabilities';
  import KolibriLoadingSnippet from 'kolibri.coreVue.components.KolibriLoadingSnippet';
  import urls from 'kolibri.urls';
  import client from 'kolibri.client';
  import { UsePresets } from '../../constants';

  export default {
    name: 'SettingUpKolibri',
    components: { KolibriLoadingSnippet },
    inject: ['wizardService'],
    data() {
      return {
        devMode: process.NODE_ENV !== 'production',
      };
    },
    computed: {
      /** The data we will use to initialize the device during provisioning */
      deviceProvisioningData() {
        const superuser = this.wizardContext('superuser');
        // If the user has selected a facility, we use that.
        // Otherwise, we create an object w/ the facility name
        const selectedFacility = this.wizardContext('selectFacility');
        const facility = selectedFacility || { name: this.wizardContext('facilityName') };

        let payload = {
          superuser,
          facility,
          preset: this.wizardContext('formalOrNonformal') || 'nonformal', // TODO remove this default!
          language_id: currentLanguage,
          device_name: this.wizardContext('deviceName'),
          settings: { on_my_own_setup: this.isOnMyOwnSetup },
          allow_guest_access: this.wizardContext('guestAccess'),
          is_provisioned: true,
          os_user: checkCapability('get_os_user'),
          auth_token: v4(),
        };

        // Remove anything that is `null` value
        return omitBy(payload, v => v === null);
      },

      /** Introspecting the machine via it's `state.context` properties */
      isOnMyOwnSetup() {
        return this.wizardContext('onMyOwnOrGroup') == UsePresets.ON_MY_OWN;
      },
    },
    mounted() {
      if (this.devMode) {
        return null; // debugger activated, don't do anything
      } else {
        this.provisionDevice();
      }
    },
    methods: {
      // A helper for readability
      wizardContext(key) {
        return this.wizardService.state.context[key];
      },
      provisionDevice() {
        client({
          url: urls['kolibri:core:deviceprovision'](),
          method: 'POST',
          data: this.deviceProvisioningData,
        })
          .then(response => {
            const appKey = response.data.app_key;

            const path = appKey
              ? urls['kolibri:kolibri.plugins.app:initialize'](appKey) + '?auth_token=' + v4()
              : urls['kolibri:kolibri.plugins.user_auth:user_auth']();

            window.location.href = path;
          })
          .catch(e => console.error(e));
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
