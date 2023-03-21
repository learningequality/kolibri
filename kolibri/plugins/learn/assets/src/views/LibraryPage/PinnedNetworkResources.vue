<template>

  <KGrid v-if="pinnedDevices !== null">
    <KGridItem
      v-for="device in pinnedDevices"
      :key="device.id"
    >
      <KGridItem>
        <h2>
          <KIcon :icon="getDeviceIcon(device)" />
          <span class="device-name">{{ device.device_name }}</span>
        </h2>
      </KGridItem>
      <ChannelCardGroupGrid
        data-test="channel-cards"
        class="grid"
        :contents="device.channels"
      />
    </KGridItem>
  </KGrid>

</template>


<script>

  import useKResponsiveWindow from 'kolibri.coreVue.composables.useKResponsiveWindow';
  import useDevices from './../../composables/useDevices';
  import ChannelCardGroupGrid from './../ChannelCardGroupGrid';

  export default {
    name: 'PinnedNetworkResources',
    components: {
      ChannelCardGroupGrid,
    },
    setup() {
      const { windowBreakpoint } = useKResponsiveWindow();
      const { baseurl, fetchDevices } = useDevices();
      return {
        windowBreakpoint,
        fetchDevices,
        baseurl,
      };
    },
    props: {
      pinnedDevices: {
        type: Array,
        required: true,
      },
    },
    data() {
      return {};
    },
    methods: {
      getDeviceIcon(device) {
        if (device['operating_system'] === 'Android') {
          return 'device';
        } else if (!device['subset_of_users_device']) {
          return 'cloud';
        } else {
          return 'laptop';
        }
      },
    },
  };

</script>


<style lang="scss"  scoped>

  @import '~kolibri-design-system/lib/styles/definitions';
  @import '../HybridLearningContentCard/card';

  $margin: 24px;

  .card-main-wrapper {
    @extend %dropshadow-1dp;

    position: relative;
    display: inline-flex;
    width: 100%;
    max-height: 258px;
    padding-bottom: $margin;
    text-decoration: none;
    vertical-align: top;
    border-radius: $radius;
    transition: box-shadow $core-time ease;

    &:hover {
      @extend %dropshadow-8dp;
    }

    &:focus {
      outline-width: 4px;
      outline-offset: 6px;
    }
  }

  .cardgroup .card-main-wrapper {
    display: inline-flex;
  }

  .device-name {
    padding-left: 10px;
  }

</style>
