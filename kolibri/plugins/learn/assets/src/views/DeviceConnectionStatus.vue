<template>

  <span v-if="!devices.some(device => device.id === deviceId && device.available)">
    <span class="inner" style="font-size: 14px;">
      {{ coreString('disconnected') }}
    </span>
    <KIconButton
      icon="disconnected"
      data-test="disconnected-icon"
      :color="color"
      :tooltip="coreString('disconnected')"
      :ariaLabel="coreString('disconnected')"
    />
  </span>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { useDevicesWithFacility } from 'kolibri.coreVue.componentSets.sync';

  export default {
    name: 'DeviceConnectionStatus',
    mixins: [commonCoreStrings],
    setup() {
      const { devices } = useDevicesWithFacility();
      return {
        devices,
      };
    },
    props: {
      // eslint-disable-next-line kolibri/vue-no-unused-properties
      deviceId: {
        type: String,
        required: true,
      },
      color: {
        type: String,
        // 'primary' by default, but could add more later
        default: 'primary',
      },
    },
  };

</script>
