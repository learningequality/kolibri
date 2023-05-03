<template>

  <!-- eslint-disable vue/html-indent -->

  <KGrid v-if="devices !== null">
    <KGridItem
      v-for="device in devices"
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
        :deviceId="device.id"
        :contents="device.channels"
        :isRemote="true"
      >
        <KGridItem :layout="{ span: layoutSpan }">
          <ChannelCard
            :key="exploreString.toLowerCase()"
            :isMobile="windowIsSmall"
            :title="exploreString"
            :link="genLibraryPageBackLink(device.id, false)"
            :explore="true"
          />
        </KGridItem>
      </ChannelCardGroupGrid>

    </KGridItem>
  </KGrid>

</template>


<script>

  import useKResponsiveWindow from 'kolibri.coreVue.composables.useKResponsiveWindow';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import useContentLink from '../../composables/useContentLink';
  import ChannelCard from '../ChannelCard';
  import ChannelCardGroupGrid from './../ChannelCardGroupGrid';

  export default {
    name: 'PinnedNetworkResources',
    components: {
      ChannelCard,
      ChannelCardGroupGrid,
    },
    mixins: [commonCoreStrings],
    setup() {
      const { genLibraryPageBackLink } = useContentLink();
      const { windowBreakpoint, windowGutter, windowIsSmall } = useKResponsiveWindow();
      return {
        genLibraryPageBackLink,
        windowBreakpoint,
        windowGutter,
        windowIsSmall,
      };
    },
    props: {
      devices: {
        type: Array,
        required: true,
        default() {
          return [];
        },
      },
    },
    computed: {
      exploreString() {
        return this.coreString('explore');
      },
      layoutSpan() {
        let span = 3;
        if ([0, 1, 2, 6].includes(this.windowBreakpoint)) {
          span = 4;
        } else if ([3, 4, 5].includes(this.windowBreakpoint)) {
          span = 6;
        }
        return span;
      },
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

  .device-name {
    padding-left: 10px;
  }

</style>
