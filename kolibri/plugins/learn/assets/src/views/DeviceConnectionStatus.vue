<template>

  <span v-if="isFetched && (!isDeviceAvailable)">
    <span
      class="inner"
      style="font-size: 14px;"
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

  import { get, set } from '@vueuse/core';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { useDevicesWithFacility } from 'kolibri.coreVue.componentSets.sync';
  import { RemoteChannelResource } from 'kolibri.resources';
  import { ref, watch } from 'kolibri.lib.vueCompositionApi';
  import { KolibriStudioId } from '../constants';
  import commonLearnStrings from './commonLearnStrings';

  export default {
    name: 'DeviceConnectionStatus',
    mixins: [commonCoreStrings, commonLearnStrings],
    setup(props) {
      /**
       * soud(subset_of_user_device) is a query param for filtering.
       * false to return non learn-only devices and true otherwise.
       * null has been specified to return both type of devices which
       * is necesary for device connection statuses
       */
      const { isFetching, devices } = useDevicesWithFacility({ soud: null });
      const isFetched = ref(false);
      const allDevices = ref([]);

      const getStudio = async () => {
        let studio = [];
        if (props.deviceId) {
          const response = await RemoteChannelResource.getKolibriStudioStatus();
          const studioData = {
            ...response.data,
            id: KolibriStudioId,
            instance_id: KolibriStudioId,
          };
          studio = [studioData];
        }
        return studio;
      };

      watch(isFetching, async currentValue => {
        if (!get(currentValue)) {
          const studio = await getStudio();
          set(allDevices, [...get(devices), ...studio]);
          set(isFetched, props.deviceId !== null);
        }
      });

      return {
        allDevices,
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
    computed: {
      isDeviceAvailable() {
        return this.allDevices.some(device => device.id === this.deviceId && device.available);
      },
    },
  };

</script>
