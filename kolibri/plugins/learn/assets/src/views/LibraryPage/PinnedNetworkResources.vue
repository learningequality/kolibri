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
      <div class="card-layout">
        <div class="cards">
          <ChannelCardGroupGrid
            data-test="channel-cards"
            class="grid"
            :contents="device.channels"
            :isRemote="true"
          >
            <KGridItem :layout="{ span: cardColumnSpan, alignment: 'auto' }">
              <ExploreCard
                :style="cardStyle"
                :deviceId="device.id"
              />
            </KGridItem>
          </ChannelCardGroupGrid>
        </div>
      </div>

    </KGridItem>
  </KGrid>

</template>


<script>

  import useKResponsiveWindow from 'kolibri.coreVue.composables.useKResponsiveWindow';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import ChannelCardGroupGrid from './../ChannelCardGroupGrid';
  import ExploreCard from './ExploreCard';

  export default {
    name: 'PinnedNetworkResources',
    components: {
      ChannelCardGroupGrid,
      ExploreCard,
    },
    mixins: [responsiveWindowMixin, commonCoreStrings],
    setup() {
      const { windowBreakpoint, windowGutter } = useKResponsiveWindow();
      return {
        windowBreakpoint,
        windowGutter,
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
      cardStyle() {
        return {
          backgroundColor: this.$themeTokens.surface,
          color: this.$themeTokens.text,
          marginBottom: `${this.windowGutter}px`,
          minHeight: `${this.overallHeight}px`,
          textAlign: 'center',
        };
      },
      cardColumnSpan() {
        if (this.windowBreakpoint <= 2) return 4;
        if (this.windowBreakpoint <= 3) return 6;
        if (this.windowBreakpoint <= 6) return 4;
        return 3;
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

  @import '~kolibri-design-system/lib/styles/definitions';
  @import '../HybridLearningContentCard/card';

  $margin: 24px;

  .card-main-wrapper {
    @extend %dropshadow-1dp;

    position: relative;
    display: inline-flex;
    width: 350px;
    max-height: 270px;
    padding-bottom: $margin;
    margin-left: 8px;
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

  .card-layout .cards {
    float: left;
  }

  .device-name {
    padding-left: 10px;
  }

</style>
