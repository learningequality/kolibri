<template>

  <span v-if="disconnected">
    <span class="inner" style="font-size: 14px;">
      {{ coreString('disconnected') }}
    </span>
    <KIconButton
      icon="disconnected"
      :color="color"
      :tooltip="coreString('disconnected')"
      :ariaLabel="coreString('disconnected')"
    />
  </span>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import useDeviceConnectionStatus from '../composables/useDeviceConnectionStatus';

  export default {
    name: 'DeviceConnectionStatus',
    mixins: [commonCoreStrings],
    setup(props) {
      const { disconnected } = useDeviceConnectionStatus(props.deviceId);
      return {
        disconnected,
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
