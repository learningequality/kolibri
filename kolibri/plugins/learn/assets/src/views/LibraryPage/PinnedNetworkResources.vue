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
      const { windowIsSmall } = useKResponsiveWindow();
      return {
        genLibraryPageBackLink,
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
      layoutSpan() {
        return this.$layoutSpan();
      },
      exploreString() {
        return this.coreString('explore');
      },
    },
    inject: ['$layoutSpan'],
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
