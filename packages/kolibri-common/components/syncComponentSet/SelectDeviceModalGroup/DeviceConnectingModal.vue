<template>

  <KModal
    :title="modalTitle"
    :submitText="modalSubmitText"
    :cancelText="modalCancelText"
    size="medium"
    :submitDisabled="attemptingToConnect"
    @submit="handleSubmit"
    @cancel="$emit('cancel')"
  >
    <UiAlert
      v-if="!attemptingToConnect"
      :dismissible="false"
    >
      {{ connectionFailureMessage }}
    </UiAlert>
    <KLabeledIcon
      v-else
      :label="loadingLabel"
    >
      <template #icon>
        <KCircularLoader
          :size="16"
          :stroke="6"
          class="loader"
        />
      </template>
    </KLabeledIcon>
  </KModal>

</template>


<script>

  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import UiAlert from 'kolibri-design-system/lib/keen/UiAlert';

  export default {
    name: 'DeviceConnectingModal',
    components: {
      UiAlert,
    },
    mixins: [commonCoreStrings],
    props: {
      deviceId: {
        type: String,
        required: true,
      },
      deviceName: {
        type: String,
        required: true,
      },
      title: {
        type: String,
        default: null,
      },
    },
    data() {
      return {
        attemptingToConnect: true,
      };
    },
    computed: {
      modalTitle() {
        return this.title ? this.title : this.loadingLabel;
      },
      modalSubmitText() {
        return this.attemptingToConnect ? null : this.coreString('retryAction');
      },
      modalCancelText() {
        return this.attemptingToConnect
          ? this.coreString('cancelAction')
          : this.coreString('goBackAction');
      },
      loadingLabel() {
        return this.$tr('connectingTo', { name: this.deviceName });
      },
      isInternetDevice() {
        // This is fake usage of 'deviceId'
        return ['KDP', 'Studio'].includes(this.deviceId);
      },
      connectionFailureMessage() {
        const connectionStatus = '';
        switch (connectionStatus) {
          case 'Unknown':
          case 'ConnectionFailure':
            return this.isInternetDevice
              ? this.$tr('internetDisconnected')
              : this.$tr('connectionFailure', { name: this.deviceName });
          case 'ResponseTimeout':
            return this.$tr('connectionTimedOut', { name: this.deviceName });
          case 'InvalidResponse':
            return this.$tr('deviceIsNotKolibri', { name: this.deviceName });
          default:
            return this.$tr('genericConnectionError');
        }
      },
    },
    methods: {
      handleSubmit() {
        // TODO
      },
    },
    $trs: {
      connectingTo: {
        message: "Connecting to '{name}'",
        context:
          "Shown while testing the connection to a network device, Kolibri Studio, or Kolibri Data Portal, as specified by 'name'",
      },
      connectionFailure: {
        message:
          "Unable to connect to '{name}'. Try checking if a firewall is blocking the connection.",
        context:
          "Error message when testing the connection to the network device specified by 'name' fails for this reason",
      },
      deviceIsNotKolibri: {
        message:
          "Another program is running at the same network address as '{name}'. Please close the program, ensure Kolibri is running on that device, and try again.",
        context:
          "Error message when testing the connection to the network device specified by 'name' fails for this reason",
      },
      connectionTimedOut: {
        message:
          "The device '{name}' is taking too long to respond. Please check the connection and try again.",
        context:
          "Error message when testing the connection to the network device specified by 'name' fails for this reason",
      },
      genericConnectionError: {
        message: 'Something went wrong. Please try again later.',
        context:
          'Error message when testing the connection to a network device fails for an unknown reason',
      },
      internetDisconnected: {
        message: 'You must be connected to the internet.',
        context:
          "Error message when testing the connection to a network device fails because Kolibri isn't connected to the internet and the device address is on the internet",
      },
      /* eslint-disable kolibri/vue-no-unused-translations */
      connectionFailureKolibriVersion: {
        message:
          "Unable to connect to '{name}'. Please update both devices to Kolibri version {version_number} or higher.",
        context:
          "Error message when testing the connection to the network device specified by 'name' fails for this reason",
      },
      /* eslint-enable kolibri/vue-no-unused-translations */
    },
  };

</script>


<style lang="scss" scoped></style>
