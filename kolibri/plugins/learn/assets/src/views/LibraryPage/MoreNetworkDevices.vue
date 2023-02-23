<template>

  <KGrid>
    <KGridItem
      v-for="device in devices"
      :key="device.id"
      :layout="{ span: cardColumnSpan, alignment: 'auto' }"
    >
      {{ device.channels }}
      <UnPinnedDevices
        :deviceName="device.device_name"
        :channels="device.channels"
      />

    </KGridItem>
  </KGrid>

</template>


<script>

  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import useDevices from '../../composables/useDevices';
  import useChannels from '../../composables/useChannels';
  import UnPinnedDevices from './UnPinnedDevices';

  export default {
    name: 'MoreNetworkDevices',
    components: {
      UnPinnedDevices,
    },
    mixins: [responsiveWindowMixin],
    setup() {
      const { fetchChannels } = useChannels();
      const { baseurl, fetchDevices } = useDevices();
      return {
        baseurl,
        fetchDevices,
        fetchChannels,
      };
    },
    data() {
      return {
        devices: [],
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
        const device = devices.filter(d => d.available);
        device.forEach(element => {
          this.fetchChannels({ baseurl: element.baseurl }).then(channel => {
            element['channels'] = channel.length;
          });
          this.devices.push(element);
        });
      });
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
    text-transform: uppercase;
  }

</style>
