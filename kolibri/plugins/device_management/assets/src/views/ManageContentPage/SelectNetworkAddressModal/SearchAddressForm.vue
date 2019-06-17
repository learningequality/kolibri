<template>

  <KModal
    :title="$tr('header')"
    :submitText="$tr('submitButtonLabel')"
    :cancelText="$tr('cancelButtonLabel')"
    size="medium"
    :submitDisabled="attemptingToConnect"
    @submit="handleSubmit"
    @cancel="$emit('cancel')"
  >
    {{ $tr('description') }}
    <p></p>
    <div>

      <template v-for="d in devices">
        <div :key="`div-${d.id}`">
          <KRadioButton
            :key="d.id"
            v-model="selectedDeviceId"
            class="radio-button"
            :value="d.id"
            :label="formatDeviceName(d)"
            :description="d.base_url"
            :disabled="d.disabled"
          />
        </div>

      </template>

      <UiAlert
        v-if="uiAlertProps"
        v-show="showUiAlerts"
        :type="uiAlertProps.type"
        :dismissible="false"
      >
        {{ uiAlertProps.text }}
      </UiAlert>

      <UiAlert
        v-if="attemptingToConnect"
        v-show="showUiAlerts"
        :dismissible="false"
      >
        {{ $tr('tryingToConnect') }}
      </UiAlert>
    </div>
  </KModal>

</template>


<script>

  import KModal from 'kolibri.coreVue.components.KModal';
  import find from 'lodash/find';
  import KRadioButton from 'kolibri.coreVue.components.KRadioButton';
  import CatchErrors from 'kolibri.utils.CatchErrors';
  import { ERROR_CONSTANTS } from 'kolibri.coreVue.vuex.constants';
  import UiAlert from 'keen-ui/src/UiAlert';
  import { createAddress, fetchDevices } from './api';

  const Stages = {
    FETCHING_DEVICES: 'FETCHING_DEVICES',
    FETCHING_SUCCESSFUL: 'FETCHING_SUCCESSFUL',
    FETCHING_FAILED: 'FETCHING_FAILED',
    COULD_NOT_CONNECT: 'COULD_NOT_CONNECT',
  };

  export default {
    name: 'SearchAddressForm',
    components: {
      KModal,
      UiAlert,
      KRadioButton,
    },
    props: {},
    data() {
      return {
        selectedDeviceId: '',
        attemptingToConnect: false,
        stage: '',
        devices: [],
        Stages,
        showUiAlerts: false,
      };
    },
    computed: {
      uiAlertProps() {
        if (this.devices.length === 0) {
          return {
            text: this.$tr('noDevicesText'),
            type: 'info',
          };
        }
        return null;
      },
    },
    beforeMount() {
      this.refreshDeviceList();
      this.startPolling();
    },
    mounted() {
      // Wait a little bit of time before showing UI alerts so there is no flash
      // if data comes back quickly
      setTimeout(() => {
        this.showUiAlerts = true;
      }, 100);
    },
    destroyed() {
      this.stopPolling();
    },
    methods: {
      formatDeviceName(device) {
        return device.host + ' (' + device.data.facilities[0].name + ')';
      },
      handleSubmit() {
        this.attemptingToConnect = true;
        const device = find(this.devices, { id: this.selectedDeviceId });
        return createAddress({
          base_url: device.base_url,
          device_name: device.host,
        })
          .then(address => {
            this.$emit('submit', address);
          })
          .catch(err => {
            const errorsCaught = CatchErrors(err, [
              ERROR_CONSTANTS.NETWORK_LOCATION_NOT_FOUND,
              ERROR_CONSTANTS.INVALID_NETWORK_LOCATION_FORMAT,
            ]);
            if (errorsCaught.includes(ERROR_CONSTANTS.NETWORK_LOCATION_NOT_FOUND)) {
              this.status = Stages.COULD_NOT_CONNECT;
            } else {
              this.$store.dispatch('handleApiError', err);
            }
          })
          .then(() => {
            this.attemptingToConnect = false;
          });
      },
      refreshDeviceList() {
        this.stage = this.Stages.FETCHING_DEVICES;
        return fetchDevices(this.isImportingMore ? this.transferredChannel.id : '')
          .then(devices => {
            this.stage = this.Stages.FETCHING_SUCCESSFUL;
            this.devices = devices;
          })
          .catch(() => {
            this.stage = this.Stages.FETCHING_FAILED;
          });
      },
      startPolling() {
        if (!this.intervalId) {
          this.intervalId = setInterval(this.refreshDeviceList, 5000);
        }
      },
      stopPolling() {
        if (this.intervalId) {
          this.intervalId = clearInterval(this.intervalId);
        }
      },
    },
    $trs: {
      description: 'Devices found on the local network (Kolibri 0.13.0+):',
      noDevicesText: 'No usable devices found. Searching...',
      addressLabel: 'Full network address',
      cancelButtonLabel: 'Cancel',
      errorCouldNotConnect: 'Could not connect to this network address',
      header: 'Searching for devices',
      submitButtonLabel: 'Add',
      tryingToConnect: 'Trying to connect to server…',
    },
  };

</script>


<style lang="scss" scoped></style>
