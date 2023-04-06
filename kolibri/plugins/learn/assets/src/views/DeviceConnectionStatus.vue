<template>

  <span v-if="isFetched && (!devices.some(device => device.id === deviceId && device.available))">
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
  import { ref, watch } from 'kolibri.lib.vueCompositionApi';

  export default {
    name: 'DeviceConnectionStatus',
    mixins: [commonCoreStrings],
    setup(props) {
      const { isFetching, devices } = useDevicesWithFacility();
      const isFetched = ref(false);
      watch(isFetching, currentValue => {
        if (!currentValue.value) {
          isFetched.value = props.deviceId !== null;
        }
      });
      return {
        devices,
        isFetched,
      };
    },
    props: {
      // eslint-disable-next-line kolibri/vue-no-unused-properties
      deviceId: {
        type: String,
        default: null,
      },
      color: {
        type: String,
        // 'primary' by default, but could add more later
        default: 'primary',
      },
    },
  };

</script>
