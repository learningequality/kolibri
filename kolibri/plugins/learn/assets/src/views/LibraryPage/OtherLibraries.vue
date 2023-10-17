<template>

  <div
    data-test="other-libraries"
  >
    <KGrid gutter="12">
      <KGridItem
        :layout12="{ span: 6 }"
        :layout8="{ span: 4 }"
        :layout4="{ span: 4 }"
      >
        <h1>
          {{ injectedtr('otherLibraries') }}
        </h1>
      </KGridItem>
      <KGridItem
        :layout12="{ span: 6 }"
        :layout8="{ span: 4 }"
        :layout4="{ span: 4 }"
      >
        <div class="sync-status">
          <span
            v-show="searchingOtherLibraries"
            data-test="searching"
          >
            <span data-test="searching-label">{{ injectedtr('searchingOtherLibrary') }}</span>
                &nbsp;&nbsp;
            <span>
              <KCircularLoader
                type="indeterminate"
                :stroke="6"
              />
            </span>
          </span>
          <span
            v-show="!searchingOtherLibraries && devicesWithChannelsExist"
            data-test="showing-all"
          >
            <span>
              <KIcon
                v-if="windowIsSmall"
                icon="wifi"
                class="wifi-svg"
              />
            </span>
                &nbsp;&nbsp;
            <span data-test="showing-all-label">{{ injectedtr('showingAllLibraries') }}</span>
                &nbsp;&nbsp;
            <span>
              <KIcon
                v-if="!windowIsSmall"
                icon="wifi"
                class="wifi-svg"
              />
            </span>
          </span>
          <span
            v-show="!searchingOtherLibraries && !devicesWithChannelsExist"
            data-test="no-other"
          >
            <span>
              <KIcon icon="disconnected" />
            </span>
                &nbsp;&nbsp;
            <span data-test="no-other-label">{{ injectedtr('noOtherLibraries') }}</span>
          </span>
        </div>
      </KGridItem>
    </KGrid>

    <KCircularLoader
      :shouldShow="searchingOtherLibraries"
      :delay="false"
      :minVisibleTime="300"
    />
    <h2
      v-if="pinnedDevicesExist && unpinnedDevicesExist"
      data-test="pinned-label"
    >
      {{ injectedtr('pinned') }}
    </h2>
    <PinnedNetworkResources
      v-if="pinnedDevicesExist"
      data-test="pinned-resources"
      :devices="pinnedDevices"
      :deviceChannelsMap="deviceChannelsMap"
      :channelsToDisplay="cardsPerRow * 2 - 1"
    />

    <!-- More  -->
    <h2
      v-if="pinnedDevicesExist && unpinnedDevicesExist"
      data-test="more-label"
    >
      {{ injectedtr('moreLibraries') }}
    </h2>
    <MoreNetworkDevices
      v-if="unpinnedDevicesExist"
      data-test="more-devices"
      :devices="unpinnedDevices"
      :deviceChannelsMap="deviceChannelsMap"
    />
  </div>

</template>


<script>

  import { set } from '@vueuse/core';
  import { ref } from 'kolibri.lib.vueCompositionApi';
  import useKResponsiveWindow from 'kolibri.coreVue.composables.useKResponsiveWindow';
  import useDevices from '../../composables/useDevices';
  import usePinnedDevices from '../../composables/usePinnedDevices';
  import { KolibriStudioId } from '../../constants';
  import PinnedNetworkResources from './PinnedNetworkResources';
  import MoreNetworkDevices from './MoreNetworkDevices';

  export default {
    name: 'OtherLibraries',
    components: {
      PinnedNetworkResources,
      MoreNetworkDevices,
    },
    setup() {
      const {
        isLoadingChannels,
        networkDevicesWithChannels,
        keepDeviceChannelsUpdated,
        deviceChannelsMap,
      } = useDevices();
      const { fetchPinsForUser } = usePinnedDevices();
      const { windowIsSmall } = useKResponsiveWindow();

      const usersPins = ref([]);
      keepDeviceChannelsUpdated();

      fetchPinsForUser().then(resp => {
        set(
          usersPins,
          resp.map(pin => {
            const instance_id = pin.instance_id.replace(/-/g, '');
            return { ...pin, instance_id };
          })
        );
      });

      return {
        networkDevicesWithChannels,
        deviceChannelsMap,
        fetchPinsForUser,
        searchingOtherLibraries: isLoadingChannels,
        usersPins,
        windowIsSmall,
      };
    },
    props: {
      injectedtr: { type: Function, required: true },
      cardsPerRow: { type: Number, required: true },
    },
    computed: {
      devicesWithChannelsExist() {
        return this.networkDevicesWithChannels.length > 0;
      },
      pinnedDevices() {
        return this.networkDevicesWithChannels.filter(device => {
          return (
            this.usersPinsDeviceIds.includes(device.instance_id) ||
            device.instance_id === KolibriStudioId
          );
        });
      },
      pinnedDevicesExist() {
        return this.pinnedDevices.length > 0;
      },
      unpinnedDevices() {
        return this.networkDevicesWithChannels.filter(device => {
          return (
            !this.usersPinsDeviceIds.includes(device.instance_id) &&
            device.instance_id !== KolibriStudioId
          );
        });
      },
      unpinnedDevicesExist() {
        return this.unpinnedDevices.length > 0;
      },
      usersPinsDeviceIds() {
        return this.usersPins.map(pin => pin.instance_id);
      },
    },
  };

</script>


<style lang="scss" scoped>

  .sync-status {
    display: flex;
    justify-content: flex-end;
    margin: 30px 0 10px;

    span {
      display: inline-flex;
      vertical-align: bottom;
    }
  }

  .wifi-svg {
    top: 0;
    transform: scale(1.5);
  }

</style>
