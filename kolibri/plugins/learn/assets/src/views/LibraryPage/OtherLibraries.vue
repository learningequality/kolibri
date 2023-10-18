<template>

  <div>
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

  import { get } from '@vueuse/core';
  import { computed } from 'kolibri.lib.vueCompositionApi';
  import useKResponsiveWindow from 'kolibri.coreVue.composables.useKResponsiveWindow';
  import useDevices from '../../composables/useDevices';
  import usePinnedDevices from '../../composables/usePinnedDevices';
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
      const {
        fetchPinsForUser,
        pinnedDevices,
        unpinnedDevices,
        pinnedDevicesExist,
        unpinnedDevicesExist,
      } = usePinnedDevices(networkDevicesWithChannels);
      const { windowIsSmall } = useKResponsiveWindow();

      keepDeviceChannelsUpdated();

      fetchPinsForUser();

      const devicesWithChannelsExist = computed(() => get(networkDevicesWithChannels).length > 0);

      return {
        networkDevicesWithChannels,
        devicesWithChannelsExist,
        deviceChannelsMap,
        searchingOtherLibraries: isLoadingChannels,
        windowIsSmall,
        pinnedDevices,
        unpinnedDevices,
        pinnedDevicesExist,
        unpinnedDevicesExist,
      };
    },
    props: {
      injectedtr: { type: Function, required: true },
      cardsPerRow: { type: Number, required: true },
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
