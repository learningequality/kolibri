<template>

  <!-- eslint-disable vue/html-indent -->

  <KGrid v-if="devices !== null">
    <FadeInTransitionGroup>
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
          :contents="deviceChannelsMap[device.instance_id].slice(0, channelsToDisplay)"
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
    </FadeInTransitionGroup>
  </KGrid>

</template>


<script>

  import useKResponsiveWindow from 'kolibri.coreVue.composables.useKResponsiveWindow';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import useContentLink from '../../composables/useContentLink';
  import FadeInTransitionGroup from '../FadeInTransitionGroup';
  import ChannelCard from '../ChannelCard';
  import ChannelCardGroupGrid from './../ChannelCardGroupGrid';

  export default {
    name: 'PinnedNetworkResources',
    components: {
      ChannelCard,
      ChannelCardGroupGrid,
      FadeInTransitionGroup,
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
      deviceChannelsMap: {
        type: Object,
        required: true,
        default() {
          return {};
        },
      },
      channelsToDisplay: {
        type: Number,
        required: true,
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
