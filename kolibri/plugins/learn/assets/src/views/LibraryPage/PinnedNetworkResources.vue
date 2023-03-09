<template>

  <KGrid>
    <KGridItem
      v-for="group in groups"
      :key="group.id"
    >
      <KGridItem>
        <h2>
          <KIcon :icon="getDeviceIcon(group)" />
          <span class="device-name">{{ group.deviceName }}</span>
        </h2>
      </KGridItem>
      <KGridItem
        v-for="item in group.content"
        :key="item.id"
        :layout="{ span: cardColumnSpan, alignment: 'auto' }"
      >
        <CardContent
          :content="item.title"
          :body="item.body"
        />
      </KGridItem>
    </KGridItem>
  </KGrid>

</template>


<script>

  import useKResponsiveWindow from 'kolibri.coreVue.composables.useKResponsiveWindow';
  import useDevices from './../../composables/useDevices';
  import useChannels from './../../composables/useChannels';
  import CardContent from './CardContent';

  export default {
    name: 'PinnedNetworkResources',
    components: {
      CardContent,
    },
    setup() {
      const { windowBreakpoint } = useKResponsiveWindow();
      const { fetchDevices } = useDevices();
      const { fetchChannels } = useChannels();
      return {
        windowBreakpoint,
        fetchDevices,
        fetchChannels,
      };
    },
    data() {
      return {
        groups: [
          {
            id: 1,
            deviceName: 'Samson`s MacBook-Pro',
            operating_system: 'linux',
            content: [
              {
                id: 1,
                title: 'Card 1',
                body: ' ',
              },
              {
                id: 2,
                title: 'Card 2',
                body: 'Explore',
              },
            ],
          },
          {
            id: 2,
            deviceName: 'Marcella MBP',
            operating_system: 'Android',
            content: [
              {
                id: 1,
                title: 'Card 1',
                body: ' ',
              },
              {
                id: 2,
                title: 'Card 2',
                body: ' ',
              },
            ],
          },
        ],
      };
    },
    computed: {
      cardColumnSpan() {
        if (this.windowBreakpoint <= 2) return 4;
        if (this.windowBreakpoint <= 3) return 6;
        if (this.windowBreakpoint <= 6) return 4;
        return 3;
      },
    },
    created() {
      this.fetchDevices().then(devices => {
        console.log(devices);
        for (const device of devices) {
          const baseurl = device.base_url;
          this.fetchChannels({ baseurl })
            .then(channels => {
              this.setNetworkDeviceChannels(device, channels.slice(0, 4), channels.length);
            })
            .catch(() => {
              this.setNetworkDeviceChannels(device, [], 0);
            });
        }
      });
    },
    methods: {
      setNetworkDeviceChannels(device, channels, total) {
        this.$set(device, 'channels', channels.slice(0, 4));
        this.$set(device, 'total_channels', total);
      },
      getDeviceIcon(device) {
        if (device['operating_system'] === 'Darwin') {
          return 'laptop';
        } else if (device['operating_system'] === 'Android') {
          return 'device';
        } else if (device.subset_of_users_device) {
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
