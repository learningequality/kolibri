<template>

  <span v-if="isFetched && !isDeviceAvailable">
    <span
      class="inner"
      style="font-size: 14px"
    >
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

  import { set, useTimeoutPoll } from '@vueuse/core';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import useDevices from 'kolibri-common/components/syncComponentSet/SelectDeviceModalGroup/useDevices';
  import RemoteChannelResource from 'kolibri-common/apiResources/RemoteChannelResource';
  import { ref, onBeforeUnmount } from 'vue';
  import { KolibriStudioId } from '../constants';
  import commonLearnStrings from './commonLearnStrings';

  export default {
    name: 'DeviceConnectionStatus',
    mixins: [commonCoreStrings, commonLearnStrings],
    setup(props) {
      // Because the network location endpoint doesn't currently report status
      // about special static locations like Kolibri Studio and KDP, we need to
      // do a separate check for those.
      // Once that functionality has been enabled, this can be cleaned up!
      if (props.deviceId === KolibriStudioId) {
        const isFetched = ref(false);
        const allDevices = ref([]);
        const getStudio = async () => {
          const response = await RemoteChannelResource.getKolibriStudioStatus();
          set(allDevices, [
            {
              ...response.data,
              id: KolibriStudioId,
              instance_id: KolibriStudioId,
            },
          ]);
          set(isFetched, props.deviceId !== null);
        };
        // Start polling
        const fetch = useTimeoutPoll(getStudio, 5000, { immediate: true });

        // Stop polling
        onBeforeUnmount(() => {
          fetch.pause();
        });
        return {
          allDevices,
          isFetched,
        };
      } else {
        const { hasFetched, devices } = useDevices({
          id: props.deviceId,
        });
        return {
          allDevices: devices,
          isFetched: hasFetched,
        };
      }
    },
    props: {
      // eslint-disable-next-line vue/no-unused-properties
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
    computed: {
      isDeviceAvailable() {
        return this.allDevices.some(device => device.id === this.deviceId && device.available);
      },
    },
  };

</script>
